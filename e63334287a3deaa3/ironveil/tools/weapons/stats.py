# Per-weapon triangles, draw calls (primitives) and the texture sets of a packed weapons GLB.
import json, struct, sys, os
path = sys.argv[1]
b = open(path, 'rb').read()
l = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20 + l])
N, M, A = j['nodes'], j['meshes'], j['accessors']
def walk(i, acc):
    n = N[i]
    if 'mesh' in n:
        for p in M[n['mesh']]['primitives']:
            t = A[p['indices']]['count'] // 3 if 'indices' in p else A[p['attributes']['POSITION']]['count'] // 3
            acc['tris'] += t; acc['calls'] += 1
            acc['mats'].add(j['materials'][p['material']]['name'])
    for c in n.get('children', []):
        walk(c, acc)
    return acc
rows = []
for i in j['scenes'][j.get('scene', 0)]['nodes']:
    a = walk(i, {'tris': 0, 'calls': 0, 'mats': set()})
    rows.append((N[i]['name'], a['tris'], a['calls'], ', '.join(sorted(a['mats']))))
print('| weapon | triangles | draw calls | materials |\n|---|---|---|---|')
for r in rows:
    print('| %s | %d | %d | %s |' % r)
print('\n| texture | format | bytes |\n|---|---|---|')
for im in j['images']:
    bv = j['bufferViews'][im['bufferView']]
    print('| %s | %s | %.0f KB |' % (im.get('name', '?'), im.get('mimeType'), bv['byteLength'] / 1024))
print('\nfile: %.2f MB' % (os.path.getsize(path) / 1048576))
