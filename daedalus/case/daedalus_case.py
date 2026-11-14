"""
Project Daedalus: the case, the button caps and the board outline, as one parametric model.

Run with CadQuery 2.x (pip install cadquery):

    python daedalus_case.py            # writes STL and STEP files, board.dxf and layout.json next to this file

Every size is in millimetres and lives in the P dictionary below. The same numbers place the parts on the
circuit board (board.dxf, layout.json) and cut the holes in the case, so the two always agree: change a
number here, run the script again, and both the case and the board drawing move together.

Axes, looking at the front of the controller as you hold it:
    X  left to right, 0 in the middle
    Y  bottom to top, 0 in the middle of the main bar (the grips hang below)
    Z  back to front, 0 = the front face of the circuit board (the side with the parts and the stick)

STATUS: version 0. Drawn from datasheets and estimates, not yet printed or fitted. The values marked MEASURE
must be checked against the real parts with calipers before a full case is printed. Print coupon.stl first.

Where the numbers come from (read November 2026):
    stick        YTL YHE-YG13-013 / YTMR-YG13-006 datasheets (hole pattern, 13.1 mm frame, 19.45 mm shaft height)
    radio        ESP32-C6-WROOM-1 datasheet (18.0 x 25.5 x 3.1 mm, antenna in the top 6 mm)
    USB-C        TYPE-C-31-M-12 datasheet (8.94 x 7.35 x 3.26 mm, mouth about 0.5 mm past the board edge)
    slide switch MSK12C02 datasheet (8.0 x 2.8 x 1.4 mm, knob out of the side, 1.6 mm travel)
    shoulders    SHOU HAN TS3819ZJ datasheet (3.9 x 2.9 x 1.6 mm, push-button sticks out 0.85 mm)
    small switch XUNPU TS-1088-AR02016 datasheet (3.9 x 3.0 mm, 2.0 mm tall)
    face buttons spacing of the contacts on an open-hardware SNES controller board
                 (codeberg.org/taylor-madeak/oshw-snes-controller-pcb, CC BY-SA 4.0): 27.0 mm left to right,
                 21.0 mm top to bottom. Dome height and cap size are NOT from a datasheet: measure your pad.
    battery      603450 cell datasheet (6 x 34 x 52 mm)
"""

import json
import math
import os

import cadquery as cq

