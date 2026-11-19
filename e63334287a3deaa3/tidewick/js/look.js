// What Pip wears from the Wardrobe (captains only for now; README, "Tidewick"). Empty unless main.js has loaded
// ../wardrobe.js, so everyone else's Pip is drawn exactly as always. Looks only: the rules never read anything here.
//   pip(name, sprite)        Pip's sprite in the worn look: the same 16 px width and the same feet, with room on top
//                            for a hat (so draw it at feet - height, as render.js does)
//   trail(ctx, g, camX)      little pixels left behind Pip while moving, drawn before the enemies and Pip
export const look = { pip: null, trail: null };
export const pipSprite = (S, name) => { const s = S[name]; return look.pip && s ? look.pip(name, s) : s; };
