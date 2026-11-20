# The CMU motion-capture takes used for the locomotion loops (trial, start s, end s, options). Run directly to print
# the trial ids (fetch.sh downloads them). Source: CMU Graphics Lab Motion Capture Database, mocap.cs.cmu.edu
# ("The motion capture data may be copied, modified, or redistributed without permission.").
#   theta     : travel direction the loop is pinned to (0 forward, 90 left, 180 back, -90 right)
#   mirror    : left/right swapped (a captured right-side move used for the left, or the reverse)
#   hip_yaw   : derived direction: legs and hips turned this many radians toward travel, chest kept facing forward
#   speed, stride : play faster (cadence) and lengthen the steps by these factors (slow captured side steps)
#   crouch    : derived crouch: pelvis lowered this many metres with the captured footfalls kept (knees bend by IK)
WALK = dict(trial='07_01', t0=0.2, t1=2.6)
BACK = dict(trial='09_12', t0=12.1, t1=15.5)
BDIAG = dict(trial='09_12', t0=8.1, t1=9.9)
JOG = dict(trial='09_01', t0=0.0, t1=1.25)
SIDE_L = dict(trial='143_40', t0=1.0, t1=3.6, speed=1.3, stride=1.3)
SIDE_R = dict(trial='143_40', t0=4.5, t1=7.3, speed=1.3, stride=1.3)
SNEAK_L = dict(trial='143_41', t0=5.1, t1=8.9, speed=1.4, stride=1.45)
SNEAK_R = dict(trial='143_41', t0=0.7, t1=4.2, speed=1.4, stride=1.45)
CR = dict(crouch=0.27, lean=0.32)
TAKES = {
    'walkF':  dict(WALK, theta=0),
    'walkFL': dict(WALK, theta=45, hip_yaw=0.42),
    'walkFR': dict(WALK, theta=-45, hip_yaw=-0.42),
    'walkL':  dict(SIDE_L, theta=90),
    'walkR':  dict(SIDE_R, theta=-90),
    'walkB':  dict(BACK, theta=180),
    'walkBR': dict(BDIAG, theta=-135),
    'walkBL': dict(BDIAG, theta=135, mirror=True),
    'jogF':   dict(JOG, theta=0),
    'jogFL':  dict(JOG, theta=45, hip_yaw=0.38),
    'jogFR':  dict(JOG, theta=-45, hip_yaw=-0.38),
    'jogL':   dict(JOG, theta=90, hip_yaw=1.0),
    'jogR':   dict(JOG, theta=-90, hip_yaw=-1.0),
    'sprintF': dict(trial='102_05', t0=0.0, t1=0.95, theta=0),
    'crouchF':  dict(WALK, theta=0, **CR),
    'crouchFL': dict(WALK, theta=45, hip_yaw=0.42, **CR),
    'crouchFR': dict(WALK, theta=-45, hip_yaw=-0.42, **CR),
    'crouchL':  dict(SNEAK_L, theta=90, crouch=0.22, lean=0.3),
    'crouchR':  dict(SNEAK_R, theta=-90, crouch=0.22, lean=0.3),
    'crouchB':  dict(BACK, theta=180, crouch=0.27, lean=0.3),
    'crouchBR': dict(BDIAG, theta=-135, crouch=0.27, lean=0.3),
    'crouchBL': dict(BDIAG, theta=135, mirror=True, crouch=0.27, lean=0.3),
}
if __name__ == '__main__':
    print(' '.join(sorted({v['trial'] for v in TAKES.values()})))
