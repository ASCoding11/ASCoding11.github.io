import bpy, sys, os, json, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mhlib as L, geo as G
from mathutils import Vector, Matrix, Quaternion

out = sys.argv[-1]
bpy.ops.wm.open_mainfile(filepath=L.WORK + '/weapons_baked.blend')
gj = json.load(open(L.WORK + '/grips.json'))
def M(k):
    t, q = gj[k]
    m = Quaternion(q).to_matrix().to_4x4(); m.translation = Vector(t); return m
GR, GRL, GP, GPL = M('rifle'), M('rifleL'), M('pistol'), M('pistolL')
RIFLE_GL = Vector((0, -0.30, 0.0))
CONV = Matrix.Rotation(-math.pi / 2, 4, 'X')  # glTF keeps Blender bone axes: hand frames need this extra factor
def add(name, m, parent, bone_frame=True):
    if bone_frame: m = m @ CONV
    e = bpy.data.objects.get(name)
    if e is None:
        e = bpy.data.objects.new(name, None); G.link(e); e.parent = parent
    e.matrix_parent_inverse = Matrix()
    e.matrix_basis = m
    return e

def T(rot_cols, trans):
    m = Matrix(rot_cols).transposed().to_4x4(); m.translation = Vector(trans); return m

for o in [o for o in bpy.data.objects if o.type == 'MESH' and o.parent is None]:
    n = o.name
    gl = bpy.data.objects.get(n + '_gripL')
    glp = gl.matrix_basis.translation.copy() if gl else Vector()
    if n in ('rifleScoped', 'enemyRifle', 'smg', 'enemySmg', 'mg'):
        add(n + '_gripR', GR, o)
        add(n + '_gripL', Matrix.Translation(glp - RIFLE_GL) @ GRL, o)
    elif n == 'pistol':
        add(n + '_gripR', GP, o)
        add(n + '_gripL', GPL, o)
    else:
        # small items sit in a fist like a pistol grip: map item axes into pistol space, then hand = inv(T) @ GP
        if n == 'knife':   # blade forward-up out of the thumb side, pommel at the little finger
            Tm = T(((1, 0, 0), (0, 0.30, -0.95), (0, 0.95, 0.30)), (0, 0.02, -0.05)) @ Matrix.Translation((0, -0.06, 0.004))
        elif n == 'grenade':
            Tm = Matrix.Translation((0, 0.02, -0.055))
        else:  # binoculars: tubes forward, centre in front of the palm
            Tm = Matrix.Translation((0.04, -0.02, -0.05))
        add(n + '_gripR', Tm.inverted() @ GP, o)
        if not gl: add(n + '_gripL', Matrix(), o, False)
    o.location = (0, 0, 0)
for ob in bpy.context.scene.objects: ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_image_format='AUTO', export_jpeg_quality=88)
