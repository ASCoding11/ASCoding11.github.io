// Decode a packed weapons.glb (meshopt, WebP) into a plain GLB Blender can import, plus every texture as a PNG.
// usage: GT_MODULES=/path/to/node_modules node unpack.mjs weapons.glb out_dir
import path from 'path';
import fs from 'fs';
const M = process.env.GT_MODULES || path.resolve('node_modules');
const imp = (p) => import(path.join(M, p));
const { NodeIO } = await imp('@gltf-transform/core/dist/index.js');
const { ALL_EXTENSIONS } = await imp('@gltf-transform/extensions/dist/index.js');
const { MeshoptDecoder } = await imp('meshoptimizer/index.js');
const { dequantize } = await imp('@gltf-transform/functions/dist/index.js');
const sharp = (await imp('sharp/dist/index.mjs')).default;
const [src, out] = process.argv.slice(2);
fs.mkdirSync(path.join(out, 'img'), { recursive: true });
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(src);
for (const e of doc.getRoot().listExtensionsUsed()) if (/meshopt|webp|quantiz/i.test(e.extensionName)) e.dispose();
await doc.transform(dequantize());
for (const t of doc.getRoot().listTextures()) {
  const png = await sharp(Buffer.from(t.getImage())).png().toBuffer();
  fs.writeFileSync(path.join(out, 'img', t.getName() + '.png'), png);
  t.setImage(new Uint8Array(png)).setMimeType('image/png').setURI(t.getName() + '.png');
}
await io.write(path.join(out, 'plain.glb'), doc);
console.log('ok', doc.getRoot().listTextures().map(t => t.getName()).join(' '));
