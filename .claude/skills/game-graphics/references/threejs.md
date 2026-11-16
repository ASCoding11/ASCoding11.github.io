# three.js: making it look good

Contents: which version · colour output · lights · shadows · materials · sky, fog and ground · textures made in
code · particles · screen effects without extra files · common ugliness and its cause.

## Which version

`THREE.REVISION` tells you. It matters because the colour and lighting APIs changed:

| | r151 and older (e.g. r128) | r152 and newer |
|---|---|---|
| sRGB output | `renderer.outputEncoding = THREE.sRGBEncoding` | `renderer.outputColorSpace = THREE.SRGBColorSpace` (the default) |
| Colour textures | `texture.encoding = THREE.sRGBEncoding` | `texture.colorSpace = THREE.SRGBColorSpace` |
| Light units | `renderer.physicallyCorrectLights` (default false) | physically based from r155; old intensities look about 3x too dark |
| `THREE.Geometry` | gone from r125; use `BufferGeometry` | same |

Only what is in the three.js file the game loads is available. Add-ons such as `EffectComposer`, `OrbitControls`,
`BufferGeometryUtils` and loaders live in separate files; if the project does not allow new scripts, write the
small part you need by hand (examples below). Do not upgrade the three.js version as part of a graphics change.

## Colour output: do this first

Without it every colour is slightly wrong and highlights clip to flat white.

```js
renderer.outputEncoding = THREE.sRGBEncoding;          // r151 and older
renderer.toneMapping = THREE.ACESFilmicToneMapping;    // brights roll off instead of clipping
renderer.toneMappingExposure = 1.0;                    // then tune 0.8 to 1.3 by eye
```

Turning these on changes every colour in the scene: materials written as hex will look lighter and less
saturated, and lights will need retuning. Budget time for that and compare screenshots. Colours you draw into a
canvas texture need `texture.encoding = THREE.sRGBEncoding` or they come out washed.

## Lights: three is enough

```js
const sun  = new THREE.DirectionalLight(0xfff1dc, 1.1);   // main light: slightly warm, from a clear direction
sun.position.set(40, 70, 25);
const sky  = new THREE.HemisphereLight(0xbfd9ff, 0x4a4035, 0.55); // sky colour from above, ground colour from below
const fill = new THREE.AmbientLight(0xffffff, 0.08);      // only enough to stop pure black
```

- The main light should come from the side and above (not from the camera), so shapes have a lit side and a
  shaded side. That one choice is most of what "looks 3D" means.
- Warm light with cool shadows (or the reverse) reads better than white light with grey shadows.
- Every extra light costs time on every lit object. Point lights for glows are usually better faked with an
  emissive material or an additive sprite.

## Shadows

Cheapest first; stop when it looks right.

1. **Blob shadow:** a dark, soft-edged circle (a canvas radial gradient as a texture, or a `CircleGeometry` with a
   transparent material) just above the ground under each object, scaled and faded with height. Costs almost
   nothing and removes the "floating" look. Keep it as the low tier.
2. **Real shadows from the main light only:**

```js
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);                 // 1024 on a medium tier
const c = sun.shadow.camera;                        // fit the box tightly round the play area:
c.left = -60; c.right = 60; c.top = 60; c.bottom = -60; c.near = 10; c.far = 200; c.updateProjectionMatrix();
sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;   // tune until there are no stripes and no gaps
```

   A loose shadow box is the usual reason shadows look blocky: the same pixels are spread over a bigger area.
   Set `castShadow` only on things that matter (players, the ball, big props) and `receiveShadow` on the ground.
   If nothing that casts moves, set `renderer.shadowMap.autoUpdate = false` and `renderer.shadowMap.needsUpdate =
   true` once (or when something changes).

## Materials

- `MeshLambertMaterial` and `MeshPhongMaterial` are cheap; `MeshStandardMaterial` looks better (roughness and
  metalness) and costs more; `MeshPhysicalMaterial` (clearcoat) costs most. Use Standard for the few hero objects
  and Lambert for scenery and low tiers.
