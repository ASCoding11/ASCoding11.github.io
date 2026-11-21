# Report source objects whose faces point inward (signed volume < 0) or that are open.
import bpy, sys, os, bmesh
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import models as MD
bpy.ops.wm.read_factory_settings(use_empty=True)
for k in sys.argv[1].split(','):
    W = MD.BUILDERS[k](True)
    for part, lst in W.parts.items():
        for ob, t in lst:
            bm = bmesh.new(); bm.from_mesh(ob.data)
            vol = bm.calc_volume(signed=True)
            open_ = sum(1 for e in bm.edges if not e.is_manifold)
            if vol < 0 or open_:
                print(k, part, ob.name, 'vol=%.3g' % vol, 'open_edges=%d' % open_)
            bm.free()
