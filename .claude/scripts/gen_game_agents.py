#!/usr/bin/env python3
"""Generate one Claude Code subagent per game into .claude/agents/ (run: python3 .claude/scripts/gen_game_agents.py)."""
import os, re, sys, glob

ROOT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
BR = 'e63334287a3deaa3'
OUT = os.path.join(ROOT, '.claude', 'agents')
os.makedirs(OUT, exist_ok=True)

readme = open(os.path.join(ROOT, 'README.md'), encoding='utf-8').read().split('\n')
backroom_html = open(os.path.join(ROOT, BR, 'index.html'), encoding='utf-8').read()
phone_html = open(os.path.join(ROOT, BR, 'm', 'index.html'), encoding='utf-8').read()
relay_cfg = open(os.path.join(ROOT, BR, 'netrelay-config.js'), encoding='utf-8').read()
relay_prefixes = set(re.findall(r"\b([a-z]{2}): '", relay_cfg.split('RELAY_PREFIXES = {')[1].split('}')[0]))

invites = dict(re.findall(r'href="/%s/([^/"]+)/"[^>]*data-invite="([a-z]*)"' % BR, backroom_html))

# Back Room folders that are not games of their own (shared data, hubs, admin, redirects).
NOT_GAMES = {'d06440218d1813a3', 'm', 'shop', 'daily', 'wordplay', 'sem-data', 'geo-data',
             'football-data', 'hivefix'}
ARCHIVED = {'starhop', 'quarry', 'kartwheel', 'abyssal', 'hail-mary',
            # daily puzzles archived in November 2026 (off the puzzle lists since the 18th)
            'top-bins', 'crosslet', 'outline', 'sleight', 'scout-report', 'teamsheet', 'deadline-day', 'crossbar',
            'journeyman', 'stat-duel', 'quartets', 'unfurl', 'overland', 'back-four'}
ARCHIVED_ABOUT = {
    'quarry': 'Quarry: an endless block world (hills, forests, deserts, snowy peaks) to dig and build in, with crafting, '
              'smelting, a survival mode, a helper drone and shared online worlds under `rooms/qy-<code>` that keep what '
              'was built. three.js, with its own resolution scaler instead of `../autores.js`.',
    'kartwheel': 'Kartwheel: an arcade kart racer for eight racers on four original tracks, with power-slide boosts and '
                 'item gems; online rooms under `rooms/kw-<code>` (on the game relay), bots fill empty karts. Other '
                 'karts are projected forward from their speed rather than drawn through netsmooth.js.',
    'hail-mary': 'Hail Mary: pixel American football for two, four 3-minute quarters, calling plays on offence and '
                 'auto-playing assignments on defence; online rooms under `rooms/hm-<code>` (on the game relay).',
}
EXTRA_PREFIX = {'quarry': 'qy', 'kartwheel': 'kw', 'hail-mary': 'hm', 'rampline': 'rl'}

SHARED_DATA = {
    'wordplay': ['quartets', 'crosslet', 'sleight', 'mainstream'],
    'sem-data': ['nearword', 'warmer'],
    'geo-data': ['hotspot', 'outline', 'unfurl', 'overland'],
    'football-data': ['deadline-day', 'journeyman', 'scout-report', 'crossbar', 'teamsheet',
                      'back-four', 'stat-duel', 'top-bins'],
}
SHARED_BY = {g: d for d, gs in SHARED_DATA.items() for g in gs}
SHARED_BY.update({'fourcast': 'hunch'})  # Fourcast loads Hunch's word lists

