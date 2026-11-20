#!/bin/bash
# pen.sh [kind] : hand vertices inside each weapon in the hold, aim and fire poses (needs the server on $PORT)
. "$(dirname "$0")/env.sh"
kind=${1:-hero}
for w in rifleScoped smg pistol enemyRifle mg; do
  for u in hold aim fire; do
    case "$w:$u" in
      pistol:hold) up=holdPistol ;; pistol:aim) up=aimPistol ;; pistol:fire) up=firePistol ;;
      *:hold) up=holdRifle ;; *:aim) up=aimIdle ;; *:fire) up=fire ;;
    esac
    r=$(timeout 200 node "$HERE/shot.js" "$CHARS_OUT/pen.png" "/e63334287a3deaa3/ironveil/chars-test.html?shot=1&kind=$kind&anim=idle&upper=$up&t=0.6&weapon=$w&pen=1" 300 300 2>&1 | grep -o '"pen":{[^}]*}')
    echo "$w $u $r"
  done
done
