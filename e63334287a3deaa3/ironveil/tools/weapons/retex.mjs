// Replace texture images in a packed weapons.glb by PNGs of the same name (from scanwear.py), as WebP; nothing
// else in the file changes (geometry, nodes, materials and the other textures are written back as they were).
// usage: GT_MODULES=/path/to/node_modules node retex.mjs weapons.glb out.glb png_dir
import path from 'path';
import fs from 'fs';
const M = process.env.GT_MODULES || path.resolve('node_modules');
const imp = (p) => import(path.join(M, p));
const { NodeIO } = await imp('@gltf-transform/core/dist/index.js');
const { ALL_EXTENSIONS } = await imp('@gltf-transform/extensions/dist/index.js');
const { MeshoptEncoder, MeshoptDecoder } = await imp('meshoptimizer/index.js');
const sharp = (await imp('sharp/dist/index.mjs')).default;
const [src, dst, dir] = process.argv.slice(2);
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(src);
for (const t of doc.getRoot().listTextures()) {
  const f = path.join(dir, t.getName() + '.png');
  if (!fs.existsSync(f)) continue;
  const q = /nor/.test(t.getName()) ? +(process.env.QN || 92) : +(process.env.QB || 90);
  const before = t.getImage().byteLength;
  const webp = await sharp(fs.readFileSync(f)).webp({ quality: q }).toBuffer();
  t.setImage(new Uint8Array(webp)).setMimeType('image/webp');
  console.log('replaced', t.getName(), (before / 1024).toFixed(0) + ' KB ->', (webp.length / 1024).toFixed(0) + ' KB');
}
await io.write(dst, doc);
console.log('file', (fs.statSync(dst).size / 1048576).toFixed(2), 'MB');
