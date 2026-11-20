/*
 * Showdown: the Wardrobe. HIDDEN (captains only for now: SD_PUBLIC and wardOn() in index.html).
 *
 * index.html fetches this file only when something needs it: this player may open the Wardrobe (a captain's account,
 * SD_PUBLIC, or the test address ?wardrobe=1 on localhost or in an automated browser), or a player at the table wears
 * something (a `cz` field in their node). Everyone else never loads it, and the table looks exactly as it did.
 * The page calls window.SDWardrobe(A) once, with the short list of things it lends (wdApi in index.html), and gets back
 * the hooks it calls: mine(), wire(), parse() for what is worn, avHTML() for a seat's picture, backCls() for face-down
 * cards, flourish() when a seat wins a pot, sync() when wardOn() may have changed.
 *
 * Four slots, a kit is four item numbers [seat look, card back, felt, win flourish], 0 for none: the `no` of Showdown's
 * items in ../cosmetics.js, which also holds their rarity and a line of text. What a number LOOKS like is decided here:
 * the lists below are in number order and their names match cosmetics.js. A number this file does not know draws the
 * usual look, so an older copy copes with newer items. Never reorder a list: add new ones at the end, and add the item
 * with the same number to cosmetics.js.
 *   Seat looks    a small portrait in your seat's circle, on your own colour (in place of your initial). Everyone sees it.
 *   Card backs    your two face-down cards, as everyone else at the table sees them. Card faces never change.
 *   Felts         the table cloth on YOUR screen only (nobody else's table changes). Kept about as dark as the green one,
 *                 so the cards, chips and bet numbers read the same.
 *   Win flourish  a short burst round your seat when you win a pot (about 1.6 s), drawn BEHIND your cards and seat
 *                 plate, so nothing on the table is covered. Off under prefers-reduced-motion.
 * Saved in this browser as sd:wardrobe (JSON [seat, back, felt, win]); sent in the player's own node as cz,
 * 'seat.back.win' (the felt is never sent), only while something is worn. Looks only: no rule, timer or card changes.
 */
