"""Re-encode the images inside a .glb as WebP (EXT_texture_webp), in place.

Run after export_people.py:  python3 webp_glb.py ../../assets/*.glb
Colour and normal maps become lossy WebP (quality 88; alpha kept, for hair). Images already WebP are left alone.
three.js's GLTFLoader reads EXT_texture_webp; every browser the site supports decodes WebP (Safari 14+).
"""
import io
import json
import struct
import sys

from PIL import Image

QUALITY = 88


def read_glb(path):
    d = open(path, 'rb').read()
    magic, ver, total = struct.unpack('<III', d[:12])
    assert magic == 0x46546C67 and ver == 2, path
    off, js, bin_ = 12, None, b''
    while off < total:
        ln, typ = struct.unpack('<II', d[off:off + 8])
        chunk = d[off + 8:off + 8 + ln]
        if typ == 0x4E4F534A:
            js = json.loads(chunk.decode('utf8'))
        elif typ == 0x004E4942:
            bin_ = chunk
        off += 8 + ln
    return js, bin_


def write_glb(path, js, bin_):
    jb = json.dumps(js, separators=(',', ':')).encode('utf8')
    jb += b' ' * ((4 - len(jb) % 4) % 4)
    bin_ += b'\0' * ((4 - len(bin_) % 4) % 4)
    total = 12 + 8 + len(jb) + 8 + len(bin_)
    with open(path, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, total))
        f.write(struct.pack('<II', len(jb), 0x4E4F534A)); f.write(jb)
        f.write(struct.pack('<II', len(bin_), 0x004E4942)); f.write(bin_)


def convert(path):
    js, bin_ = read_glb(path)
    views = js.get('bufferViews', [])
    images = js.get('images', [])
    new_bytes = {}
    for i, im in enumerate(images):
        bv = im.get('bufferView')
        if bv is None or im.get('mimeType') == 'image/webp':
            continue
        v = views[bv]
        raw = bin_[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']]
        pic = Image.open(io.BytesIO(raw))
        keep_alpha = pic.mode in ('RGBA', 'LA') or 'transparency' in pic.info
        pic = pic.convert('RGBA' if keep_alpha else 'RGB')
        out = io.BytesIO()
        pic.save(out, 'WEBP', quality=QUALITY, method=6)
        new_bytes[bv] = out.getvalue()
        im['mimeType'] = 'image/webp'
    if not new_bytes:
        print(path, 'already WebP'); return
    # repack the binary chunk (buffer 0). Its bytes are referenced by plain views on buffer 0 (the images) and by
    # EXT_meshopt_compression views, whose compressed data sits in buffer 0 at the extension's own offset (the view
    # itself points into buffer 1, a virtual fallback with no bytes). Every such region is moved, 4-byte aligned.
    regions = []   # (offset, length, setter)
    for k, v in enumerate(views):
        mo = v.get('extensions', {}).get('EXT_meshopt_compression')
        if mo is not None and mo.get('buffer', 0) == 0:
            regions.append((mo.get('byteOffset', 0), mo['byteLength'], k, mo))
        elif v.get('buffer', 0) == 0:
            regions.append((v.get('byteOffset', 0), v['byteLength'], k, v))
    regions.sort(key=lambda r: r[0])
    out = bytearray()
    for off0, ln0, k, holder in regions:
        data = new_bytes.get(k) if holder is views[k] else None
        if data is None:
            data = bin_[off0:off0 + ln0]
        out += b'\0' * ((4 - len(out) % 4) % 4)
        holder['byteOffset'] = len(out); holder['byteLength'] = len(data)
        out += data
    js['buffers'][0]['byteLength'] = len(out)
    for t in js.get('textures', []):
        if 'source' in t and images[t['source']].get('mimeType') == 'image/webp':
            t.setdefault('extensions', {})['EXT_texture_webp'] = {'source': t['source']}
    for key in ('extensionsUsed', 'extensionsRequired'):
        lst = js.setdefault(key, [])
        if 'EXT_texture_webp' not in lst:
            lst.append('EXT_texture_webp')
    before = len(bin_)
    write_glb(path, js, bytes(out))
    print('%s: %d images to WebP, binary %.2f MB -> %.2f MB' % (path, len(new_bytes), before / 1e6, len(out) / 1e6))


if __name__ == '__main__':
    for p in sys.argv[1:]:
        convert(p)
