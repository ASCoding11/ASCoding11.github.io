// Decode the packed weapons.glb (meshopt geometry) into a plain GLB that Blender's importer reads, for fp_clips.py.
// usage: GT_MODULES=/path/to/node_modules node fp_unpack.mjs weapons.glb out.glb
import path from 'path';
const M = process.env.GT_MODULES || path.resolve('node_modules');
const imp = (p) => import(path.join(M, p));
const { NodeIO } = await imp('@gltf-transform/core/dist/index.js');
const { ALL_EXTENSIONS } = await imp('@gltf-transform/extensions/dist/index.js');
const { dequantize } = await imp('@gltf-transform/functions/dist/index.js');
const { MeshoptDecoder } = await imp('meshoptimizer/index.js');
const [src, dst] = process.argv.slice(2);
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(src);
for (const e of doc.getRoot().listExtensionsUsed()) if (/meshopt|quantization/.test(e.extensionName)) e.dispose();
await doc.transform(dequantize());
await io.write(dst, doc);
console.log('wrote', dst);