P = {
    # ---- body ---------------------------------------------------------------------------------------------
    "body_w": 134.0,            # overall width
    "bar_h": 54.0,              # height of the main bar
    "grip_w": 34.0,             # width of each grip
    "grip_drop": 26.0,          # how far the grips hang below the bar (overall height = bar_h + grip_drop)
    "corner_r": 12.0,           # radius of the outline's corners, seen from the front
    "wall": 2.0,                # wall thickness
    "front_gap": 10.0,          # board front face to the inside of the front shell        MEASURE against the stick
    "back_gap": 7.5,            # board back face to the inside of the back shell (battery 6 + foam 1 + 0.5)
    "edge_front": 2.0,          # 45-degree bevel on the front face's edge (a bevel prints cleanly face-down; a round does not)
    "edge_back": 2.5,           # the same on the back face
    "fit": 0.2,                 # clearance between the two shells' lip and groove

    # ---- circuit board ------------------------------------------------------------------------------------
    "pcb_w": 122.0,
    "pcb_h": 46.0,
    "pcb_t": 1.2,
    "pcb_top_y": 24.6,          # Y of the board's top edge (0.4 mm inside the case's inner wall)
    "pcb_corner_r": 2.0,        # bottom corners
    "pcb_top_corner_r": 8.0,    # top corners: rounded more, to clear the case's rounded corners
    "pcb_hole_d": 2.2,          # four mounting holes, also the four main case screws
    "pcb_holes": [(-57.0, 14.0), (57.0, 14.0), (-57.0, -17.0), (57.0, -17.0)],
    "battery_notch": (-10.0, 6.0, 3.0),   # centre X, width, depth of the notch in the bottom edge for the battery lead
    "antenna_notch": (-12.0, 20.0, 6.0), # centre X, width, depth of the cut-out in the top edge under the radio's antenna

    # ---- where the parts sit on the board (X, Y of each part's centre) ------------------------------------
    "stick_xy": (-36.0, -2.0),
    "stick_open_d": 25.0,       # hole in the front shell around the stick (clears every part of the module)
    "stick_collar_h": 2.0,      # a ring inside the shell that thickens the rim of that hole, so knocks on the stick
    "stick_collar_w": 3.0,      #   are taken by the case
    "face_xy": (36.0, -2.0),    # centre of the four face buttons
    "face_pitch_x": 13.5,       # centre of the diamond to the left and right buttons      MEASURE on the rubber pad
    "face_pitch_y": 10.5,       # centre of the diamond to the top and bottom buttons      MEASURE (and check the pad is not tilted)
    "face_contact_d": 5.3,      # diameter of each gold contact pattern on the board
    "face_cap_d": 10.6,         # diameter of a face button cap                             MEASURE to suit the pad's domes
    "face_dome_top": 5.2,       # height of the top of an unpressed rubber dome above the board   MEASURE
    "face_proud": 2.6,          # how far a face button stands above the front face
    "select_xy": (-9.0, -5.5),
    "start_xy": (9.0, -5.5),
    "home_xy": (0.0, -13.0),
    "led_xy": (0.0, -5.5),
    "boot_xy": (8.0, -17.5),
    "small_cap": (8.0, 4.0),    # Select and Start caps: length, width (rounded ends)
    "home_cap_d": 6.0,
    "tact_top": 2.0,            # height of the top of the small push switches above the board
    "small_proud": 1.2,
    "module_box": (-21.0, -0.9, 18.0, 25.5),  # radio module: left X, bottom Y, width, height (antenna at the top edge)
    "usb_x": 5.0,               # centre of the USB-C socket on the top edge
    "usb_open": (9.4, 3.6),     # opening for the plug: width, height
    "usb_z": 1.65,              # centre of the socket's mouth above the board
    "usb_recess": (13.0, 6.6, 1.4),   # shallow pocket round the opening so a cable's boot seats: w, h, depth
    "charge_led_x": 13.3,        # light hole in the top wall for the red / green charge lights
    "switch_x": 19.5,           # centre of the slide switch on the top edge
    "switch_slot": (4.6, 1.8),  # slot for its knob: width (knob 1.3 + travel 1.6 + clearance), height
    "switch_z": 0.7,            # centre of the knob above the board
    "switch_recess": (9.0, 4.0, 1.4),   # pocket round the slot so a fingernail can reach the knob: w, h, depth
    "jst_xy": (-27.0, -17.0),      # battery socket, side entry, its mouth facing right; the plug lies along the bottom edge
    # shoulder buttons: side-facing switches on the top edge, pressed by sliding plungers
    "l1_x": -47.0, "l2_x": -31.5, "r1_x": 47.0, "r2_x": 31.5,
    "shoulder_w1": 15.0,        # width of the L1 / R1 plungers
    "shoulder_w2": 12.0,        # width of the L2 / R2 plungers
    "shoulder_h": 5.0,          # their height (front to back)
    "shoulder_z0": 0.2,         # bottom of a plunger above the board (the switch's push-button must fall inside
                                #   shoulder_z0 .. shoulder_z0 + shoulder_h)                   MEASURE
    "shoulder_body_top": 2.0,   # the plunger's catch passes over the switch's body: its height above the board   MEASURE
    "shoulder_proud": 2.5,      # how far a plunger stands above the top edge
    "shoulder_tip_y": 25.45,    # Y of the switch's push-button tip when not pressed (body flush with the board edge)
    "plunger_gap": 0.25,        # clearance all round a plunger or button cap in its hole

    # ---- screws -------------------------------------------------------------------------------------------
    "grip_screws": [(-50.0, -41.0), (50.0, -41.0)],
    "insert_d": 3.2,            # hole for an M2 brass heat-set insert                        MEASURE against your inserts
    "insert_depth": 4.5,
    "boss_d": 6.4,
    "screw_d": 2.4,             # clearance hole for an M2 screw
    "head_d": 4.4,              # counterbore for the screw head
    "seat_below_pcb": 3.5,      # plastic between the board's back face and the screw head's seat (M2 x 8 screws)

    # ---- battery ------------------------------------------------------------------------------------------
    "battery_xy": (6.0, 0.0),
    "battery_box": (54.0, 36.0),   # pocket for a 603450 cell: 52 x 34.5 plus 1 mm each way      MEASURE
    "battery_rib_h": 4.0,
    "battery_rib_t": 1.2,
    # posts on the back shell that hold the board up behind the stick and the face buttons, so pressing
    # them does not bend it. Keep these spots on the back of the board free of solder joints.
    "back_supports": [(38.5, -2.0), (-36.0, 12.0), (-36.0, -16.0)],
}

