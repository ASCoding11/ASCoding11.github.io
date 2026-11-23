// Ironwing vehicles: pack the built GLBs for the web (dedup, meshopt geometry with quantisation; no textures inside:
// the game's own tiling materials replace the named ones). usage:
//   GT_MODULES=/path/to/node_modules node pack.mjs out.glb in1.glb in2.glb ...   (inputs merged into one scene)
// needs: npm i @gltf-transform/core@4 @gltf-transform/extensions@4 @gltf-transform/functions@4 meshoptimizer
import path from 'path';
const M = process.env.GT_MODULES || path.resolve('node_modules');
const imp = (p) => import(path.join(M, p));
const { NodeIO, PropertyType } = await imp('@gltf-transform/core/dist/index.js');
const { ALL_EXTENSIONS } = await imp('@gltf-transform/extensions/dist/index.js');
const { dedup, meshopt, mergeDocuments, unpartition, prune } = await imp('@gltf-transform/functions/dist/index.js');
const { MeshoptEncoder } = await imp('meshoptimizer/index.js');
const [dst, ...src] = process.argv.slice(2);
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(src[0]);
for (const more of src.slice(1)) mergeDocuments(doc, await io.read(more));
const scenes = doc.getRoot().listScenes(), main = scenes[0];
for (const sc of scenes.slice(1)) { for (const n of sc.listChildren()) main.addChild(n); sc.dispose(); }
doc.getRoot().setDefaultScene(main);
// materials are told apart only by name (the game swaps them by name), so dedup must not merge them
await doc.transform(unpartition(), dedup({ propertyTypes: [PropertyType.ACCESSOR, PropertyType.MESH, PropertyType.TEXTURE] }), prune({ keepLeaves: true, keepExtras: true }), meshopt({ encoder: MeshoptEncoder, level: 'high' }));
await io.write(dst, doc);
let tris = 0; for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) { const i = p.getIndices(); tris += (i ? i.getCount() : p.getAttribute('POSITION').getCount()) / 3; }
console.log(dst, Math.round((await import('fs')).statSync(dst).size / 1024) + ' KB', Math.round(tris) + ' triangles');
