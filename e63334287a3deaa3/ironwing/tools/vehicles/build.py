# Ironwing vehicles: build driver.  python build.py OUTDIR [what ...]   (what: fighter raider bomber torpedo dive | ships | ground | all)
# Writes one GLB per group into OUTDIR; pack.mjs then compresses and merges them into ../../assets/.
import sys, os, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, lib

def aircraft(kind, out):
    import aircraft as A
    lib.reset(); t = time.time()
    root, body, glass, hero = A.build(kind)
    props = [o for o in root.children if o.name.startswith(kind + '_prop')]
    pmeshes = [c for p in props for c in p.children]
    gears = [o for o in root.children if '_gear' in o.name]
    meshes = [body, glass] + hero + pmeshes + gears
    lib.ao([body] + hero + gears, meshes, dist=1.4, rays=28, strength=0.8)
    lib.lod(kind, root, [body, glass] + pmeshes + gears, 0.12) if hasattr(lib, 'lod') else A.lod(kind, root, [body, glass] + pmeshes + gears, 0.12)
    lib.finish([o for o in bpy.context.scene.objects if o.type == 'MESH'], uv=1.5)
    lib.export([root], os.path.join(out, 'air_' + kind + '.glb'))
    print('built', kind, lib.stats([root]), 'body', lib.tris(body), '%.1fs' % (time.time() - t))

if __name__ == '__main__':
    out = sys.argv[1]; os.makedirs(out, exist_ok=True)
    what = sys.argv[2:] or ['all']
    kinds = ['fighter', 'raider', 'bomber', 'torpedo', 'dive']
    for w in what:
        if w in kinds or w in ('all', 'aircraft'):
            for k in (kinds if w in ('all', 'aircraft') else [w]):
                aircraft(k, out)
        if w in ('ships', 'all'):
            import ships; ships.build_all(out)
        if w in ('ground', 'all'):
            import ground; ground.build_all(out)