# Genre skills from .claude/skills/ worth reaching for, per game.
GENRE = {
    'rumble-karts': ['camera-systems', 'game-feel', 'physics-tuning'],
    'shell-crackers': ['fps-shooter', 'game-ai'],
    'boostball': ['physics-tuning', 'camera-systems', 'game-ai'],
    'coil': ['game-ai'],
    'showdown': ['card-game'],
    'chromaflage': ['camera-systems'],
    'backrooms-1v1': ['fps-shooter', 'game-ai', 'camera-systems'],
    'drop-zone': ['fps-shooter', 'camera-systems', 'game-ai', 'level-design'],
    'ironveil': ['war-game-series', 'fps-shooter', 'game-ai', 'level-design', 'audio-design'],
    'ironwing': ['war-game-series', 'camera-systems', 'game-ai', 'audio-design'],
    'blockstorm': ['fps-shooter', 'game-ai'],
    'sky-duel': ['war-game-series', 'camera-systems', 'game-ai'],
    'spire': ['platformer', 'level-design', 'camera-systems'],
    'turbo-trail': ['platformer', 'level-design'],
    'escapade': ['platformer', 'level-design', 'puzzle'],
    'odd-one-out': ['camera-systems'],
    'tumble-trials': ['platformer', 'physics-tuning'],
    'putterby': ['physics-tuning', 'level-design'],
    'lunge-line': ['game-feel', 'input-systems'],
    'slipstream': ['physics-tuning', 'camera-systems', 'game-ai'],
    'updraft': ['platformer', 'level-design', 'camera-systems'],
    'asteroid-run': ['procedural-gen', 'game-feel'],
    'rollaway': ['procedural-gen', 'physics-tuning'],
    'rampline': ['physics-tuning', 'level-design'],
    'hush-pools': ['game-ai', 'level-design', 'audio-design'],
    'flipline': ['physics-tuning', 'game-feel'],
    'tidewick': ['platformer', 'level-design', 'create-game-assets'],
    'beatvault': ['audio-design', 'level-design'],
    'gridpop': ['puzzle'], '2048': ['puzzle'], 'stackfall': ['puzzle'],
    'melon-merge': ['puzzle', 'physics-tuning'],
    'patchwork-tower': ['create-game-assets', 'game-feel'],
    'flickerwood': ['game-ai', 'level-design', 'create-game-assets'],
    'lanternhold': ['tower-defense', 'game-ai'],
    'ninefold': ['puzzle'], 'quartets': ['puzzle'], 'crosslet': ['puzzle'], 'sleight': ['puzzle'],
    'poopdle': ['puzzle'], 'back-four': ['puzzle'],
    'starhop': ['game-feel'], 'quarry': ['survival-crafting', 'procedural-gen'],
    'kartwheel': ['physics-tuning', 'camera-systems'], 'hail-mary': ['physics-tuning', 'game-ai'],
}


def readme_bullet(folder_path):
    """Return (first line text, list of indented sub-bullet lines) for a README entry."""
    key = '- `%s/`' % folder_path
    for i, line in enumerate(readme):
        if line.startswith(key):
            subs = []
            for nxt in readme[i + 1:]:
                if nxt.startswith('  ') and nxt.strip():
                    subs.append(nxt.strip())
                else:
                    break
            text = line[len(key):].lstrip(':').strip()
            return text, subs
    return None, []


def overview(text, limit=900):
    """First couple of sentences of a README entry, cut at a sentence end."""
    if len(text) <= limit:
        return text
    cut = text[:limit]
    best = max(cut.rfind('. '), cut.rfind('.) '), cut.rfind('). '))
    return (cut[:best + 1] if best > 300 else cut.rstrip() + ' …')


def page_title(path):
    try:
        html = open(os.path.join(ROOT, path, 'index.html'), encoding='utf-8').read()
    except OSError:
        return None, ''
    t = re.search(r'<title>([^<]*)', html)
    d = re.search(r'<meta name="description" content="([^"]*)', html)
    title = t.group(1).split(' – ')[0].split(' - ')[0].strip() if t else None
    return title, (d.group(1) if d else '')


def game_code(path):
    """All the game's own code (index.html plus its .js files), for feature detection."""
    out = []
    for f in glob.glob(os.path.join(ROOT, path, '**', '*'), recursive=True):
        if f.endswith(('.html', '.js')) and os.path.isfile(f) and os.path.getsize(f) < 6_000_000:
            out.append(open(f, encoding='utf-8', errors='ignore').read())
    return '\n'.join(out)