window.SDWardrobe=function(A){
'use strict';
const $=A.$;

// =====================================================================
//  The items, in cosmetics.js's number order: [name, rarity, picture]
// =====================================================================
const SK='#F1C39B',INK='#1E1611';
const svg=(inner,vb)=>'<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+(vb||'0 0 40 40')+'">'+inner+'</svg>';
const uri=s=>'url("data:image/svg+xml,'+encodeURIComponent(s)+'")';
// the parts every portrait shares: neck, shoulders in a colour, a head, eyes, a smile
const neck='<rect x="17.2" y="25" width="5.6" height="6" fill="'+SK+'" stroke="'+INK+'" stroke-width=".8"/>';
const body=(c,extra)=>'<path d="M2 42 C3 33 9 29.6 20 29.6 C31 29.6 37 33 38 42Z" fill="'+c+'" stroke="'+INK+'" stroke-width="1"/>'+(extra||'');
const head=(y)=>'<circle cx="20" cy="'+(y||19)+'" r="8.4" fill="'+SK+'" stroke="'+INK+'" stroke-width="1"/>';
const eyes=(y)=>{y=y||19.6;return '<circle cx="17" cy="'+y+'" r="1.15" fill="'+INK+'"/><circle cx="23" cy="'+y+'" r="1.15" fill="'+INK+'"/>'};
const smile=(y)=>{y=y||23.2;return '<path d="M17.6 '+y+' Q20 '+(y+2)+' 22.4 '+y+'" stroke="'+INK+'" stroke-width="1.1" fill="none" stroke-linecap="round"/>'};
const hair=c=>'<path d="M11.5 18.6 Q11.4 10 20 10.2 Q28.6 10 28.5 18.6 Q25.5 14.6 20 14.8 Q14.5 14.6 11.5 18.6Z" fill="'+c+'" stroke="'+INK+'" stroke-width=".8"/>';
const patch='<path d="M11.8 15.8 L28 22.4" stroke="'+INK+'" stroke-width="1"/><ellipse cx="17" cy="19.8" rx="2.9" ry="2.5" fill="#15110E"/>';
const face=(y)=>head(y)+eyes()+smile();
const P=x=>svg('<defs><clipPath id="c"><circle cx="20" cy="20" r="20"/></clipPath></defs><g clip-path="url(#c)">'+x+'</g>');
const SEATS=[
  // 1 Striker: a red kit with a white collar, short hair, a ball at the shoulder
  ['Striker','common',P(neck+body('#E2352F','<path d="M15 29.8 L20 35 L25 29.8" fill="none" stroke="#fff" stroke-width="2.2"/><path d="M7 33 L7 42 M33 33 L33 42" stroke="#fff" stroke-width="2"/>')+face()+hair('#4A2E1A')+
    '<circle cx="31.5" cy="33" r="4.6" fill="#fff" stroke="'+INK+'" stroke-width="1"/><path d="M31.5 30.9 L33.5 32.3 L32.7 34.7 L30.3 34.7 L29.5 32.3Z" fill="'+INK+'"/>')],
  // 2 Point Guard: a purple vest, a white headband with a red stripe, a basketball
  ['Point Guard','common',P(neck+body('#6B3FC9','<path d="M13.5 30.2 Q20 37 26.5 30.2" fill="'+SK+'" stroke="#FFD23F" stroke-width="1.8"/>')+face()+hair('#2A1B12')+
    '<rect x="11.4" y="13.2" width="17.2" height="3.4" rx="1.4" fill="#fff" stroke="'+INK+'" stroke-width=".8"/><rect x="11.6" y="14.3" width="16.8" height="1.1" fill="#E23B3B"/>'+
    '<circle cx="31.5" cy="33" r="4.6" fill="#F0822A" stroke="'+INK+'" stroke-width="1"/><path d="M27 33 H36 M31.5 28.4 V37.6 M28.3 29.8 Q30.6 33 28.3 36.2 M34.7 29.8 Q32.4 33 34.7 36.2" stroke="'+INK+'" stroke-width=".7" fill="none"/>')],
  // 3 Gridiron: a blue helmet with a white stripe and a face cage
  ['Gridiron','uncommon',P(neck+body('#1F4FB8','<path d="M4 34 L12 31 L12 42 M36 34 L28 31 L28 42" fill="#fff" stroke="'+INK+'" stroke-width=".8"/>')+head(20)+eyes(20.8)+
    '<path d="M10.2 23.5 Q8.6 8.6 20 8.4 Q31.4 8.6 30 21 L30.4 25.8 L26.6 25.8 L26.2 18.2 Q20 16.6 13.6 18.4 L13.4 25.6 Q11 25.4 10.2 23.5Z" fill="#1F4FB8" stroke="'+INK+'" stroke-width="1"/>'+
    '<path d="M19 8.5 Q19.5 12.5 19.3 16.8 L20.7 16.8 Q20.5 12.5 21 8.5Z" fill="#fff"/><circle cx="27.6" cy="20.5" r="1.3" fill="#0D2A6A"/>'+
    '<path d="M13 22.6 H27.6 M13 25.6 H27.6 M16.3 22.6 V27.4 M23.7 22.6 V27.4" stroke="#D5DAE2" stroke-width="1.5" stroke-linecap="round"/>')],
  // 4 Slugger: a navy cap, peak to the side, a pinstriped shirt
  ['Slugger','common',P(neck+body('#F4F1E8','<path d="M8 32 V42 M12 30.6 V42 M28 30.6 V42 M32 32 V42" stroke="#2B3D7A" stroke-width=".8"/><path d="M15.5 29.8 L20 33 L24.5 29.8" fill="none" stroke="#2B3D7A" stroke-width="1.6"/>')+face()+
    '<path d="M11.3 17.4 Q11.4 9.4 20 9.4 Q28.6 9.4 28.7 17.4Z" fill="#22315F" stroke="'+INK+'" stroke-width="1"/><path d="M26.5 16.6 Q33 15.6 35 17.6 Q31.5 19 27 18.3Z" fill="#22315F" stroke="'+INK+'" stroke-width=".9"/>'+
    '<circle cx="20" cy="9.6" r="1" fill="#E23B3B"/><path d="M20 9.6 V17.2" stroke="#3A4C82" stroke-width=".6"/>')],
  // 5 Goalie Mask: a white hockey mask with a cage over the eyes and a red stripe
  ['Goalie Mask','rare',P(neck+body('#C42D3A','<path d="M3 37 H37" stroke="#fff" stroke-width="2.4"/><path d="M15 29.7 L20 33 L25 29.7" fill="none" stroke="#fff" stroke-width="1.6"/>')+
    '<path d="M10.6 21 Q10 8.4 20 8.2 Q30 8.4 29.4 21 Q28.6 28.6 20 29.2 Q11.4 28.6 10.6 21Z" fill="#F7F7F2" stroke="'+INK+'" stroke-width="1"/>'+
    '<path d="M20 8.3 V12" stroke="#C42D3A" stroke-width="3"/><path d="M13.5 15.4 Q20 13.6 26.5 15.4 L26 25.6 Q20 27.6 14 25.6Z" fill="#2A2A30"/>'+
    '<path d="M14 18.4 H26.2 M14 21.6 H26.2 M14.2 24.6 H25.8 M17.2 15 V26.6 M20 14.4 V27 M22.8 15 V26.6" stroke="#D9DDE4" stroke-width=".95"/>'+
    '<circle cx="17" cy="19.6" r=".9" fill="#fff"/><circle cx="23" cy="19.6" r=".9" fill="#fff"/>')],
  // 6 Tennis Ace: a green visor, a white collar, a yellow ball
  ['Tennis Ace','common',P(neck+body('#FFFFFF','<path d="M14.6 29.8 L17.6 33.8 L20 30.4 L22.4 33.8 L25.4 29.8" fill="#fff" stroke="#1E9E5A" stroke-width="1.3"/><path d="M3 38.5 H37" stroke="#1E9E5A" stroke-width="1.4"/>')+face()+hair('#B5782F')+
    '<path d="M11.2 15.6 Q20 12.6 28.8 15.6 L28.6 17.4 Q20 14.8 11.4 17.4Z" fill="#1E9E5A" stroke="'+INK+'" stroke-width=".8"/><path d="M12 16.6 Q20 12 28 16.6 Q20 21.4 12 16.6Z" fill="#26B868" stroke="'+INK+'" stroke-width=".8" transform="translate(0 -1.4)"/>'+
    '<circle cx="31.6" cy="33.2" r="4.4" fill="#D9F23A" stroke="'+INK+'" stroke-width="1"/><path d="M27.6 31.6 Q31.6 33.4 28.4 36.4 M35.6 34.8 Q31.6 33 34.8 30" stroke="#fff" stroke-width="1" fill="none"/>')],
  // 7 Boxing Champ: red headgear with cheek pads, a gold-trimmed robe
  ['Boxing Champ','uncommon',P(neck+body('#2A2F6B','<path d="M14 29.8 L20 40 L26 29.8" fill="#C7202A" stroke="#F2C230" stroke-width="1.4"/>')+face()+
    '<path d="M10.6 22.8 Q9.4 9.2 20 9 Q30.6 9.2 29.4 22.8 L26.4 24.6 L26 17.2 Q20 14.8 14 17.2 L13.6 24.6Z" fill="#D7262F" stroke="'+INK+'" stroke-width="1"/>'+
    '<rect x="10.2" y="17.4" width="3.8" height="7.6" rx="1.8" fill="#D7262F" stroke="'+INK+'" stroke-width=".8"/><rect x="26" y="17.4" width="3.8" height="7.6" rx="1.8" fill="#D7262F" stroke="'+INK+'" stroke-width=".8"/>'+
    '<path d="M14.4 12.6 Q20 10.6 25.6 12.6" stroke="#F2C230" stroke-width="1.3" fill="none"/>')],
  // 8 Racing Driver: a full-face helmet, a dark visor, two stripes
  ['Racing Driver','rare',P(neck+body('#F2F2F2','<path d="M9 30.8 L14 42 M31 30.8 L26 42" stroke="#E23B3B" stroke-width="3"/><path d="M15 29.6 Q20 32 25 29.6" stroke="'+INK+'" stroke-width="1.6" fill="none"/>')+
    '<path d="M9.4 21 Q9 8 20 7.8 Q31 8 30.6 21 Q30.4 28.8 20 29.4 Q9.6 28.8 9.4 21Z" fill="#E23B3B" stroke="'+INK+'" stroke-width="1"/>'+
    '<path d="M16.5 8 Q15.6 18 16.6 29.2 M23.5 8 Q24.4 18 23.4 29.2" stroke="#fff" stroke-width="2"/>'+
    '<path d="M11.2 16.8 Q20 14.4 28.8 16.8 L28.2 22.6 Q20 24.6 11.8 22.6Z" fill="#20283A" stroke="'+INK+'" stroke-width="1"/><path d="M13 18 Q17 16.6 20 16.8" stroke="#8FD6FF" stroke-width="1.1" fill="none"/>')],
  // 9 Referee: black and white stripes, a black cap, a whistle
  ['Referee','common',P(neck+body('#fff','<path d="M6 32.6 V42 M10.5 30.9 V42 M15 30 V42 M25 30 V42 M29.5 30.9 V42 M34 32.6 V42" stroke="#15151A" stroke-width="2.4"/><path d="M15 29.8 L20 33.4 L25 29.8" fill="#15151A"/>')+face()+
    '<path d="M11.3 17 Q11.4 9.6 20 9.6 Q28.6 9.6 28.7 17Z" fill="#15151A" stroke="'+INK+'" stroke-width="1"/><path d="M12 16.4 Q20 15 28 16.4 Q27 19 20 18.4 Q13 19 12 16.4Z" fill="#15151A"/>'+
    '<path d="M22.5 25.6 Q26 30 25 33.6" stroke="#E2E2E2" stroke-width=".8" fill="none"/><rect x="23" y="33" width="5" height="2.8" rx="1.3" fill="#C9CED6" stroke="'+INK+'" stroke-width=".7"/>')],
  // 10 Tin Robot: a square tin head, round eyes, a grille and an aerial
  ['Tin Robot','uncommon',P(body('#8E99A6','<circle cx="14" cy="35" r="1.4" fill="#5E6874"/><circle cx="26" cy="35" r="1.4" fill="#5E6874"/><rect x="17" y="32.6" width="6" height="4.4" rx="1" fill="#E23B3B" stroke="'+INK+'" stroke-width=".7"/>')+
    '<rect x="17.5" y="25.6" width="5" height="5" fill="#6E7884" stroke="'+INK+'" stroke-width=".8"/><path d="M20 10.4 V5.4" stroke="'+INK+'" stroke-width="1.2"/><circle cx="20" cy="4.8" r="2" fill="#FF4A3A" stroke="'+INK+'" stroke-width=".8"/>'+
    '<rect x="10.2" y="10.2" width="19.6" height="16.4" rx="2.4" fill="#BCC6D1" stroke="'+INK+'" stroke-width="1"/><rect x="8" y="15.4" width="2.4" height="5.6" rx="1" fill="#8E99A6" stroke="'+INK+'" stroke-width=".7"/><rect x="29.6" y="15.4" width="2.4" height="5.6" rx="1" fill="#8E99A6" stroke="'+INK+'" stroke-width=".7"/>'+
    '<circle cx="15.8" cy="16.6" r="2.6" fill="#FFE45C" stroke="'+INK+'" stroke-width=".9"/><circle cx="24.2" cy="16.6" r="2.6" fill="#FFE45C" stroke="'+INK+'" stroke-width=".9"/><circle cx="15.8" cy="16.6" r=".9" fill="'+INK+'"/><circle cx="24.2" cy="16.6" r=".9" fill="'+INK+'"/>'+
    '<rect x="14.4" y="21.2" width="11.2" height="3" rx=".6" fill="#5E6874"/><path d="M16.6 21.2 V24.2 M18.8 21.2 V24.2 M21 21.2 V24.2 M23.2 21.2 V24.2" stroke="#BCC6D1" stroke-width=".7"/>'+
    '<circle cx="11.6" cy="11.6" r=".6" fill="#5E6874"/><circle cx="28.4" cy="11.6" r=".6" fill="#5E6874"/>')],
  // 11 Chrome Android: a smooth white head with a dark visor and glowing eyes
  ['Chrome Android','epic',P(body('#E8EDF3','<path d="M20 29.6 V42" stroke="#9AA6B4" stroke-width="1"/><circle cx="20" cy="35" r="2.2" fill="#38E8FF" stroke="#1A6F8A" stroke-width=".8"/>')+
    '<rect x="17.4" y="25" width="5.2" height="5.6" fill="#9AA6B4" stroke="'+INK+'" stroke-width=".8"/>'+
    '<path d="M11 20 Q10.6 9 20 8.8 Q29.4 9 29 20 Q28.8 27.6 20 27.8 Q11.2 27.6 11 20Z" fill="#F4F7FA" stroke="'+INK+'" stroke-width="1"/>'+
    '<path d="M12 16.4 Q20 14.2 28 16.4 L27.6 21.6 Q20 23.6 12.4 21.6Z" fill="#1A2030"/><rect x="14.6" y="17.6" width="4" height="2" rx="1" fill="#38E8FF"/><rect x="21.4" y="17.6" width="4" height="2" rx="1" fill="#38E8FF"/>'+
    '<path d="M14 11.4 Q17 10 20 10" stroke="#fff" stroke-width="1.2" fill="none"/>')],
  // 12 Pirate Captain: a black three-cornered hat with gold trim, an eye patch, a red coat
  ['Pirate Captain','epic',P(neck+body('#B8282F','<path d="M14 29.8 L20 37 L26 29.8" fill="#fff" stroke="'+INK+'" stroke-width=".8"/><path d="M11 30.8 V42 M29 30.8 V42" stroke="#F2C230" stroke-width="1.6"/><circle cx="9" cy="37" r="1" fill="#F2C230"/><circle cx="31" cy="37" r="1" fill="#F2C230"/>')+head()+eyes()+smile()+patch+
    '<path d="M4.6 14.6 Q12 15 20 7.4 Q28 15 35.4 14.6 Q30 18.6 20 16.4 Q10 18.6 4.6 14.6Z" fill="#1B1820" stroke="'+INK+'" stroke-width="1"/><path d="M5.4 14.8 Q10 16.4 20 15 Q30 16.4 34.6 14.8" stroke="#F2C230" stroke-width="1.2" fill="none"/>'+
    '<path d="M26.4 11.6 Q31 6.4 34.6 7.4 Q31.6 9.4 28.2 12.8Z" fill="#F4F4F0" stroke="'+INK+'" stroke-width=".7"/>')],
  // 13 Deckhand: a red bandana, an eye patch, a striped shirt and a parrot on the shoulder
  ['Deckhand','rare',P(neck+body('#fff','<path d="M3 33.4 H37 M3 37 H37 M3 40.6 H37" stroke="#1F3F8A" stroke-width="1.9"/>')+head()+eyes()+smile()+patch+
    '<path d="M11.4 17.6 Q11 9.6 20 9.6 Q29 9.6 28.6 17.6 Q20 14.6 11.4 17.6Z" fill="#D7262F" stroke="'+INK+'" stroke-width="1"/><circle cx="14.6" cy="13" r=".8" fill="#fff"/><circle cx="20" cy="11.6" r=".8" fill="#fff"/><circle cx="25.2" cy="13" r=".8" fill="#fff"/>'+
    '<path d="M28.4 15.4 L32.6 13.6 L31.6 17.2Z" fill="#D7262F" stroke="'+INK+'" stroke-width=".8"/>'+
    '<path d="M29.2 31.4 Q28.4 24.6 32.4 23.8 Q36.4 24 35.6 28.4 Q35 32 31.4 33.6Z" fill="#2FB84F" stroke="'+INK+'" stroke-width=".9"/><path d="M33 23.8 Q36.6 22.4 36.2 26 L34.2 25.8Z" fill="#FFC21A" stroke="'+INK+'" stroke-width=".7"/>'+
    '<circle cx="33" cy="25.8" r=".7" fill="'+INK+'"/><path d="M30.2 28.6 Q32 30.6 34.4 29.2" stroke="#E23B3B" stroke-width="1.3" fill="none"/>')],
  // 14 The Boss: a grey fedora with a black band, a pinstriped suit, a red tie, a long coat's wide lapels
  ['The Boss','legendary',P(neck+body('#2A2C34','<path d="M9 31.6 V42 M13 30.4 V42 M27 30.4 V42 M31 31.6 V42" stroke="#6A6E7C" stroke-width=".6"/>'+
    '<path d="M16 29.8 L20 40 L24 29.8Z" fill="#fff"/><path d="M19 31.6 L21 31.6 L21.6 39 L20 41 L18.4 39Z" fill="#C21E2A"/><path d="M15.6 29.8 L12 42 M24.4 29.8 L28 42" stroke="'+INK+'" stroke-width="1"/><path d="M15.6 29.8 L18.6 35 L14.4 34.4Z M24.4 29.8 L21.4 35 L25.6 34.4Z" fill="#3A3D48" stroke="'+INK+'" stroke-width=".7"/>')+head()+eyes()+smile()+
    '<path d="M5 16.6 Q20 12.4 35 16.6 Q33 19 20 17.6 Q7 19 5 16.6Z" fill="#555A66" stroke="'+INK+'" stroke-width="1"/><path d="M11.6 15.6 Q11 7.6 15 6.8 Q20 8.6 25 6.8 Q29 7.6 28.4 15.6Z" fill="#666B78" stroke="'+INK+'" stroke-width="1"/>'+
    '<path d="M11.7 13 Q20 14.6 28.3 13 L28.4 15.6 Q20 17 11.6 15.6Z" fill="#17171C"/>')],
  // 15 Bodyguard: dark glasses, an earpiece with a coiled wire, a black suit and tie
  ['Bodyguard','uncommon',P(neck+body('#17181E','<path d="M16 29.8 L20 38 L24 29.8Z" fill="#fff"/><path d="M19.2 31.4 L20.8 31.4 L21.3 37 L20 38.6 L18.7 37Z" fill="#17181E"/><path d="M15.6 29.8 L13 42 M24.4 29.8 L27 42" stroke="#3A3C46" stroke-width="1"/>')+head()+smile()+
    '<path d="M11.8 14.6 Q12 10.6 20 10.6 Q28 10.6 28.2 14.6 Q20 12.8 11.8 14.6Z" fill="#3A2A20"/>'+
    '<path d="M12 17.6 H28 L27.4 21.4 Q25.2 22.4 22.4 21.2 L21 19.2 H19 L17.6 21.2 Q14.8 22.4 12.6 21.4Z" fill="#0E0F14" stroke="'+INK+'" stroke-width=".8"/><path d="M13.6 18.6 L16 18.6" stroke="#6A7A9A" stroke-width=".8"/>'+
    '<circle cx="28.6" cy="21" r="1.2" fill="#DADDE4" stroke="'+INK+'" stroke-width=".6"/><path d="M28.6 22.2 Q30.4 23.6 28.8 25 Q27.4 26.4 29.2 27.6 Q30.6 28.6 29.4 30" stroke="#DADDE4" stroke-width=".8" fill="none"/>')],
  // 16 Secret Agent: slicked hair, a black dinner jacket and a bow tie
  ['Secret Agent','rare',P(neck+body('#121318','<path d="M15.8 29.8 L20 39 L24.2 29.8Z" fill="#fff"/><path d="M15.8 29.8 L12 42 L17.6 36Z M24.2 29.8 L28 42 L22.4 36Z" fill="#1E2028" stroke="#3A3C46" stroke-width=".7"/>'+
    '<path d="M16.4 31.2 L20 32.6 L23.6 31.2 L23.6 34.4 L20 33 L16.4 34.4Z" fill="#121318"/><circle cx="20" cy="36.4" r=".7" fill="#121318"/>')+face()+
    '<path d="M11.5 18 Q11 9.8 20 9.8 Q29 9.8 28.5 18 Q27 13.4 22 13.6 Q16 12.4 11.5 18Z" fill="#20160F" stroke="'+INK+'" stroke-width=".8"/><path d="M15 12.4 Q20 10.6 25 12.4" stroke="#5A4434" stroke-width=".8" fill="none"/>')],
  // 17 Tracksuit Tough: a flat cap, a zip-up tracksuit with side stripes and a gold chain
  ['Tracksuit Tough','common',P(neck+body('#1F3FA8','<path d="M20 29.8 V42" stroke="#C9CED6" stroke-width="1"/><path d="M6.6 32.4 L5 42 M8.8 31.4 L7.4 42 M33.4 32.4 L35 42 M31.2 31.4 L32.6 42" stroke="#fff" stroke-width="1.1"/>'+
    '<path d="M14.6 29.6 L16 32 M25.4 29.6 L24 32" stroke="#fff" stroke-width="1.6"/><path d="M15.4 29.8 Q20 36.6 24.6 29.8" fill="none" stroke="#F2C230" stroke-width="1.5"/><circle cx="20" cy="33.4" r="1.3" fill="#F2C230" stroke="#9A6E10" stroke-width=".5"/>')+face()+
    '<path d="M10.8 16.6 Q10.6 10 20 9.8 Q29 9.8 29.6 14.6 Q33.6 15.2 32.6 16.8 Q24 18 10.8 16.6Z" fill="#7A6E62" stroke="'+INK+'" stroke-width="1"/><path d="M12 13.6 Q20 12.4 28 13.6" stroke="#5E544A" stroke-width=".7" fill="none"/>')],
  // 18 Wizard: a tall purple hat with stars and a long white beard
  ['Wizard','epic',P(neck+body('#5A2FA8','<path d="M3 36 Q20 31 37 36" stroke="#FFD23F" stroke-width="1" fill="none"/>')+head(20.4)+eyes(20.6)+
    '<path d="M12.6 23 Q14 36 20 38.6 Q26 36 27.4 23 Q24.6 25.6 20 25 Q15.4 25.6 12.6 23Z" fill="#F4F4F0" stroke="'+INK+'" stroke-width=".9"/><path d="M17.4 24.6 Q20 23.2 22.6 24.6" stroke="#C9C9C0" stroke-width="1.2" fill="none"/>'+
    '<path d="M8 15.8 Q20 12.6 32 15.8 Q30 18.4 20 17.4 Q10 18.4 8 15.8Z" fill="#4A2690" stroke="'+INK+'" stroke-width="1"/><path d="M12.6 15.4 L21 0 Q23 6 27.6 15.4Z" fill="#5A2FA8" stroke="'+INK+'" stroke-width="1"/>'+
    '<path d="M19.4 8.2 l.7 1.5 1.6.2 -1.2 1.1 .3 1.6 -1.4 -.8 -1.4 .8 .3 -1.6 -1.2 -1.1 1.6 -.2Z" fill="#FFD23F"/><circle cx="24.4" cy="12.4" r=".8" fill="#FFD23F"/><circle cx="16.4" cy="13.2" r=".6" fill="#FFD23F"/>')]
];
// card backs, 50 × 70 with the usual ivory border; the middle is the design
const CB=(inner)=>svg('<rect x=".5" y=".5" width="49" height="69" rx="5" fill="#F6F0DF"/><defs><clipPath id="k"><rect x="3.4" y="3.4" width="43.2" height="63.2" rx="3"/></clipPath></defs><g clip-path="url(#k)">'+inner+'</g><rect x="3.4" y="3.4" width="43.2" height="63.2" rx="3" fill="none" stroke="rgba(0,0,0,.35)" stroke-width=".8"/>','0 0 50 70');
const BACKS=[
  // 1 Pitch: mown stripes, the halfway line, the centre circle and both boxes
  ['Pitch','common',CB('<rect width="50" height="70" fill="#2E9A4A"/><path d="M0 10 H50 M0 30 H50 M0 50 H50" stroke="#38AE56" stroke-width="10"/>'+
    '<g fill="none" stroke="#fff" stroke-width="1.5"><rect x="6.5" y="6.5" width="37" height="57"/><path d="M6.5 35 H43.5"/><circle cx="25" cy="35" r="7"/><rect x="15" y="6.5" width="20" height="9"/><rect x="15" y="54.5" width="20" height="9"/></g><circle cx="25" cy="35" r="1.4" fill="#fff"/>')],
  // 2 Hardwood: court boards, the painted key and the centre circle
  ['Hardwood','common',CB('<rect width="50" height="70" fill="#D9A15E"/><path d="M8 0 V70 M15 0 V70 M22 0 V70 M29 0 V70 M36 0 V70 M43 0 V70" stroke="#C2894A" stroke-width=".8"/>'+
    '<path d="M0 12 H8 M15 40 H22 M29 22 H36 M43 55 H50" stroke="#B57C40" stroke-width=".7"/><g fill="none" stroke="#7A2A12" stroke-width="1.5"><path d="M3 35 H47"/><circle cx="25" cy="35" r="7"/></g>'+
    '<path d="M16 3 V16 H34 V3Z M16 67 V54 H34 V67Z" fill="#E8742A" stroke="#7A2A12" stroke-width="1.4"/><path d="M18 16 Q25 23 32 16 M18 54 Q25 47 32 54" fill="none" stroke="#7A2A12" stroke-width="1.4"/>')],
  // 3 Gridiron: a football field with yard lines, hash marks and two end zones
  ['Gridiron','uncommon',CB('<rect width="50" height="70" fill="#2F8A3E"/><rect width="50" height="11" fill="#1F4FB8"/><rect y="59" width="50" height="11" fill="#D7262F"/>'+
    '<path d="M0 11 H50 M0 59 H50" stroke="#fff" stroke-width="1.6"/><path d="M0 19 H50 M0 27 H50 M0 35 H50 M0 43 H50 M0 51 H50" stroke="#fff" stroke-width=".9"/>'+
    '<path d="M19 15 H21 M29 15 H31 M19 23 H21 M29 23 H31 M19 31 H21 M29 31 H31 M19 39 H21 M29 39 H31 M19 47 H21 M29 47 H31 M19 55 H21 M29 55 H31" stroke="#fff" stroke-width=".7"/>'+
    '<ellipse cx="25" cy="35" rx="4.6" ry="7" fill="#8A4A22" stroke="#3A1E0E" stroke-width=".8" transform="rotate(35 25 35)"/><path d="M23 33.4 L27 36.6 M23.4 32.6 l1 -.8 M24.6 34 l1 -.8 M25.8 35.4 l1 -.8" stroke="#fff" stroke-width=".7"/>')],
  // 4 Checkered Flag: black and white checks with a red band across the middle
  ['Checkered Flag','uncommon',CB((()=>{let s='<rect width="50" height="70" fill="#fff"/>';for(let y=0;y<10;y++)for(let x=0;x<7;x++)if((x+y)%2)s+='<rect x="'+(x*7.2)+'" y="'+(y*7.2)+'" width="7.2" height="7.2" fill="#15151A"/>';
    return s+'<path d="M-2 40 L52 26 L52 34 L-2 48Z" fill="#E23B3B" stroke="#fff" stroke-width="1.2"/>'})())],
  // 5 Circuit Board: green board, gold traces and a chip in the middle
  ['Circuit Board','rare',CB('<rect width="50" height="70" fill="#0F5A3E"/><g fill="none" stroke="#E6B84A" stroke-width="1.2" stroke-linecap="round"><path d="M25 26 V12 L18 6 M20 26 V18 L10 12 V5 M30 26 V16 L40 10 M15 31 H8 L5 28 M15 37 H6 V48 M35 31 H44 M35 37 H40 L45 42 M20 44 V54 L12 60 M25 44 V64 M30 44 V52 L40 58 V66"/></g>'+
    '<g fill="#E6B84A"><circle cx="18" cy="6" r="1.6"/><circle cx="10" cy="5" r="1.6"/><circle cx="40" cy="10" r="1.6"/><circle cx="5" cy="28" r="1.6"/><circle cx="6" cy="48" r="1.6"/><circle cx="44" cy="31" r="1.6"/><circle cx="45" cy="42" r="1.6"/><circle cx="12" cy="60" r="1.6"/><circle cx="25" cy="64" r="1.6"/><circle cx="40" cy="66" r="1.6"/></g>'+
    '<rect x="15" y="26" width="20" height="18" rx="1.6" fill="#1B1E24" stroke="#0A0B0E" stroke-width=".8"/><rect x="18" y="29" width="14" height="12" rx="1" fill="none" stroke="#3A4250" stroke-width=".8"/><circle cx="25" cy="35" r="2" fill="#38F2C8"/>')],
  // 6 Treasure Map: old paper, a dotted trail, an island and a red X
  ['Treasure Map','epic',CB('<rect width="50" height="70" fill="#E9D3A0"/><path d="M0 0 H50 V70 H0Z" fill="none" stroke="#B88A4A" stroke-width="6" opacity=".45"/>'+
    '<path d="M10 54 Q6 44 14 40 Q22 36 20 28 Q18 20 28 18 Q38 16 36 26 Q34 34 42 38 Q46 46 38 52 Q30 60 20 58 Q12 58 10 54Z" fill="#C9B47A" stroke="#7A5A2A" stroke-width="1"/>'+
    '<path d="M8 64 Q12 56 18 52 Q24 48 22 40 Q20 32 28 30" fill="none" stroke="#7A3A1A" stroke-width="1.3" stroke-dasharray="2 2"/><path d="M26 25 L32 31 M32 25 L26 31" stroke="#C21E2A" stroke-width="2.6" stroke-linecap="round"/>'+
    '<circle cx="39" cy="11" r="5.6" fill="#F4E6C0" stroke="#7A5A2A" stroke-width=".8"/><path d="M39 5.8 L40.4 11 L39 16.2 L37.6 11Z" fill="#C21E2A"/><path d="M33.8 11 H44.2" stroke="#7A5A2A" stroke-width=".7"/>'+
    '<path d="M6 12 q2 -2 4 0 q2 2 4 0 M8 20 q2 -2 4 0 q2 2 4 0 M34 62 q2 -2 4 0 q2 2 4 0" fill="none" stroke="#5A8AB0" stroke-width=".9"/>')],
  // 7 Pinstripe: charcoal suit cloth, fine stripes and a small gold diamond
  ['Pinstripe','common',CB('<rect width="50" height="70" fill="#2C2F38"/><path d="M5 0 V70 M10 0 V70 M15 0 V70 M20 0 V70 M30 0 V70 M35 0 V70 M40 0 V70 M45 0 V70 M25 0 V26 M25 44 V70" stroke="#8A8FA0" stroke-width=".45"/>'+
    '<path d="M25 26 L32 35 L25 44 L18 35Z" fill="#2C2F38" stroke="#D9B25C" stroke-width="1.6"/><path d="M25 30 L28.6 35 L25 40 L21.4 35Z" fill="#D9B25C"/>')]
];
// felts, as the page's three felt colours (light, middle, edge), and an optional pattern laid over them
const FELTS=[
  ['Midnight Blue','common',['#1F5A96','#133C68','#08203C'],''],
  ['Casino Red','common',['#93253A','#661727','#370912'],''],
  ['Striped Pitch','uncommon',['#1C8A4C','#11613A','#073420'],'repeating-linear-gradient(90deg,rgba(255,255,255,.07) 0 9%,rgba(0,0,0,.06) 9% 18%)'],
  ['Purple Velvet','rare',['#6A3A9E','#46236E','#240E3C'],'radial-gradient(ellipse 60% 50% at 50% 40%,rgba(255,220,150,.08),transparent 70%)'],
  ["Ship's Deck",'rare',['#8A5A32','#64401F','#3A230F'],'repeating-linear-gradient(0deg,rgba(0,0,0,.28) 0 2px,transparent 2px 9%),repeating-linear-gradient(90deg,transparent 0 31%,rgba(0,0,0,.2) 31% calc(31% + 2px),transparent calc(31% + 2px) 52%)']
];
// win flourishes: [name, rarity, picture for the Wardrobe]
const WINS=[
  ['Confetti','common',svg('<g transform="rotate(-8 20 20)"><rect x="6" y="8" width="5" height="3" fill="#FF4F8B"/><rect x="26" y="5" width="5" height="3" fill="#3FA9F5" transform="rotate(30 28 6)"/><rect x="16" y="15" width="5" height="3" fill="#FFD23F" transform="rotate(-25 18 16)"/><rect x="30" y="20" width="5" height="3" fill="#5FD068"/><rect x="8" y="24" width="5" height="3" fill="#B46CFF" transform="rotate(40 10 25)"/><rect x="20" y="29" width="5" height="3" fill="#FF8A1F"/><rect x="28" y="32" width="5" height="3" fill="#FF4F8B" transform="rotate(-30 30 33)"/></g>')],
  ['Coin Shower','uncommon',svg('<g stroke="#8A5A10" stroke-width="1"><ellipse cx="12" cy="10" rx="5" ry="5" fill="#FFC93C"/><ellipse cx="27" cy="16" rx="3" ry="5" fill="#FFC93C"/><ellipse cx="17" cy="27" rx="5" ry="5" fill="#FFC93C"/><ellipse cx="31" cy="31" rx="5" ry="2.4" fill="#FFC93C"/></g><path d="M10 9 L14 9 M15 26 L19 26" stroke="#8A5A10" stroke-width="1"/>')],
  ['Trophy','rare',svg('<path d="M11 6 H29 V14 Q29 24 20 25 Q11 24 11 14Z" fill="#FFC93C" stroke="#8A5A10" stroke-width="1.2"/><path d="M11 9 Q4 9 6 15 Q8 19 12 18 M29 9 Q36 9 34 15 Q32 19 28 18" fill="none" stroke="#8A5A10" stroke-width="1.6"/><rect x="17.5" y="25" width="5" height="5" fill="#E2A82A"/><rect x="12" y="30" width="16" height="5" rx="1" fill="#6A3A1A"/><path d="M15 9 Q15 18 19 21" stroke="#FFF2B8" stroke-width="1.6" fill="none"/>')],
  ['Fireworks','epic',svg((()=>{let s='';const b=(cx,cy,r,c)=>{for(let k=0;k<10;k++){const a=k*Math.PI/5;s+='<path d="M'+(cx+Math.cos(a)*r*.35).toFixed(1)+' '+(cy+Math.sin(a)*r*.35).toFixed(1)+' L'+(cx+Math.cos(a)*r).toFixed(1)+' '+(cy+Math.sin(a)*r).toFixed(1)+'" stroke="'+c+'" stroke-width="1.6" stroke-linecap="round"/>'}};b(14,14,10,'#FF4F8B');b(29,22,9,'#3FD2FF');b(15,31,6,'#FFD23F');return s})())],
  ['Treasure Chest','legendary',svg('<path d="M7 18 Q7 9 20 9 Q33 9 33 18Z" fill="#9A5A2A" stroke="#4A2A10" stroke-width="1.2"/><rect x="7" y="18" width="26" height="15" fill="#A8662F" stroke="#4A2A10" stroke-width="1.2"/><path d="M7 22 H33 M13 9.6 V33 M27 9.6 V33" stroke="#F2C230" stroke-width="1.8"/><rect x="18" y="19" width="4" height="5" rx="1" fill="#F2C230" stroke="#4A2A10" stroke-width=".8"/><circle cx="12" cy="6" r="2.4" fill="#FFC93C"/><circle cx="28" cy="5" r="2" fill="#FFC93C"/><circle cx="20" cy="3.4" r="1.6" fill="#FFF2B8"/>')]
];
const LISTS=[SEATS,BACKS,FELTS,WINS];
const SLOTS=['seat','back','felt','win'];

// =====================================================================
//  What is worn
// =====================================================================
const norm=k=>{k=Array.isArray(k)?k:[];return LISTS.map((L,i)=>{const n=k[i]|0;return n>0&&n<=L.length?n:0})};
let kit=norm(A.store.get('wardrobe',[]));
function mine(){return A.wardOn()?kit:null}
// the network form: 'seat.back.win', only while something others can see is worn
function wire(){const k=mine();if(!k||!(k[0]||k[1]||k[3]))return '';return k[0]+'.'+k[1]+'.'+k[3]}
// another player's cz: [seat, back, 0, win] (numbers this file doesn't know become 0), or null
function parse(raw){
  if(typeof raw!=='string'||!/^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(raw))return null;
  const p=raw.split('.').map(Number);const w=[p[0]<=SEATS.length?p[0]:0,p[1]<=BACKS.length?p[1]:0,0,p[2]<=WINS.length?p[2]:0];
  return w[0]||w[1]||w[3]?w:null;
}

// =====================================================================
//  On the table
// =====================================================================
const CSS=`
.av .wdp{position:absolute;inset:0;border-radius:50%;background:center/100% 100% no-repeat;pointer-events:none}
${BACKS.map((b,i)=>'.cd.back.wb'+(i+1)+'{background:'+uri(b[2])+' center/100% 100% no-repeat}.cd.back.wb'+(i+1)+'::after{display:none}').join('\n')}
${FELTS.map((f,i)=>'#app.wf'+(i+1)+'{--felt-1:'+f[2][0]+';--felt-2:'+f[2][1]+';--felt-3:'+f[2][2]+'}'+(f[3]?'#app.wf'+(i+1)+' #table .felt{background:'+f[3]+',radial-gradient(ellipse 62% 58% at 50% 36%,rgba(255,244,196,.15),transparent 72%),radial-gradient(ellipse 78% 74% at 50% 44%,var(--felt-1) 0%,var(--felt-2) 54%,var(--felt-3) 100%)}':'')).join('\n')}
.wdfx{position:absolute;left:50%;top:50%;width:0;height:0;z-index:-1;pointer-events:none}
.wdfx i{position:absolute;left:0;top:0;display:block;opacity:0;animation:var(--an) var(--d,1.4s) cubic-bezier(.2,.7,.3,1) var(--dl,0s) both}
@keyframes wdBurst{0%{opacity:1;transform:translate(-50%,-50%) rotate(0) scale(.6)}75%{opacity:1}100%{opacity:0;transform:translate(calc(-50% + var(--x)),calc(-50% + var(--y))) rotate(var(--r)) scale(1)}}
@keyframes wdFall{0%{opacity:0;transform:translate(calc(-50% + var(--x)),calc(-50% - 70px)) rotateY(0)}15%{opacity:1}85%{opacity:1}100%{opacity:0;transform:translate(calc(-50% + var(--x)),calc(-50% + var(--y))) rotateY(var(--r))}}
@keyframes wdRise{0%{opacity:0;transform:translate(-50%,-30%) scale(.3)}25%{opacity:1;transform:translate(-50%,-110%) scale(1.1)}35%{transform:translate(-50%,-100%) scale(1)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-112%) scale(1)}}
@keyframes wdPop{0%{opacity:0;transform:translate(-50%,-50%) scale(.2)}20%{opacity:1;transform:translate(-50%,-50%) scale(1)}70%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) scale(1.05)}}
@media (prefers-reduced-motion:reduce){.wdfx{display:none}}
#wdOpen{margin-top:10px}
#wd .wd-card{background:var(--panel-2);border:1px solid var(--line);border-radius:20px;margin:auto;width:min(860px,calc(100% - 20px));max-height:calc(100% - 20px);display:flex;flex-direction:column;padding:16px 18px;box-shadow:0 30px 80px rgba(0,0,0,.5)}
.wd-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
.wd-head h2{font:400 30px/1 var(--f-d);color:var(--gold-2);margin:0}
.wd-sub{margin:6px 0 10px;font:700 13px/1.35 var(--f-u);color:var(--ink-2)}
.wd-body{display:grid;grid-template-columns:240px minmax(0,1fr);gap:16px;min-height:0;flex:1 1 auto}
.wd-prev{display:flex;flex-direction:column;align-items:center;gap:8px;min-width:0}
.wd-felt{position:relative;width:100%;max-width:240px;aspect-ratio:1.5;border-radius:999px;padding:9px;background:linear-gradient(180deg,#5a3a22,#2e1c0f);box-shadow:0 8px 20px rgba(0,0,0,.5)}
.wd-felt>.cl{position:absolute;inset:9px;border-radius:999px;overflow:hidden;background:radial-gradient(ellipse 78% 74% at 50% 44%,var(--felt-1) 0%,var(--felt-2) 54%,var(--felt-3) 100%)}
.wd-felt>.cl>i{position:absolute;inset:0}
.wd-felt .seat{position:absolute;left:50%;top:64%;--pw:132px;--hw:34px;transform:translate(-50%,-50%)}
.wd-felt .hole{bottom:calc(100% - 8px)}
.wd-prev small{font:700 12px var(--f-u);color:var(--ink-3);text-align:center}
.wd-pick{display:flex;flex-direction:column;min-height:0;min-width:0}
.wd-tabs{display:flex;flex-wrap:wrap;gap:4px;border:1px solid var(--line);border-radius:12px;padding:3px;align-self:flex-start;background:rgba(255,255,255,.04)}
.wd-tabs button{border:0;background:none;border-radius:9px;padding:7px 11px;font:800 13px var(--f-u);color:var(--ink-2);cursor:pointer}
.wd-tabs button[aria-pressed="true"]{background:rgba(217,178,92,.18);color:var(--gold-2)}
.wd-note{margin:8px 0;font:600 13px/1.35 var(--f-u);color:var(--ink-2)}
.wd-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(98px,1fr));gap:8px;overflow:auto;min-height:0;padding:2px 2px 8px;align-content:start;flex:1 1 auto}
.wd-grid button{display:flex;flex-direction:column;align-items:center;gap:5px;border:1px solid var(--line);border-radius:12px;background:rgba(255,255,255,.05);padding:8px 4px 7px;font:800 12px/1.15 var(--f-u);color:var(--ink);cursor:pointer;min-width:0}
.wd-grid button:hover{background:rgba(255,255,255,.1)}
.wd-grid button[aria-pressed="true"]{border-color:var(--gold);background:rgba(217,178,92,.16);box-shadow:0 0 0 1px var(--gold)}
.wd-grid em{font:800 10px var(--f-u);letter-spacing:.08em;text-transform:uppercase;font-style:normal}
.wd-pic{width:64px;height:64px;display:grid;place-items:center;position:relative}
.wd-pic .av{width:54px;height:54px;max-width:none;max-height:none;font-size:26px}
.wd-pic .cd{--w:42px}
.wd-pic .sw{width:64px;height:44px;border-radius:999px;border:4px solid #4a2e18;background:radial-gradient(ellipse 78% 74% at 50% 44%,var(--felt-1) 0%,var(--felt-2) 54%,var(--felt-3) 100%);position:relative;overflow:hidden}
.wd-pic .sw i{position:absolute;inset:0}
.wd-pic img{width:52px;height:52px}
.r-common{color:#B9C2CC}.r-uncommon{color:#6FD08A}.r-rare{color:#5FB4FF}.r-epic{color:#C78AFF}.r-legendary{color:#FFC93C}
@media (max-width:640px){.wd-body{grid-template-columns:minmax(0,1fr);grid-template-rows:auto minmax(0,1fr)}.wd-felt{max-width:200px}.wd-prev small{display:none}.wd-grid{grid-template-columns:repeat(auto-fill,minmax(86px,1fr))}}
@media (max-height:520px){#wd .wd-card{padding:10px 14px}.wd-head h2{font-size:24px}.wd-sub{display:none}.wd-body{grid-template-columns:180px minmax(0,1fr)}.wd-felt{max-width:176px}.wd-felt .seat{--pw:118px;--hw:28px}.wd-prev small{display:none}.wd-grid{grid-template-columns:repeat(auto-fill,minmax(84px,1fr))}.wd-note{margin:4px 0}}
`;
const st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);
const AVURI=SEATS.map(s=>uri(s[2]));
// the picture inside a seat's circle (the circle itself keeps the player's colour)
function avHTML(n){return n>0&&n<=SEATS.length?'<span class="wdp" style="background-image:'+AVURI[n-1].replace(/"/g,'&quot;')+'"></span>':''}
function backCls(n){return n>0&&n<=BACKS.length?'wb'+n:''}
// the felt on this screen
function applyFelt(){const k=mine(),f=k?k[2]:0,app=$('app');for(let i=1;i<=FELTS.length;i++)app.classList.toggle('wf'+i,i===f)}
// a win flourish round a seat (el: the seat element): pieces drawn behind its cards and plate, gone after ~1.8 s
function rnd(a,b){return a+Math.random()*(b-a)}
function flourish(el,n){
  if(!el||!(n>0&&n<=WINS.length))return;
  try{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return}catch(e){}
  const old=el.querySelector('.wdfx');if(old)old.remove();
  const fx=document.createElement('div');fx.className='wdfx';let h='';
  const w=Math.max(80,el.offsetWidth||120);
  const piece=(style,inner)=>{h+='<i style="'+style+'">'+(inner||'')+'</i>'};
  // everything starts at the sides of the seat plate and goes outwards, so the cards above (or below) it stay clear
  const side=()=>Math.random()<.5?-1:1,hw=w/2;
  if(n===1){const C=['#FF4F8B','#3FA9F5','#FFD23F','#5FD068','#B46CFF','#FF8A1F'];
    for(let k=0;k<30;k++){const sd=k%2?1:-1,a=rnd(-.75,.6),r=rnd(hw*.5,hw*1.1);piece('--an:wdBurst;--d:'+rnd(1.1,1.6).toFixed(2)+'s;--dl:'+rnd(0,.15).toFixed(2)+'s;left:'+(sd*hw*.8).toFixed(0)+'px;--x:'+(sd*Math.cos(a)*r).toFixed(0)+'px;--y:'+(Math.sin(a)*r).toFixed(0)+'px;--r:'+rnd(-540,540).toFixed(0)+'deg;width:8px;height:5px;border-radius:1px;background:'+C[k%C.length])}}
  else if(n===2){for(let k=0;k<18;k++){const sd=k%2?1:-1;piece('--an:wdFall;--d:'+rnd(1,1.4).toFixed(2)+'s;--dl:'+rnd(0,.55).toFixed(2)+'s;--x:'+(sd*rnd(hw+8,hw+46)).toFixed(0)+'px;--y:'+rnd(6,30).toFixed(0)+'px;--r:'+(360*Math.round(rnd(1,3)))+'deg;width:12px;height:12px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#FFF2B8,#FFC93C 45%,#C98A12);box-shadow:0 0 0 1px #8A5A10')}}
  else if(n===3){const x=-(hw+24);piece('--an:wdRise;--d:1.9s;left:'+x+'px;top:16px;width:38px;height:38px;filter:drop-shadow(0 0 10px rgba(255,211,107,.8))','<img alt="" src="data:image/svg+xml,'+encodeURIComponent(WINS[2][2])+'" style="width:100%;height:100%">');
    for(let k=0;k<12;k++){const a=rnd(0,Math.PI*2),r=rnd(22,40);piece('--an:wdBurst;--d:1.1s;--dl:'+rnd(.25,.6).toFixed(2)+'s;left:'+x+'px;top:-14px;--x:'+(Math.cos(a)*r).toFixed(0)+'px;--y:'+(Math.sin(a)*r).toFixed(0)+'px;--r:0deg;width:5px;height:5px;border-radius:50%;background:#FFF2B8;box-shadow:0 0 6px #FFD36B')}}
  else if(n===4){const C=['#FF4F8B','#3FD2FF','#FFD23F'];
    for(let b=0;b<3;b++){const sd=b===1?1:-1,cx=sd*rnd(hw+14,hw+40),cy=rnd(-36,6),dl=b*.3;
      for(let k=0;k<16;k++){const a=k*Math.PI*2/16,r=rnd(20,28);piece('--an:wdBurst;--d:1s;--dl:'+dl+'s;left:'+cx.toFixed(0)+'px;top:'+cy.toFixed(0)+'px;--x:'+(Math.cos(a)*r).toFixed(0)+'px;--y:'+(Math.sin(a)*r).toFixed(0)+'px;--r:0deg;width:5px;height:5px;border-radius:50%;background:'+C[b]+';box-shadow:0 0 6px '+C[b])}}}
  else if(n===5){const x=-(hw+26);piece('--an:wdPop;--d:1.9s;left:'+x+'px;top:0;width:42px;height:42px;filter:drop-shadow(0 0 8px rgba(255,201,60,.7))','<img alt="" src="data:image/svg+xml,'+encodeURIComponent(WINS[4][2])+'" style="width:100%;height:100%">');
    for(let k=0;k<18;k++){const a=rnd(-Math.PI*.95,-Math.PI*.05),r=rnd(26,56);piece('--an:wdBurst;--d:1.3s;--dl:'+rnd(.25,.6).toFixed(2)+'s;left:'+x+'px;top:-8px;--x:'+(Math.cos(a)*r).toFixed(0)+'px;--y:'+(Math.sin(a)*r*.8).toFixed(0)+'px;--r:'+rnd(-360,360).toFixed(0)+'deg;width:9px;height:9px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#FFF2B8,#FFC93C 45%,#C98A12);box-shadow:0 0 0 1px #8A5A10')}}
  fx.innerHTML=h;el.appendChild(fx);setTimeout(()=>fx.remove(),2600);
}

// =====================================================================
//  The Wardrobe screen
// =====================================================================
const TABS=[['seat','Seat looks','Shown in your seat\'s circle for everyone at the table, on your own colour.'],
  ['back','Card backs','Your face-down cards, as everyone else sees them. Card faces never change.'],
  ['felt','Felts','The table on your own screen. Only you see it.'],
  ['win','Win flourishes','Plays round your seat when you win a pot, for everyone at the table.']];
const NONE=['Your initial','Classic back','Classic green','No flourish'];
let tab=0,built=false,isOpen=false;
const T=s=>window.BackRoomLang?BackRoomLang.t(s):s;
function feltStyle(f){if(!f)return '--felt-1:#178257;--felt-2:#0d5a3b;--felt-3:#063321';const c=FELTS[f-1][2];return '--felt-1:'+c[0]+';--felt-2:'+c[1]+';--felt-3:'+c[2]}
function feltPat(f){return f&&FELTS[f-1][3]?'<i style="background:'+FELTS[f-1][3]+'"></i>':''}
function avBox(n){const c=A.AVC[A.myAv]||'#e8b04a',ini=(A.myName||'Y').trim().charAt(0).toUpperCase()||'Y';return '<div class="av" style="background:'+c+'">'+(n?avHTML(n):A.esc(ini))+'</div>'}
function pic(s,n){
  if(s===0)return avBox(n);
  if(s===1)return A.cardHTML(-1,backCls(n),'');
  if(s===2)return '<div class="sw" style="'+feltStyle(n)+'">'+feltPat(n)+'</div>';
  return n?'<img alt="" src="data:image/svg+xml,'+encodeURIComponent(WINS[n-1][2])+'">':'<span style="font:800 26px var(--f-u);color:var(--ink-3)">–</span>';
}
function build(){
  if(built)return;built=true;
  const sec=document.createElement('section');sec.id='wd';sec.className='overlay center';sec.hidden=true;
  sec.innerHTML='<div class="wd-card" role="dialog" aria-modal="true" aria-labelledby="wdTitle"><div class="wd-head"><h2 id="wdTitle">Wardrobe</h2><button class="ghost" id="wdDone" type="button">Done</button></div>'+
    '<p class="wd-sub">Captains only for now. Everything is free to wear, and only changes how your seat looks.</p>'+
    '<div class="wd-body"><div class="wd-prev"><div class="wd-felt" id="wdFelt"></div><small>Your seat, as the table sees it</small><button class="ghost" id="wdPlay" type="button" hidden>Play flourish</button></div>'+
    '<div class="wd-pick"><div class="wd-tabs" id="wdTabs" role="group" aria-label="Wardrobe sections">'+TABS.map((t,i)=>'<button type="button" data-t="'+i+'">'+t[1]+'</button>').join('')+'</div>'+
    '<p class="wd-note" id="wdNote"></p><div class="wd-grid" id="wdGrid"></div></div></div></div>';
  $('app').appendChild(sec);
  $('wdDone').onclick=close;sec.addEventListener('pointerdown',e=>{if(e.target===sec)close()});
  sec.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close()}});
  for(const b of $('wdTabs').children)b.onclick=()=>{tab=+b.dataset.t;fill()};
  $('wdPlay').onclick=()=>flourish($('wdFelt').querySelector('.seat'),kit[3]);
}
function preview(){
  const f=kit[2],ini=(A.myName||'You');
  $('wdFelt').innerHTML='<div class="cl" style="'+feltStyle(f)+'">'+feltPat(f)+'</div><div class="seat"><div class="hole">'+A.cardHTML(-1,backCls(kit[1]),'')+A.cardHTML(-1,backCls(kit[1]),'')+'</div>'+
    '<div class="plate">'+avBox(kit[0])+'<div class="meta"><b data-noi18n>'+A.esc(ini)+'</b><span>2,000</span></div></div></div>';
  $('wdPlay').hidden=!kit[3];
}
function fill(){
  for(const b of $('wdTabs').children)b.setAttribute('aria-pressed',String(+b.dataset.t===tab));
  $('wdNote').textContent=TABS[tab][2];
  const L=LISTS[tab],g=$('wdGrid');let h='';
  for(let n=0;n<=L.length;n++)h+='<button type="button" data-n="'+n+'" aria-pressed="'+(kit[tab]===n)+'"><span class="wd-pic">'+pic(tab,n)+'</span><span>'+A.esc(n?L[n-1][0]:NONE[tab])+'</span>'+(n?'<em class="r-'+L[n-1][1]+'">'+A.esc(L[n-1][1][0].toUpperCase()+L[n-1][1].slice(1))+'</em>':'')+'</button>';
  g.innerHTML=h;
  for(const b of g.children)b.onclick=()=>choose(+b.dataset.n);
}
function choose(n){
  kit[tab]=n;A.store.set('wardrobe',kit.slice());fill();preview();
  if(tab===3&&n)flourish($('wdFelt').querySelector('.seat'),n);
  A.changed();
}
function open(){
  if(!A.wardOn())return;build();isOpen=true;$('wd').hidden=false;fill();preview();
  setTimeout(()=>{const b=$('wdGrid').querySelector('[aria-pressed="true"]')||$('wdDone');try{b.focus({preventScroll:true})}catch(e){}},0);
}
function close(){if(!isOpen)return;isOpen=false;$('wd').hidden=true;const b=$('wdOpen');if(b)try{b.focus()}catch(e){}}
// the menu button (only while wardOn()), the felt; called by the page whenever wardOn() may have changed
function sync(){
  let b=$('wdOpen');
  if(A.wardOn()){
    if(!b){b=document.createElement('button');b.id='wdOpen';b.type='button';b.className='ghost';b.textContent='Wardrobe';b.onclick=open;
      const f=$('name').closest('.field');f.appendChild(b)}
    b.hidden=false;
  }else{if(b)b.hidden=true;close()}
  applyFelt();
}
sync();
return{mine,wire,parse,avHTML,backCls,flourish,sync,open,close,LISTS,SLOTS,get kit(){return kit.slice()},
  wear(slot,n){const i=SLOTS.indexOf(slot);if(i<0)return;kit[i]=n>0&&n<=LISTS[i].length?n:0;A.store.set('wardrobe',kit.slice());if(built&&isOpen){fill();preview()}A.changed()}};
};
