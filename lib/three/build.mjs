// Rebuilds r187/three.min.js and r187/three-addons.min.js from src/. The site itself has no build step; this is only
// run when changing the three.js version or the compatibility layer.
//
//   npm i three@0.187.0 esbuild          (anywhere; then point NODE_PATH at that node_modules)
//   NODE_PATH=/path/to/node_modules node lib/three/build.mjs
//
// The add-ons file must not contain a second copy of three: its `import ... from 'three'` is resolved to the
// window.THREE that three.min.js made.
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const require = createRequire(path.join(process.env.NODE_PATH || process.cwd(), 'x.js'));
const esbuild = require('esbuild');
const here = path.dirname(fileURLToPath(import.meta.url));
const threeDir = path.dirname(path.dirname(require.resolve('three')));   // .../three/build/three.cjs
const version = JSON.parse(fs.readFileSync(path.join(threeDir, 'package.json'))).version;
const out = path.join(here, 'r' + version.split('.')[1]);
fs.mkdirSync(out, { recursive: true });

const banner = `/* three.js ${version} (MIT, https://threejs.org) with this site's r128 compatibility layer (lib/three/src). */`;
const common = { bundle: true, minify: true, format: 'iife', target: 'es2019', legalComments: 'none', banner: { js: banner },
  nodePaths: [path.join(threeDir, '..')] };

await esbuild.build({ ...common, entryPoints: [path.join(here, 'src/global.js')], outfile: path.join(out, 'three.min.js') });

// every name three exports, read from the global the first file makes
const names = Object.keys(await import(path.join(threeDir, 'build/three.module.js')));
const shim = names.map((n) => `export const ${n} = window.THREE.${n};`).join('\n');
const useGlobal = { name: 'three-global', setup(b) {
  b.onResolve({ filter: /^three$/ }, () => ({ path: 'three-global', namespace: 'three-global' }));
  b.onLoad({ filter: /.*/, namespace: 'three-global' }, () => ({ contents: shim, loader: 'js' }));
} };
await esbuild.build({ ...common, entryPoints: [path.join(here, 'src/addons.js')], outfile: path.join(out, 'three-addons.min.js'), plugins: [useGlobal] });

for (const f of fs.readdirSync(out)) console.log(f, Math.round(fs.statSync(path.join(out, f)).size / 1024) + ' KB');