HERE = os.path.dirname(os.path.abspath(__file__))


# ------------------------------------------------------------------------------------------------ helpers
def z_levels(p):
    """The heights everything else is built from."""
    front_in = p["front_gap"]
    front_out = front_in + p["wall"]
    pcb_back = -p["pcb_t"]
    back_in = pcb_back - p["back_gap"]
    back_out = back_in - p["wall"]
    return {"front_in": front_in, "front_out": front_out, "split": pcb_back, "back_in": back_in, "back_out": back_out}


def outline_points(p):
    """The front-view outline as a polygon, before its corners are rounded."""
    w = p["body_w"] / 2
    top = p["bar_h"] / 2
    bar_bottom = -p["bar_h"] / 2
    grip_bottom = -p["bar_h"] / 2 - p["grip_drop"]
    gi = p["body_w"] / 2 - p["grip_w"]                  # inner edge of a grip
    return [(-w, top), (w, top), (w, grip_bottom), (gi, grip_bottom), (gi, bar_bottom),
            (-gi, bar_bottom), (-gi, grip_bottom), (-w, grip_bottom)]


def outline_wire(p, inset=0.0):
    """The rounded outline as a closed curve at Z = 0, moved inwards by inset (a true parallel offset, so a
    wall between two of these curves has the same thickness all the way round)."""
    slab = cq.Workplane("XY").polyline(outline_points(p)).close().extrude(1.0).edges("|Z").fillet(p["corner_r"])
    wire = slab.faces("<Z").wires().val()
    if inset:
        wire = wire.offset2D(-inset)[0]
    return wire


def prism(p, z0, z1, inset=0.0):
    """The outline pulled from z0 to z1."""
    return cq.Workplane("XY").add(outline_wire(p, inset)).toPending().extrude(z1 - z0).translate((0, 0, z0))


def cyl(x, y, z0, z1, d):
    return cq.Workplane("XY").workplane(offset=z0).center(x, y).circle(d / 2).extrude(z1 - z0)


def box(x, y, z0, z1, w, h):
    return cq.Workplane("XY").workplane(offset=z0).center(x, y).rect(w, h).extrude(z1 - z0)


def slot(x, y, z0, z1, length, width):
    return cq.Workplane("XY").workplane(offset=z0).center(x, y).slot2D(length, width).extrude(z1 - z0)


def top_wall_cut(p, x, zc, w, h, depth=None):
    """A rectangular hole through the top wall, centred at X = x and Z = zc."""
    y_in = p["bar_h"] / 2 - p["wall"]
    d = p["wall"] + 2.0 if depth is None else depth
    y0 = y_in - 1.0 if depth is None else p["bar_h"] / 2 - depth
    return cq.Workplane("XY").workplane(offset=zc - h / 2).center(x, y0 + d / 2).rect(w, d).extrude(h)


def face_centres(p):
    cx, cy = p["face_xy"]
    rx, ry = p["face_pitch_x"], p["face_pitch_y"]
    return {"north": (cx, cy + ry), "east": (cx + rx, cy), "south": (cx, cy - ry), "west": (cx - rx, cy)}


