import sys, numpy as np, math
sys.path.insert(0, '.')
import amc
D = '../work/cmu/data/'
for t in sys.argv[1:]:
    s = t.split('_')[0]
    F, fps = amc.load(D + s + '.asf', D + t + '.amc', step=4)
    P = np.array([f['root'][0] for f in F]); n = len(F)
    L = np.array([f['lfemur'][0] for f in F]); Rr = np.array([f['rfemur'][0] for f in F])
    left = L - Rr; left[:, 2] = 0; left /= np.linalg.norm(left, axis=1)[:, None]
    fwd = np.cross(left, [0, 0, 1])
    k = 6
    rows = []
    for i in range(k, n - k, 6):
        v = (P[i + k] - P[i - k]) / (2 * k / fps); v[2] = 0
        sp = np.linalg.norm(v)
        th = math.degrees(math.atan2(v @ left[i], v @ fwd[i])) if sp > 0.1 else 0
        rows.append('%5.1fs %4.2fm/s %+4.0f' % (i / fps, sp, th))
    print(t, n, 'frames @', fps, 'hips h', round(float(np.mean(L[:, 2])), 2))
    print('  ' + ' | '.join(rows))
# leg length ratio: mean hip height over hip-to-floor at full extension
import os
if os.environ.get('LEG'):
    for t in sys.argv[1:]:
        s = t.split('_')[0]; sk = amc.Skel(D + s + '.asf')
        leg = sk.bones['lfemur']['len'] + sk.bones['ltibia']['len']
        F, fps = amc.load(D + s + '.asf', D + t + '.amc', step=4)
        h = np.array([(f['lfemur'][0][2] + f['rfemur'][0][2]) / 2 - min(f['ltoes'][0][2], f['rtoes'][0][2]) for f in F])
        print(t, 'leg', round(leg, 3), 'hip-over-ball median', round(float(np.median(h)), 3), 'ratio', round(float(np.median(h)) / leg, 3))