- Roughness is where the look is: 0.3 to 0.5 reads as paint or plastic, 0.8 to 1 as cloth, grass, concrete.
  Nothing real is exactly 0 or 1.
- Shiny things need something to reflect. Without an environment map a metal looks black. A tiny environment
  is enough: render a gradient sky into a small cube render target once (`THREE.CubeCamera` with a 64 to 128 px
  target) and use it as `envMap`, or fake the highlight with a rim term.
- A rim light makes characters separate from the background. With the built-in materials, add a second, weak
  directional light from behind, or patch the shader in `material.onBeforeCompile`.
- Use `flatShading: true` on purpose (a faceted, low-poly style) or not at all. Half-smooth looks like a mistake.

## Sky, fog and ground

- **Sky:** a large inverted sphere with a vertex-colour or shader gradient (horizon lighter than the zenith),
  `depthWrite: false`, drawn first. Set `scene.fog` to the horizon colour so distant things fade into it:
  `scene.fog = new THREE.Fog(horizonColour, near, far)`. Matching fog to the sky's horizon is what hides the
  edge of the world.
- **Ground:** never one flat colour. Add a canvas texture with fine grain, mowing stripes or tiles, darken it
  slightly toward the edges, and set `texture.anisotropy = renderer.capabilities.getMaxAnisotropy()` so it does
  not smear at a distance.
- **Distance:** a ring of simple shapes (stands, hills, trees as crossed planes) past the play area costs a few
  draw calls and makes the place feel like somewhere.

## Textures made in code

```js
function grainTexture(size, base, variation) {
  const c = document.createElement('canvas'); c.width = c.height = size;      // power of two: 256 or 512
  const g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, size, size);
  const img = g.getImageData(0, 0, size, size), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - .5) * variation; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; return t;
}
```

Keep them small (256 or 512) and tiled; reuse one texture across many materials. A soft radial gradient drawn
this way serves as blob shadow, glow sprite and particle. Build each once at start-up, not per object.

## Particles

Keep a fixed pool and reuse it; never create and destroy meshes per particle.

- **Many small dots:** one `THREE.Points` with a `BufferGeometry` whose position (and colour or size) arrays you
  rewrite each frame, `AdditiveBlending` for sparks and glows, `depthWrite: false`.
- **Bigger soft puffs:** one `InstancedMesh` of a quad that faces the camera, matrices updated per frame.
- Short lives (0.2 to 0.8 s), fade out rather than pop, and cap the total. Fewer on low tiers.

## Screen effects without extra files

Render the scene into a `THREE.WebGLRenderTarget`, then draw one full-screen triangle with a `ShaderMaterial`
that reads it. That is all `EffectComposer` does.

- **Bloom:** render target at full size, then a half- or quarter-size target where you keep only pixels above a
  brightness threshold, blur it in two passes (horizontal, vertical), and add it back. Small targets make it
  cheap. Keep the threshold high so only truly bright things glow.
- **Vignette and grade:** a few lines in the final shader (darken toward the corners; lift shadows toward a cool
  tint and highlights toward a warm one). Subtle: if you notice it, halve it.
- Make the whole chain switchable, and skip it entirely on low tiers and usually on phones.
- With a render target in the middle, the built-in antialiasing no longer applies to the scene. Either render
  the target larger, or accept it at high pixel ratios.

## Common ugliness and its cause

| What you see | Usual cause |
|---|---|
| Washed out or too dark overall | sRGB output or texture encoding missing, or added halfway |
| Flat, like cut-out paper | Light coming from the camera direction, or mostly ambient light |
| Objects floating | No contact shadow |
| Striped or speckled shadows | Shadow bias too small; shimmering edges mean the shadow box is too big |
| Flickering where two surfaces meet | Two surfaces at the same depth: separate them or use `polygonOffset` |
| Transparent things cutting holes in each other | `depthWrite` left on; set it false and use `renderOrder` |
| Jagged edges | `antialias: true` missing when the renderer was made, or pixel ratio under 1 |
| Blurry on phones, or slow on phones | Pixel ratio not set, or set to the full device ratio; cap it at 2 |
| Black shiny objects | Metalness with nothing to reflect |