def shoulders(p):
    return [("L1", p["l1_x"], p["shoulder_w1"]), ("L2", p["l2_x"], p["shoulder_w2"]),
            ("R2", p["r2_x"], p["shoulder_w2"]), ("R1", p["r1_x"], p["shoulder_w1"])]


# ------------------------------------------------------------------------------------------------ shells
LIP_H, LIP_T = 1.2, 1.0     # the back shell's lip: how far it stands up into the front shell, and its thickness
LIP_STOP = 7.0              # the lip and its groove stop this far below the top edge, so the wall under the USB-C
                            #   opening and the shoulder slots keeps its full thickness


def lip_zone(p, z0, z1):
    """Everything except a strip along the top edge."""
    top = p["bar_h"] / 2 - LIP_STOP
    bottom = -p["bar_h"] / 2 - p["grip_drop"] - 2
    return box(0, (top + bottom) / 2, z0, z1, p["body_w"] + 4, top - bottom)


def outer_solid(p):
    z = z_levels(p)
    body = prism(p, z["back_out"], z["front_out"])
    body = body.faces(">Z").edges().chamfer(p["edge_front"])
    body = body.faces("<Z").edges().chamfer(p["edge_back"])
    return body


def cavity(p):
    z = z_levels(p)
    return prism(p, z["back_in"], z["front_in"], inset=p["wall"])


def front_shell(p):
    z = z_levels(p)
    half = box(0, -p["grip_drop"] / 2, z["split"], z["front_out"] + 1, p["body_w"] + 4, p["bar_h"] + p["grip_drop"] + 4)
    shell = outer_solid(p).intersect(half).cut(cavity(p))

    # groove round the inside of the rim that the back shell's lip slides into
    groove = prism(p, z["split"], z["split"] + LIP_H + 0.3, inset=p["wall"] - LIP_T - p["fit"])
    shell = shell.cut(groove.intersect(lip_zone(p, z["split"] - 1, z["split"] + LIP_H + 1)))

    # stick: opening and raised collar
    sx, sy = p["stick_xy"]
    collar_od = p["stick_open_d"] + 2 * p["stick_collar_w"]
    shell = shell.union(cyl(sx, sy, z["front_in"] - p["stick_collar_h"], z["front_in"] + 0.5, collar_od))
    shell = shell.cut(cyl(sx, sy, z["front_in"] - p["stick_collar_h"] - 1, z["front_out"] + 1, p["stick_open_d"]))

    # face buttons, Select, Start, Home, status light, BOOT pin hole
    g = p["plunger_gap"]
    for (x, y) in face_centres(p).values():
        shell = shell.cut(cyl(x, y, z["front_in"] - 1, z["front_out"] + 1, p["face_cap_d"] + 2 * g))
        # a small rib beside each hole: the flat on the button's base runs against it, so the button cannot turn
        rib_x = x + p["face_cap_d"] / 2 + CAP_BASE_EXTRA - 0.6 + g + 0.5
        shell = shell.union(box(rib_x, y, z["front_in"] - 3.0, z["front_in"] + 0.5, 1.0, 6.0))
    for key in ("select_xy", "start_xy"):
        x, y = p[key]
        shell = shell.cut(slot(x, y, z["front_in"] - 1, z["front_out"] + 1, p["small_cap"][0] + 2 * g, p["small_cap"][1] + 2 * g))
    hx, hy = p["home_xy"]
    shell = shell.cut(cyl(hx, hy, z["front_in"] - 1, z["front_out"] + 1, p["home_cap_d"] + 2 * g))
    lx, ly = p["led_xy"]
    shell = shell.cut(cyl(lx, ly, z["front_in"] - 1, z["front_out"] + 1, 2.0))
    bx, by = p["boot_xy"]
    shell = shell.cut(cyl(bx, by, z["front_in"] - 1, z["front_out"] + 1, 1.6))

    # top edge: USB-C, charge light, slide switch, four shoulder plungers
    shell = shell.cut(top_wall_cut(p, p["usb_x"], p["usb_z"], *p["usb_open"]))
    # a shallow pocket round the opening, from the rim upwards, so the moulded end of a cable can seat
    rz0 = z["split"]
    shell = shell.cut(top_wall_cut(p, p["usb_x"], rz0 + p["usb_recess"][1] / 2, p["usb_recess"][0], p["usb_recess"][1], depth=p["usb_recess"][2]))
    shell = shell.cut(top_wall_cut(p, p["charge_led_x"], 1.0, 1.8, 1.8))
    shell = shell.cut(top_wall_cut(p, p["switch_x"], p["switch_z"], *p["switch_slot"]))
    shell = shell.cut(top_wall_cut(p, p["switch_x"], p["switch_z"] + 0.6, p["switch_recess"][0], p["switch_recess"][1], depth=p["switch_recess"][2]))
    for _, x, w in shoulders(p):
        shell = shell.cut(top_wall_cut(p, x, p["shoulder_z0"] + p["shoulder_h"] / 2, w + 2 * g, p["shoulder_h"] + 2 * g))

    # posts: four hold the board, two more sit in the grips. Each takes a brass insert.
    for (x, y) in p["pcb_holes"]:
        shell = shell.union(cyl(x, y, 0, z["front_in"] + 0.5, p["boss_d"]))
        shell = shell.cut(cyl(x, y, -0.1, p["insert_depth"], p["insert_d"]))
    for (x, y) in p["grip_screws"]:
        shell = shell.union(cyl(x, y, z["split"], z["front_in"] + 0.5, p["boss_d"]))
        shell = shell.cut(cyl(x, y, z["split"] - 0.1, z["split"] + p["insert_depth"], p["insert_d"]))
    return shell


