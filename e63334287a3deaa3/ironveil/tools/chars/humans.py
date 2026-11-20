# The MakeHuman build parameters of each character (shared by the build scripts and morphs.py, so morphs match).
# The hero is a wartime raider (HERO.md): lean and athletic, broad shoulders, narrow waist and hips, hard face.
RAIDER_BODY = [('hip/hip-scale-horiz-decr', 0.55), ('hip/hip-scale-depth-decr', 0.45), ('buttocks/buttocks-volume-decr', 0.8),
               ('stomach/stomach-pregnant-decr', 0.7), ('torso/torso-vshape-incr', 0.7), ('torso/measure-waist-circ-decr', 0.5),
               ('torso/torso-muscle-pectoral-incr', 0.35), ('torso/torso-muscle-dorsi-incr', 0.45),
               ('arms/l-lowerarm-muscle-incr', 0.55), ('arms/r-lowerarm-muscle-incr', 0.55),
               ('arms/l-upperarm-muscle-incr', 0.45), ('arms/r-upperarm-muscle-incr', 0.45),
               ('hands/l-hand-fingers-diameter-incr', 0.15), ('hands/r-hand-fingers-diameter-incr', 0.15),
               ('hands/measure-wrist-circ-incr', 0.25)]
HERO = dict(height=0.55, muscle=0.92, weight=0.34, prop=0.95, skin='young_caucasian_male', brows='eyebrow001',
            face=RAIDER_BODY + [('head/head-square', 0.45), ('chin/chin-prominent-incr', 0.4), ('chin/chin-width-incr', 0.25),
                  ('nose/nose-scale-vert-incr', 0.2), ('nose/nose-hump-incr', 0.35), ('mouth/mouth-scale-horiz-decr', 0.1),
                  ('cheek/l-cheek-bones-incr', 0.55), ('cheek/r-cheek-bones-incr', 0.55),
                  ('cheek/l-cheek-volume-decr', 0.45), ('cheek/r-cheek-volume-decr', 0.45),
                  ('eyebrows/eyebrows-trans-down', 0.5), ('eyebrows/eyebrows-angle-down', 0.25), ('neck/neck-scale-horiz-incr', 0.5)])
ALLY = dict(height=0.45, muscle=0.65, weight=0.55, prop=0.85, skin='middleage_caucasian_male', brows='eyebrow009',
            face=[('head/head-round', 0.3), ('nose/nose-scale-horiz-incr', 0.35), ('nose/nose-trans-down', 0.2), ('chin/chin-width-incr', 0.3),
                  ('mouth/mouth-scale-horiz-incr', 0.2), ('eyebrows/eyebrows-angle-down', 0.3), ('cheek/l-cheek-volume-incr', 0.25),
                  ('cheek/r-cheek-volume-incr', 0.25)])
ENEMY = dict(height=0.55, muscle=0.7, weight=0.45, prop=0.8, skin='young_caucasian_male2', brows='eyebrow005', hair='short02',
             face=[('head/head-oval', 0.4), ('nose/nose-scale-horiz-decr', 0.3), ('nose/nose-point-width-decr', 0.2),
                   ('chin/chin-width-decr', 0.3), ('mouth/mouth-scale-horiz-incr', 0.15), ('eyebrows/eyebrows-trans-up', 0.2),
                   ('cheek/l-cheek-volume-decr', 0.3), ('cheek/r-cheek-volume-decr', 0.3)])
PARAMS = {'hero': HERO, 'ally': ALLY, 'enemy': ENEMY}
