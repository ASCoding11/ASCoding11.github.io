# Ironwing vehicles: build driver.  python build.py OUTDIR [what ...]   (what: fighter raider bomber torpedo dive | ships | ground | all)
# Writes one GLB per group into OUTDIR; pack.mjs then compresses and merges them into ../../assets/.
# TEX=2048 (the default; TEX=0 for vertex colours only) bakes the texture sets of the two hero models, the fighter and
# the carrier (texbake.py), into OUTDIR/tex. THREADS (default 2) limits Cycles.
import sys, os, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, lib

TEX = int(os.environ.get('TEX', '2048'))
TEXTURED = ('fighter',)

def aircraft(kind, out):
    import aircraft as A
    lib.reset(); t = time.time()
    root, body, glass, hero = A.build(kind)
    props = [o for o in root.children if o.name.startswith(kind + '_prop')]
    pmeshes = [c for p in props for c in p.children]
    gears = [o for o in root.children if '_gear' in o.name]
    extra = [o for o in root.children if o.type == 'MESH' and (o.name.endswith('_canopy') or o.name.endswith('_wingOut') or '_bay' in o.name)]
    meshes = [body, glass] + hero + pmeshes + gears + extra
    baked = TEX and kind in TEXTURED
    paintable = [body] + hero + pmeshes + gears + extra
    if baked:
        import texbake; texbake.keep_base(paintable)
    lib.ao([body] + hero + gears + extra, meshes, dist=1.4, rays=28, strength=0.8)
    lo = A.lod(kind, root, [body, glass] + pmeshes + gears + extra, 0.12)
    if baked:
        lib.finish([lo, glass], uv=1.5)
        scales = {o.name: 0.55 for o in pmeshes + gears}
        texbake.bake(kind, paintable, TEX, os.path.join(out, 'tex'), hide=[lo, glass], scales=scales, edge_r=0.02, ao_near=0.08,
                     ao_far=1.2, painter=texbake.fighter_painter(A.TYPES[kind]), strength=1.0)
    else:
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
            import ships; ships.build_all(out, TEX, os.path.join(out, 'tex'))
        if w in ('ground', 'all'):
            import ground; ground.build_all(out)
