# Shared paths for the build scripts. Override any of these in the environment.
#   CHARS_WORK   : working folder holding the downloaded sources (dl_mpfb, dl_mh, dl_ual, cmu), bvenv and out/
#   CHARS_ASSETS : the game's assets folder that pack.sh writes into
#   CHARS_OUT    : where videos, sheets and measurement JSON go
HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
: "${CHARS_WORK:=$HERE/../work}"
if [ -z "$CHARS_ASSETS" ]; then
  if [ -d "$HERE/../../assets" ]; then CHARS_ASSETS=$(cd "$HERE/../../assets" && pwd)
  else echo "set CHARS_ASSETS to the game's assets folder" >&2; exit 1; fi
fi
: "${CHARS_OUT:=$HERE/../evidence}"
: "${PORT:=8981}"
export CHARS_WORK CHARS_ASSETS CHARS_OUT PORT HERE
