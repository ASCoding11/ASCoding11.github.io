// Builds r187/three.min.js: three.js as one plain script that sets window.THREE (a normal, writable object, like
// r128's three.min.js), with the r128 compatibility layer applied.
import * as orig from 'three';
import { applyCompat } from './compat.js';

const THREE = Object.assign({}, orig);
applyCompat(THREE, orig);
window.THREE = THREE;