def back_shell(p):
    z = z_levels(p)
    half = box(0, -p["grip_drop"] / 2, z["back_out"] - 1, z["split"], p["body_w"] + 4, p["bar_h"] + p["grip_drop"] + 4)
    shell = outer_solid(p).intersect(half).cut(cavity(p))

    # lip that slides into the front shell's groove
    lip = prism(p, z["split"] - 0.5, z["split"] + LIP_H, inset=p["wall"] - LIP_T).cut(
        prism(p, z["split"] - 1, z["split"] + LIP_H + 1, inset=p["wall"]))
    shell = shell.union(lip.intersect(lip_zone(p, z["split"] - 2, z["split"] + LIP_H + 2).translate((0, -p["fit"] - 0.3, 0))))

    seat = z["split"] - p["seat_below_pcb"]
    posts = [(x, y, z["split"]) for (x, y) in p["pcb_holes"]] + [(x, y, z["split"]) for (x, y) in p["grip_screws"]]
    for (x, y, top) in posts:
        shell = shell.union(cyl(x, y, z["back_in"] - 0.5, top, p["boss_d"] + 0.8))
    for (x, y, top) in posts:
        shell = shell.cut(cyl(x, y, z["back_out"] - 1, top + 2, p["screw_d"]))
        shell = shell.cut(cyl(x, y, z["back_out"] - 1, seat, p["head_d"]))

    for (x, y) in p["back_supports"]:
        shell = shell.union(cyl(x, y, z["back_in"] - 0.5, z["split"], 4.0))

    # battery pocket: four low walls, with a gap at the top right for the lead
    bx, by = p["battery_xy"]
    bw, bh = p["battery_box"]
    t, h = p["battery_rib_t"], p["battery_rib_h"]
    z0, z1 = z["back_in"] - 0.5, z["back_in"] + h
    ribs = (box(bx, by + bh / 2 + t / 2, z0, z1, bw * 0.6, t)
            .union(box(bx, by - bh / 2 - t / 2, z0, z1, bw * 0.6, t))
            .union(box(bx - bw / 2 - t / 2, by, z0, z1, t, bh * 0.6))
            .union(box(bx + bw / 2 + t / 2, by - bh * 0.15, z0, z1, t, bh * 0.4)))
    return shell.union(ribs)


