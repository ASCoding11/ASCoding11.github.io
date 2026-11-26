# Cycles stills of a .blend made by build_people.py, for checking by eye.
#   python preview.py file.blend out.png [full|face|back] [object-name-prefix]
import bpy, sys, math
from mathutils import Vector
blend, out = sys.argv[1], sys.argv[2]
view = sys.argv[3] if len(sys.argv) > 3 else 'full'
only = sys.argv[4] if len(sys.argv) > 4 else ''
bpy.ops.wm.open_mainfile(filepath=blend)
sc = bpy.context.scene
if only:
    for o in sc.objects:
        if o.type == 'MESH' and not o.name.startswith(tuple(only.split(','))): o.hide_render = True
sc.render.engine = 'CYCLES'; sc.cycles.samples = 24; sc.cycles.device = 'CPU'
try: sc.cycles.use_denoising = True
except Exception: pass
sc.render.resolution_x, sc.render.resolution_y = (700, 1000) if view != 'face' else (700, 700)
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
w.node_tree.nodes['Background'].inputs[0].default_value = (0.55, 0.6, 0.68, 1); w.node_tree.nodes['Background'].inputs[1].default_value = 0.35
def light(name, loc, e, size=1.5, col=(1, 0.95, 0.88)):
    d = bpy.data.lights.new(name, 'AREA'); d.energy = e; d.size = size; d.color = col
    o = bpy.data.objects.new(name, d); sc.collection.objects.link(o); o.location = loc
    o.rotation_euler = (Vector((0, 0, 1.2)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
light('key', (-2.2, -3.0, 2.8), 450); light('fill', (2.5, -2.0, 1.6), 110, col=(0.8, 0.88, 1)); light('rim', (1.5, 3, 2.5), 350)
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
if view == 'full': cam.location = (0.9, -3.6, 1.05); tgt = Vector((0, 0, 0.92)); cam.data.lens = 50
elif view == 'back': cam.location = (-0.9, 3.6, 1.05); tgt = Vector((0, 0, 0.92)); cam.data.lens = 50
elif view == 'torso': cam.location = (0.5, -1.6, 1.45); tgt = Vector((0, 0, 1.32)); cam.data.lens = 60
else: cam.location = (0.3, -0.95, 1.74); tgt = Vector((0, 0, 1.70)); cam.data.lens = 85
cam.rotation_euler = (tgt - cam.location).to_track_quat('-Z', 'Y').to_euler()
sc.render.filepath = out
bpy.ops.render.render(write_still=True)