def file_list(path):
    items = []
    for name in sorted(os.listdir(os.path.join(ROOT, path))):
        full = os.path.join(ROOT, path, name)
        items.append(name + ('/' if os.path.isdir(full) else ''))
    return items


def game_name(text, fallback):
    m = re.match(r'([^(,]+?)\s*[(,]', text or '')
    return m.group(1).strip() if m else fallback


def agent_slug(name, folder):
    s = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
    if s and s[0].isdigit():
        s = 'game-' + s
    return s or folder


games = []
for folder in ['hype-cycle-exchange', 'boxed']:
    games.append((folder, folder, False))
for d in sorted(os.listdir(os.path.join(ROOT, BR))):
    if os.path.isdir(os.path.join(ROOT, BR, d)) and d not in NOT_GAMES:
        games.append((d, '%s/%s' % (BR, d), True))

written = []
for folder, path, backroom in games:
    text, subs = readme_bullet(path)
    title, meta_desc = page_title(path)
    name = game_name(text, title or folder) if text else (title or folder)
    if folder == '2048':
        name = '2048'
    slug = agent_slug(name, folder)
    if folder == 'backrooms-1v1':
        slug = 'backrooms'
    code = game_code(path)
    archived = folder in ARCHIVED
    preview = bool(text and 'preview, admin page only' in text)
    off_lists = bool(text and 'off the puzzle lists' in text)
    prefix = invites.get(folder) if folder in invites else EXTRA_PREFIX.get(folder)
    if prefix == '' and folder != 'rumble-karts':
        prefix = None
    if not prefix and text:
        m = re.search(r'rooms/([a-z]{2})-|prefix `([a-z]{2})`', text)
        if m:
            prefix = m.group(1) or m.group(2)

    uses = []
    if 'three.min.js' in code or 'three.module' in code:
        uses.append('three.js (global r128 build from cdnjs, not ES modules)')
        if 'autores.js' in code:
            uses.append('`../autores.js` loaded straight after three.min.js (automatic resolution)')
        elif folder == 'quarry':
            uses.append('its own resolution scaler instead of `../autores.js`')
    elif '<canvas' in code or 'getContext(' in code:
        uses.append('Canvas 2D / plain DOM, no 3D library')
    else:
        uses.append('plain DOM, no canvas engine')
    if 'firebase' in code.lower():
        if folder in ('hype-cycle-exchange', 'boxed', 'trivium'):
            uses.append('Firebase (project `rumblekarts`), Firestore `games` collection')
        elif prefix is not None:
            where = 'rooms/<code>' if folder == 'rumble-karts' else 'rooms/%s-<code>' % prefix
            uses.append('Firebase Realtime Database rooms under `%s`' % where)
        else:
            uses.append('Firebase (shared `rumblekarts` project)')
    if prefix and prefix in relay_prefixes:
        uses.append('the game relay (`../netrelay.js`; prefix `%s` is in `RELAY_PREFIXES` in `netrelay-config.js`), '
                    'falling back to Firebase if the relay address is blanked' % prefix)
    if 'netsmooth' in code:
        uses.append('`../netsmooth.js` for other players (timestamped `ts` updates, drawn from a short history)')
    if 'stats.js' in code:
        uses.append('`../stats.js` for play time / Leaderboards')
    if 'elo.js' in code:
        uses.append('`../elo.js` ratings')
    if 'keybinds.js' in code:
        uses.append('`../keybinds.js` rebindable controls (keep its `keybinds:<id>` storage key)')
    if 'AD_SLOT' in code:
        uses.append('ads via the `AD_SLOT` pattern (leave `AD_SLOT` empty) and `/adrefresh.js`')
    if 'daily:' in code:
        uses.append('daily result stored as `daily:<slug>` for the Daily Puzzles page')
    if 'gamechat.js' in code:
        uses.append('`../gamechat.js` in-game chat')
    if 'party.js' in code:
        uses.append('`../party.js` (Parties)')

    shared = SHARED_BY.get(folder)
    in_phone = bool(re.search(r"['\"/]%s['\"/]" % re.escape(folder), phone_html))
    thumb = os.path.exists(os.path.join(ROOT, BR, 'm', 'thumbs', folder + '.jpg'))

    if text:
        ov = overview(text)
    else:
        ov = ARCHIVED_ABOUT.get(folder) or (meta_desc if meta_desc.startswith(name) else ('%s. %s' % (name, meta_desc) if meta_desc else name))

    readme_ref = ('the bullet for `%s/` in `README.md`' % path) if text else None
    lines = []
    desc = ('Specialist for %s (`%s/`)' % (name, path))
    if archived:
        desc += ', an archived Back Room game'
    desc += ('. Use for any change to %s: bug fixes, new features, balance, graphics, performance, '
             'phone/touch controls%s. Knows its files, storage keys%s and the repo rules that apply to it.'
             % (name, ', online play' if prefix is not None else '',
                (', room prefix `%s`' % prefix) if prefix else ''))
    lines += ['---', 'name: %s' % slug, 'description: %s' % desc.replace('`', ''), '---', '']
    lines += ['You are the specialist for **%s**, a game on Arjun\'s site (ascoding11.github.io). '
              'You make changes to this one game and leave the rest of the repo alone.' % name, '']

    status = []
    if archived:
        status.append('**Archived.** It is off the Back Room page, the phone page (`GROUPS` in `m/index.html`) and the '
                      'Parties list (`GAMES` in `party.js`), but its files, saved data and keybinds still work when the '
                      'folder is opened directly%s. Don\'t put it back on any list unless Arjun asks.'
                      % (', and its prefix stays in the invite routing' if prefix else ''))
    if preview:
        status.append('**Preview, admin page only.** It is gated behind a preview flag set from the admin page, with no '
                      'card, phone row, What\'s new entry or leaderboard. Keep it that way until Arjun opens it.')
    if off_lists:
        status.append('**Off the puzzle lists since 18 Nov 2026** (folder kept). It still works when opened directly; '
                      'don\'t put it back on the Daily Puzzles page or the phone page unless Arjun asks.')
    if status:
        lines += ['## Status', ''] + ['- ' + s for s in status] + ['']

    lines += ['## What it is', '', ov, '']
    if subs:
        lines += ['The README entry has %d more detailed sub-points under it; read them before touching those areas.' % len(subs), '']

    lines += ['## Where it lives', '']
    lines += ['- Folder: `%s/`: %s' % (path, ', '.join('`%s`' % f for f in file_list(path)))]
    if readme_ref:
        lines += ['- Docs: %s (and the indented points under it). This is the source of truth for how the game '
                  'works and stores data; read it in full before changing anything, and update it when you change '
                  'behaviour, storage or file layout.' % readme_ref]
    else:
        lines += ['- Docs: there is no README entry of its own; see the "Archived Back Room games" point in `README.md`, '
                  'then the code itself.']
    if shared:
        users = [g for g, d in SHARED_BY.items() if d == shared and g != folder]
        lines += ['- Shared files: `%s/%s/` (also used by %s). A change there affects those games too, so check them '
                  'as well or keep the change backwards compatible.' % (BR, shared, ', '.join(users) or 'other games')]
    if backroom:
        if folder in invites:
            inv = ('`data-invite="%s"`' % invites[folder]) if invites[folder] else '`data-invite=""`'
            lines += ['- Card: `%s/index.html` (Play button `href="/%s/"` with %s).' % (BR, path, inv)]
        if in_phone and not archived:
            lines += ['- Phone page: %s%s.' % ('a row in `GROUPS` in `%s/m/index.html`' % BR if in_phone else '',
                                               (' and thumbnail `%s/m/thumbs/%s.jpg`' % (BR, folder)) if thumb else '')]
    else:
        lines += ['- Public game: full card in `projects/index.html` and an entry in `sitemap.xml`; it also has a tile on the phone page.']
    lines += ['']

    lines += ['## What it uses (detected from the code)', ''] + ['- ' + u for u in uses] + ['']

    keep = [
        'Keep every storage path, room prefix, localStorage key, stats/leaderboard id and saved-data format working '
        'exactly as it is, so players\' saved progress, settings, ratings and invite links carry over. Old names '
        'mentioned above (folder, keys, ids) are kept on purpose: never "tidy" them.',
        'Don\'t change Firebase security rules or the Firebase config, and don\'t create a new Firebase project. '
        'If a change needs storage the rules don\'t allow, stop and say so instead.',
        'Keep the keyboard-and-mouse version unchanged on computers, and keep the touch controls working: shown only '
        'on touch screens, nothing overlapping in portrait or with the phone sideways.',
    ]
    if prefix is not None and folder not in ('rampline',) and 'Firebase' in ' '.join(uses):
        keep.append('Other players must be stamped with `ts` and drawn from a short history of updates '
                    '(`../netsmooth.js` or the game\'s own equivalent), not snapped to the newest one.')
    if backroom:
        keep.append('This is a Back Room page: keep `<meta name="robots" content="noindex,nofollow,noarchive">`, keep it '
                    'out of `sitemap.xml`, and never link to it from the public pages.')
    keep.append('Write all game text, questions and prompts in your own words; no copyrighted text. No new outside '
                'scripts, trackers or ads.')
    lines += ['## Must stay true', ''] + ['- ' + k for k in keep] + ['']

    work = [
        'Read `CLAUDE.md`, then this game\'s README entry, then the code you are about to change. Follow the code where '
        'the docs and the code disagree, and fix the docs.',
        'Make the smallest change that does the job. One feature or fix per pull request; leave unrelated code alone.',
        'Any change players can notice gets an entry at the top of `NEWS` in `%s/news.js` (follow the how-to at the top '
        'of that file: date, next version, `kind`, short title, bullets written for players) and the Spanish for each new '
        'line in `%s/news-es.js`.' % (BR, BR),
        'Test by serving the repo (`python3 -m http.server` from the repo root) and opening `/%s/` with Playwright '
        '(pre-installed; `require(\'playwright\')`, `chromium.launch()`): a laptop size such as 1366×768, a phone in '
        'portrait (390×844) and sideways (844×390) with touch on. Check the console for errors.%s'
        % (path, ' For online play, open two pages in the same room and check both see each other move smoothly.'
           if prefix is not None else ''),
        'Commit and push only when asked; never open a pull request unless asked. When you do, start the description '
        'with plain-English bullets of what changed and which pages it affects, and call out anything risky.',
    ]
    lines += ['## How to work', ''] + ['%d. %s' % (i + 1, w) for i, w in enumerate(work)] + ['']

    skills = ['game-graphics (looks)', 'game-performance (frame rate, load time)']
    if 'three.js' in ' '.join(uses):
        skills.append('threejs-materials-lighting and `threejs-scene-setup` (they target r187 ES modules: translate to this '
                      'game\'s r128 global build)')
    skills += GENRE.get(folder, [])
    lines += ['## Skills to use', '',
              'Load the ones that fit the task with the Skill tool: %s. General skills often show Godot or Unity code; '
              'translate the idea to plain JavaScript, and where they disagree with `CLAUDE.md` or the repo\'s own skills, '
              'those win.' % ', '.join('`%s`' % s.split(' ')[0] + (' ' + ' '.join(s.split(' ')[1:]) if ' ' in s else '')
                                         for s in skills), '']

    lines += ['When you finish, report what you changed (files and why), how you tested it, and anything you could not '
              'do or that Arjun needs to decide.', '']

    fn = os.path.join(OUT, slug + '.md')
    open(fn, 'w', encoding='utf-8').write('\n'.join(lines))
    written.append((slug, name, path, prefix))

for w in written:
    print('%-22s %-28s %-40s %s' % w)
print(len(written), 'agents')