# ------------------------------------------------------------------------------------------------ small parts
CAP_BASE_EXTRA = 1.2    # how much wider a button's base is than its top, all round
CAP_REST_GAP = 0.3      # gap between a button's base and the inside of the shell when it is not pressed


def face_cap(p):
    """A face button, modelled standing on its base, bottom at Z = 0. Print it this way up: no overhangs.
    A wide base stops it coming out through the hole; one flat on the base stops it turning."""
    z = z_levels(p)
    d = p["face_cap_d"]
    height = z["front_out"] + p["face_proud"] - p["face_dome_top"]
    base_h = z["front_in"] - CAP_REST_GAP - p["face_dome_top"]
    cap = cq.Workplane("XY").circle(d / 2 + CAP_BASE_EXTRA).extrude(base_h)
    cap = cap.cut(box(d / 2 + CAP_BASE_EXTRA, 0, -1, base_h + 1, 1.2, d + 4))          # the flat
    cap = cap.union(cq.Workplane("XY").workplane(offset=base_h).circle(d / 2).extrude(height - base_h))
    cap = cap.faces(">Z").edges().fillet(0.8)
    # a shallow socket underneath that sits over the top of the rubber dome
    cap = cap.cut(cq.Workplane("XY").circle(d / 2 - 1.6).extrude(1.0))
    return cap


def small_cap(p, round_d=None):
    """Select / Start (a rounded bar) or Home (round): a wide base that reaches down to the push switch,
    then the narrower top that shows through the shell. Bottom at Z = 0; print it this way up."""
    z = z_levels(p)
    height = z["front_out"] + p["small_proud"] - p["tact_top"]
    base_h = z["front_in"] - CAP_REST_GAP - p["tact_top"]
    if round_d:
        base = cq.Workplane("XY").circle(round_d / 2 + CAP_BASE_EXTRA).extrude(base_h)
        top = cq.Workplane("XY").workplane(offset=base_h).circle(round_d / 2).extrude(height - base_h)
    else:
        length, width = p["small_cap"]
        base = cq.Workplane("XY").slot2D(length + 2 * CAP_BASE_EXTRA, width + 2 * CAP_BASE_EXTRA).extrude(base_h)
        top = cq.Workplane("XY").workplane(offset=base_h).slot2D(length, width).extrude(height - base_h)
    return base.union(top).faces(">Z").edges().fillet(0.5)


def plunger(p, width, in_place_x=None):
    """A shoulder button. It slides through the slot in the top wall. Its lower part stops at the switch's
    push-button; its upper part carries on over the switch's body and ends in a catch that hooks behind
    the wall, so it cannot be pulled out. With in_place_x it is returned where it sits in the case (for
    checking); without, lying on its side ready to print."""
    z0 = p["shoulder_z0"]
    z1 = z0 + p["shoulder_h"]
    zb = p["shoulder_body_top"]
    y_out = p["bar_h"] / 2 + p["shoulder_proud"]
    y_tip = p["shoulder_tip_y"]
    y_wall = p["bar_h"] / 2 - p["wall"]
    catch_t, catch_h, back = 1.4, 2.0, 0.25           # catch thickness, how far it stands above the slot, gap to the wall
    y_catch0 = y_wall - back - catch_t
    lower = box(0, (y_out + y_tip) / 2, z0, zb, width, y_out - y_tip)
    upper = box(0, (y_out + y_catch0) / 2, zb, z1, width, y_out - y_catch0)
    catch = box(0, y_catch0 + catch_t / 2, zb, z1 + catch_h, width, catch_t)
    part = lower.union(upper).union(catch)
    part = part.faces(">Y").edges().fillet(1.0)
    if in_place_x is not None:
        return part.translate((in_place_x, 0, 0))
    # lie it on one end so the L-shaped side is drawn flat on the plate
    return part.rotate((0, 0, 0), (0, 1, 0), 90).translate((z0, -(y_out + y_catch0) / 2, width / 2))


