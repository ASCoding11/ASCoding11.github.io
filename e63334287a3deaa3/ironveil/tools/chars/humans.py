# The MakeHuman build parameters of each character (shared by the build scripts and morphs.py, so morphs match).
HERO = dict(height=0.55, muscle=0.75, weight=0.45, prop=0.85, skin='young_caucasian_male', brows='eyebrow001',
            face=[('head/head-square', 0.35), ('chin/chin-prominent-incr', 0.3), ('nose/nose-scale-vert-incr', 0.2),
                  ('mouth/mouth-scale-horiz-decr', 0.1), ('cheek/l-cheek-bones-incr', 0.3), ('cheek/r-cheek-bones-incr', 0.3),
                  ('eyebrows/eyebrows-trans-down', 0.4), ('neck/neck-scale-horiz-incr', 0.4)])
ALLY = dict(height=0.45, muscle=0.65, weight=0.55, prop=0.85, skin='middleage_caucasian_male', brows='eyebrow009',
            face=[('head/head-round', 0.3), ('nose/nose-scale-horiz-incr', 0.35), ('nose/nose-trans-down', 0.2), ('chin/chin-width-incr', 0.3),
                  ('mouth/mouth-scale-horiz-incr', 0.2), ('eyebrows/eyebrows-angle-down', 0.3), ('cheek/l-cheek-volume-incr', 0.25),
                  ('cheek/r-cheek-volume-incr', 0.25)])
ENEMY = dict(height=0.55, muscle=0.7, weight=0.45, prop=0.8, skin='young_caucasian_male2', brows='eyebrow005', hair='short02',
             face=[('head/head-oval', 0.4), ('nose/nose-scale-horiz-decr', 0.3), ('nose/nose-point-width-decr', 0.2),
                   ('chin/chin-width-decr', 0.3), ('mouth/mouth-scale-horiz-incr', 0.15), ('eyebrows/eyebrows-trans-up', 0.2),
                   ('cheek/l-cheek-volume-decr', 0.3), ('cheek/r-cheek-volume-decr', 0.3)])
PARAMS = {'hero': HERO, 'ally': ALLY, 'enemy': ENEMY}
