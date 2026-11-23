// Builds r187/three-addons.min.js: the r187 add-ons the games use, put on window.THREE under their r128 names.
// Load it after three.min.js. (The meshopt decoder doesn't depend on three's version, so pages keep loading
// ironveil/assets/lib/meshopt_decoder.js for it.)
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

window.THREE.GLTFLoader = GLTFLoader;
window.THREE.SkeletonUtils = SkeletonUtils;