def coupon(p):
    """A small test piece to print first: one face-button hole, one Select slot, one insert post and the
    USB-C opening, all at the real sizes. Check each against the real part before printing a whole case."""
    z = z_levels(p)
    g = p["plunger_gap"]
    t = p["wall"]
    plate = cq.Workplane("XY").rect(46, 26).extrude(t)
    plate = plate.cut(cyl(-13, 4, -1, t + 1, p["face_cap_d"] + 2 * g))
    plate = plate.cut(slot(6, 6, -1, t + 1, p["small_cap"][0] + 2 * g, p["small_cap"][1] + 2 * g))
    plate = plate.union(cyl(16, -5, 0, t + 6, p["boss_d"])).cut(cyl(16, -5, t + 6 - p["insert_depth"], t + 7, p["insert_d"]))
    wall = cq.Workplane("XY").center(-4, -12).rect(24, t).extrude(t + 9)
    usb = cq.Workplane("XY").workplane(offset=t + 4 - p["usb_open"][1] / 2).center(-4, -12).rect(p["usb_open"][0], t + 2).extrude(p["usb_open"][1])
    return plate.union(wall).cut(usb)


# ------------------------------------------------------------------------------------------------ board
def board(p):
    y0 = p["pcb_top_y"] - p["pcb_h"]
    yc = p["pcb_top_y"] - p["pcb_h"] / 2
    b = cq.Workplane("XY").workplane(offset=-p["pcb_t"]).center(0, yc).rect(p["pcb_w"], p["pcb_h"]).extrude(p["pcb_t"])
    b = b.edges("|Z").edges(">Y").fillet(p["pcb_top_corner_r"])
    b = b.edges("|Z").edges("<Y").fillet(p["pcb_corner_r"])
    nx, nw, nd = p["battery_notch"]
    b = b.cut(box(nx, y0 + nd / 2 - 0.5, -p["pcb_t"] - 1, 1, nw, nd + 1))
    ax, aw, ad = p["antenna_notch"]
    b = b.cut(box(ax, p["pcb_top_y"] - ad / 2 + 0.5, -p["pcb_t"] - 1, 1, aw, ad + 1))
    for (x, y) in p["pcb_holes"]:
        b = b.cut(cyl(x, y, -p["pcb_t"] - 1, 1, p["pcb_hole_d"]))
    return b


def stick_holes(p, x0, y0):
    """The stick's holes in board coordinates, from the YTL 13-series datasheet (seen from the front, the
    click switch to the left, sensor R2 to the right, sensor R1 below). Hall version: pin 1 GND, 2 OUT, 3 VCC."""
    sx, sy = p["stick_xy"]

    def at(dx, dy, d, name):
        return {"name": name, "x": round(sx + dx - x0, 3), "y": round(sy + dy - y0, 3), "diameter": d}

    holes = [at(dx, dy, 1.2, "frame leg") for dx in (-5.0, 5.0) for dy in (-6.325, 6.325)]
    holes += [at(-2.5, -8.7, 1.0, "R1 pin 1"), at(0.0, -8.7, 1.0, "R1 pin 2"), at(2.5, -8.7, 1.0, "R1 pin 3")]
    holes += [at(8.7, -2.5, 1.0, "R2 pin 1"), at(8.7, 0.0, 1.0, "R2 pin 2"), at(8.7, 2.5, 1.0, "R2 pin 3")]
    holes += [at(-5.65, 3.25, 0.9, "switch S1"), at(-5.65, -3.25, 0.9, "switch S2"),
              at(-10.15, 3.25, 0.9, "switch S3"), at(-10.15, -3.25, 0.9, "switch S4")]
    return holes


