"""
Project Daedalus: the parts shown in the page's step-by-step 3D viewer and its plan drawing.

Run after daedalus_case.py, in this folder:    python view_parts.py

It writes small, simplified meshes of every part in its assembled position to view/ (the shells here are about a
tenth of the size of the printable ones, which is all a picture needs), and view/plan.json, the outlines the
plan drawing is made from. The bought parts (stick, battery, switches, sockets, radio module) are plain blocks
at their datasheet sizes: they show where things go, not what they look like. Nothing here is for printing.
"""
import json
import math
import os
import struct

import numpy as np

import daedalus_case as dc
import sculpt

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "view")


def read_stl(path):
    """A binary STL as a solid (its points welded back together)."""
    import manifold3d as m3
    raw = open(path, "rb").read()
    n = struct.unpack_from("<I", raw, 80)[0]
    rec = np.frombuffer(raw, dtype=[("n", "<f4", 3), ("v", "<f4", (3, 3)), ("a", "<u2")], count=n, offset=84)
    v = rec["v"].reshape(-1, 3).astype(np.float64)
    key = np.round(v / 1e-4).astype(np.int64)
    _, first, inverse = np.unique(key, axis=0, return_index=True, return_inverse=True)
    t = inverse.reshape(-1, 3)
    t = t[(t[:, 0] != t[:, 1]) & (t[:, 1] != t[:, 2]) & (t[:, 0] != t[:, 2])]
    return m3.Manifold(m3.Mesh(vert_properties=v[first].astype(np.float32), tri_verts=t.astype(np.uint32)))


def solid(shape):
    return sculpt.from_cq(shape, tolerance=0.08, angular=0.35)


def save(name, shape, simplify=0.0):
    s = shape if not hasattr(shape, "val") else solid(shape)
    if simplify:
        s = s.simplify(simplify)
    sculpt.write_stl(s, os.path.join(OUT, name + ".stl"))
    print("%-14s %6d triangles  %7.1f KB" % (name, s.num_tri(), os.path.getsize(os.path.join(OUT, name + ".stl")) / 1024))


