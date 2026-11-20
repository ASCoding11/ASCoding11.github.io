# Turn Weapon objects into the node layout chars.js expects and export a GLB.
#   <kind>                      root empty, origin at the right-hand grip
#     <kind>_body               static mesh (everything that does not move)
#     <kind>_<part>             empty at the part's pivot (bolt, mag, trigger, charging, sightRear, ...)
#       <kind>_<part>_mesh      the part's mesh
#     <kind>_muzzle/_ejection/_scopeEye   empties, +Z (glTF) = direction (down the barrel, out of the port, view)
#     <kind>_gripR/_gripL       hand frames (same conventions as the first weapons file)
import bpy, json, math, os
from mathutils import Vector, Matrix, Quaternion
import geo as G

HERE = os.path.dirname(os.path.abspath(__file__))
GJ = json.load(open(os.path.join(HERE, 'grips.json')))
def _M(k):
    t, q = GJ[k]
    m = Quaternion(q).to_matrix().to_4x4(); m.translation = Vector(t); return m
GR, GRL, GP, GPL = _M('rifle'), _M('rifleL'), _M('pistol'), _M('pistolL')
RIFLE_GL = Vector((0, -0.30, 0.0))
CONV = Matrix.Rotation(-math.pi / 2, 4, 'X')   # hand-bone axes as glTF keeps them
LONG = ('rifleScoped', 'enemyRifle', 'smg', 'enemySmg', 'mg')

def empty(name, parent, M=None, loc=None):
    e = bpy.data.objects.new(name, None); G.link(e)
    e.empty_display_size = 0.02
    e.parent = parent; e.matrix_parent_inverse = Matrix()
    if M is not None:
        e.matrix_basis = M
    elif loc is not None:
        e.location = loc
    return e

def dir_quat(f):
    return Vector((0, -1, 0)).rotation_difference(Vector(f).normalized())

def small_item_frame(base):
    """Small items sit in a fist like a pistol grip (same maps as the first file)."""
    if base == 'knife':
        return Matrix(((1, 0, 0, 0), (0, 0.30, 0.95, 0.02), (0, -0.95, 0.30, -0.05), (0, 0, 0, 1))) @ Matrix.Translation((0, -0.06, 0.004))
    if base in ('grenade',):
        return Matrix.Translation((0, 0.02, -0.055))
    if base == 'stickGrenade':
        return Matrix.Translation((0, 0.02, -0.035))
    return Matrix.Translation((0.04, -0.02, -0.05))   # binoculars

def assemble(W, meshes):
    """meshes: part -> joined mesh object (already final material). Returns the root."""
    k = W.kind
    base = k[:-3] if k.endswith('Lod') else k
    root = empty(k, None)
    for part, ob in meshes.items():
        if part == 'body':
            ob.name = k + '_body'; ob.data.name = k + '_body'
            ob.parent = root; ob.matrix_parent_inverse = Matrix()
        else:
            piv = W.pivots.get(part, (0, 0, 0))
            e = empty(k + '_' + part, root, loc=Vector(piv))
            ob.name = k + '_' + part + '_mesh'; ob.data.name = ob.name
            ob.parent = e
            ob.matrix_parent_inverse = Matrix.Translation(-Vector(piv))
    for suf, (loc, fwd) in W.empties.items():
        M = dir_quat(fwd).to_matrix().to_4x4() if fwd else Matrix()
        M.translation = Vector(loc)
        empty(k + '_' + suf, root, M=M)
    glp = Vector(W.gripL)
    ro, lo = Matrix.Translation(Vector(W.gripRoff)), Matrix.Translation(Vector(W.gripLoff))
    if base in LONG:
        empty(k + '_gripR', root, M=ro @ GR @ CONV)
        empty(k + '_gripL', root, M=lo @ Matrix.Translation(glp - RIFLE_GL) @ GRL @ CONV)
    elif base == 'pistol':
        empty(k + '_gripR', root, M=ro @ GP @ CONV)
        empty(k + '_gripL', root, M=lo @ GPL @ CONV)
    else:
        Tm = small_item_frame(base)
        empty(k + '_gripR', root, M=Tm.inverted() @ GP @ CONV)
        empty(k + '_gripL', root, M=Matrix())
    return root

def export(path, roots):
    for o in bpy.context.view_layer.objects:
        o.select_set(False)
    def sel(o):
        o.select_set(True)
        for c in o.children:
            sel(c)
    for r in roots:
        sel(r)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=False,
                              export_image_format='AUTO', export_jpeg_quality=90, export_extras=False,
                              export_yup=True, export_texcoords=True, export_normals=True, export_tangents=False)