def layout(p):
    """Everything someone drawing the circuit board needs, in board coordinates: X from the board's left
    edge, Y up from its bottom edge."""
    x0 = -p["pcb_w"] / 2
    y0 = p["pcb_top_y"] - p["pcb_h"]

    def bc(xy):
        return [round(xy[0] - x0, 2), round(xy[1] - y0, 2)]

    faces = {k: bc(v) for k, v in face_centres(p).items()}
    mx, my, mw, mh = p["module_box"]
    return {
        "units": "mm",
        "origin": "bottom-left corner of the board, seen from the front (the side with the parts)",
        "board": {"width": p["pcb_w"], "height": p["pcb_h"], "thickness": p["pcb_t"],
                  "corner_radius_bottom": p["pcb_corner_r"], "corner_radius_top": p["pcb_top_corner_r"]},
        "mounting_holes": {"diameter": p["pcb_hole_d"], "centres": [bc(h) for h in p["pcb_holes"]]},
        "battery_notch": {"centre_x": round(p["battery_notch"][0] - x0, 2), "width": p["battery_notch"][1], "depth": p["battery_notch"][2]},
        "antenna_notch": {"centre_x": round(p["antenna_notch"][0] - x0, 2), "width": p["antenna_notch"][1], "depth": p["antenna_notch"][2]},
        "stick_centre": bc(p["stick_xy"]),
        "stick_holes": stick_holes(p, x0, y0),
        "face_buttons": faces,
        "face_contact_diameter": p["face_contact_d"],
        "select": bc(p["select_xy"]), "start": bc(p["start_xy"]), "home": bc(p["home_xy"]),
        "status_led": bc(p["led_xy"]), "boot_switch": bc(p["boot_xy"]),
        "radio_module": {"left": round(mx - x0, 2), "bottom": round(my - y0, 2), "width": mw, "height": mh, "antenna": "top edge"},
        "usb_c_centre_x": round(p["usb_x"] - x0, 2),
        "charge_leds_x": round(p["charge_led_x"] - x0, 2),
        "slide_switch_centre_x": round(p["switch_x"] - x0, 2),
        "battery_socket": bc(p["jst_xy"]),
        "battery_socket_note": "side entry, mouth facing right; the plug lies along the bottom edge and the lead drops through the notch",
        "shoulder_switches_x": {name: round(x - x0, 2) for name, x, _ in shoulders(p)},
        "back_supports": [bc(c) for c in p["back_supports"]],
        "note": "USB-C, the slide switch and the four shoulder switches sit on the top edge, facing off the board.",
    }


# ------------------------------------------------------------------------------------------------ output
def export(shape, name, tolerance=0.08):
    cq.exporters.export(shape, os.path.join(HERE, name), tolerance=tolerance, angularTolerance=0.25)


def main():
    p = P
    parts = {
        "front_shell": front_shell(p),
        "back_shell": back_shell(p),
        "face_button": face_cap(p),
        "select_start_button": small_cap(p),
        "home_button": small_cap(p, round_d=p["home_cap_d"]),
        "shoulder_l1_r1": plunger(p, p["shoulder_w1"]),
        "shoulder_l2_r2": plunger(p, p["shoulder_w2"]),
        "coupon": coupon(p),
    }
    for name, shape in parts.items():
        export(shape, name + ".stl")
        vol = shape.val().Volume() / 1000.0
        bb = shape.val().BoundingBox()
        print("%-22s %6.1f cm3   %6.1f x %5.1f x %5.1f mm" % (name, vol, bb.xlen, bb.ylen, bb.zlen))

    assembly = (cq.Assembly()
                .add(parts["front_shell"], name="front_shell", color=cq.Color(0.85, 0.85, 0.88))
                .add(parts["back_shell"], name="back_shell", color=cq.Color(0.25, 0.27, 0.3))
                .add(board(p), name="board", color=cq.Color(0.1, 0.45, 0.25)))
    assembly.save(os.path.join(HERE, "daedalus_case.step"))

    outline = cq.Workplane("XY").add(board(p)).section()
    cq.exporters.export(outline, os.path.join(HERE, "board.dxf"))
    with open(os.path.join(HERE, "layout.json"), "w") as f:
        json.dump(layout(p), f, indent=2)
        f.write("\n")
    z = z_levels(p)
    print("thickness %.1f mm, overall %.0f x %.0f mm" % (z["front_out"] - z["back_out"], p["body_w"], p["bar_h"] + p["grip_drop"]))


if __name__ == "__main__":
    main()