def main():
    p = dc.P
    os.makedirs(OUT, exist_ok=True)
    body = dc.make_body(p)
    z = dc.z_levels(p)
    top = p["pcb_top_y"]

    # the two shells, from the printable files, much simplified
    for name in ("front_shell", "back_shell"):
        save(name, read_stl(os.path.join(HERE, name + ".stl")), simplify=0.12)

    # printed buttons, where they sit
    caps = list(dc.face_caps(p, body, in_place=True).values())
    save("face_buttons", dc.join(caps) if not hasattr(caps[0], "num_tri") else sum(caps[1:], caps[0]), simplify=0.03)
    small = list(dc.small_caps(p, body, in_place=True).values())
    save("small_buttons", sum(small[1:], small[0]), simplify=0.03)
    plungers = None
    for _, x, w in dc.shoulders(p):
        q = dc.plunger(p, x, w, in_place=True)
        plungers = q if plungers is None else plungers.union(q)
    save("shoulder_buttons", plungers)

    # the board and what the factory solders to it
    save("board", dc.board(p))
    sx, sy = p["stick_xy"]
    mx, my, mw, mh = p["module_box"]
    jx, jy = p["jst_xy"]
    parts = dc.box(mx + mw / 2, my + mh / 2, 0, 3.2, mw, mh)                                   # radio module
    parts = parts.union(dc.box(p["usb_x"], top + 0.5 - 7.35 / 2, 0, 3.26, 8.94, 7.35))         # USB-C socket
    parts = parts.union(dc.box(p["switch_x"], top - 1.0, 0, 1.4, 8.0, 2.8))                    # slide switch
    parts = parts.union(dc.box(jx, jy, 0, 5.0, 7.6, 7.9))                                      # battery socket
    for key in ("select_xy", "start_xy", "home_xy", "boot_xy"):
        parts = parts.union(dc.box(p[key][0], p[key][1], 0, 2.0, 5.0, 3.0))                    # small push switches
    for _, x, _w in dc.shoulders(p):
        parts = parts.union(dc.box(x, top - 1.025, 0, 1.6, 3.9, 2.05))                         # side-facing switches
    parts = parts.union(dc.box(p["led_xy"][0], p["led_xy"][1], 0, 0.6, 1.6, 0.8))              # status light
    for (x, y) in dc.face_centres(p).values():
        parts = parts.union(dc.cyl(x, y, 0, 0.08, p.get("face_contact_d", 5.3)))               # gold contacts
    save("board_parts", parts)

    # fitted by hand
    stick = dc.box(sx, sy, 0, 12.8, 13.1, 13.1).union(dc.box(sx - 9.3, sy, 0, 7.9, 4.6, 9.0))
    stick = stick.union(dc.box(sx + 8.3, sy, 0, 7.9, 3.8, 9.6)).union(dc.box(sx, sy - 8.3, 0, 7.9, 9.6, 3.8))
    stick = stick.union(dc.cyl(sx, sy, 12.8, 19.45, 4.0))
    save("stick", stick)
    cap_top = float(body.front(sx, sy)) + 6.0
    cap = dc.cyl(sx, sy, cap_top - 3.2, cap_top, 19.0).union(dc.cyl(sx, sy, 15.0, cap_top - 3.0, 7.0))
    save("stick_cap", cap.edges(">Z").fillet(1.2))
    pad = dc.box(p["face_xy"][0], p["face_xy"][1], 0, 0.8, p["face_pitch_x"] * 2 + 13, p["face_pitch_y"] * 2 + 13)
    for (x, y) in dc.face_centres(p).values():
        pad = pad.union(dc.cyl(x, y, 0, p["face_dome_top"], 9.4))
    save("pad", pad)
    bx, by = p["battery_xy"]
    fl = body.floor(bx, by)
    save("battery", dc.box(bx, by, fl + 0.6, fl + 6.6, 52, 34.5).edges("|Z").fillet(2.0))
    inserts = screws = None
    seat = z["split"] - p["seat_below_pcb"]
    for i, (x, y) in enumerate(p["pcb_holes"] + p["grip_screws"]):
        z0 = 0.0 if i < len(p["pcb_holes"]) else z["split"]
        ins = dc.cyl(x, y, z0 + 0.3, z0 + 0.3 + 3.0, 3.6).cut(dc.cyl(x, y, z0, z0 + 4, 1.7))
        scr = dc.cyl(x, y, seat - 1.6, seat, 3.8).union(dc.cyl(x, y, seat, seat + 8.0, 2.0))
        inserts = ins if inserts is None else inserts.union(ins)
        screws = scr if screws is None else screws.union(scr)
    save("inserts", inserts)
    save("screws", screws)

    # the plan drawing: outlines of the case and the board, and where every hole and part is
    def poly(wire_pts):
        return [[round(float(a), 2), round(float(b), 2)] for a, b in wire_pts]
    case_pts = sculpt.outline_polyline(dc.outline_corners(p), step=0.8)
    y0 = top - p["pcb_h"]
    x0 = -p["pcb_w"] / 2
    plan = {
        "units": "mm, X left to right, Y bottom to top, 0 in the middle of the main bar; the view is from the front",
        "case": poly(case_pts),
        "board": [[round(q[0] + x0, 2), round(q[1] + y0, 2)] for q in dc.board_outline_points(p, x0, y0)],
        "stick": {"xy": list(p["stick_xy"]), "opening": p.get("stick_open_d", 25.0), "body": 13.1},
        "face": {k: list(v) for k, v in dc.face_centres(p).items()}, "face_cap": p["face_cap_d"],
        "select": list(p["select_xy"]), "start": list(p["start_xy"]), "home": list(p["home_xy"]),
        "select_cap": p["select_cap_d"], "home_cap": p["home_cap_d"], "led": list(p["led_xy"]), "boot": list(p["boot_xy"]),
        "module": [mx, my, mw, mh], "antenna_notch": list(p["antenna_notch"]), "battery_notch": list(p["battery_notch"]),
        "usb_x": p["usb_x"], "switch_x": p["switch_x"], "jst": [jx, jy], "pcb_top_y": top, "pcb_h": p["pcb_h"], "pcb_w": p["pcb_w"],
        "shoulders": [[n, x, w] for n, x, w in dc.shoulders(p)],
        "pcb_holes": [list(q) for q in p["pcb_holes"]], "grip_screws": [list(q) for q in p["grip_screws"]],
        "battery": {"xy": [bx, by], "size": [52, 34.5], "pocket": list(p["battery_box"])},
        "supports": [list(q) for q in p["back_supports"]],
        "swell": {"xy": list(p["topo"]["swell_xy"]), "size": list(p["topo"]["swell_size"]), "height": p["topo"]["swell"]},
        "pad": [p["face_xy"][0], p["face_xy"][1], p["face_pitch_x"] * 2 + 13, p["face_pitch_y"] * 2 + 13],
    }
    json.dump(plan, open(os.path.join(OUT, "plan.json"), "w"), separators=(",", ":"))
    print("plan.json %.1f KB" % (os.path.getsize(os.path.join(OUT, "plan.json")) / 1024))


if __name__ == "__main__":
    main()
