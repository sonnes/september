#!/usr/bin/env bash
# Renders the screenshots and the animations of the keyboard page of the web
# app into apps/web/public/keyboard.
#
# The snapshots render off screen with sample text. They open no window and
# read nothing from your apps. The script needs ImageMagick (`magick`) and
# `cwebp` (brew install imagemagick webp).
set -euo pipefail

here="$(cd "$(dirname "$0")/.." && pwd)"
out="${1:-$here/../web/public/keyboard}"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

# The color of the stage behind the media on the page (indigo-50). The media
# use the light appearance of the keyboard.
stage='#eef2ff'

swift build --package-path "$here" --product Keyboard >/dev/null
bin="$(swift build --package-path "$here" --show-bin-path)"
mkdir -p "$out"

# A still: the snapshot on a transparent background, 2000 pixels wide.
still() {
  local name="$1"; shift
  "$bin/Keyboard" --snapshot "$work/$name.png" --light "$@" >/dev/null
  magick "$work/$name.png" -resize 2000x "$work/$name-small.png"
  cwebp -quiet -q 86 -alpha_q 90 "$work/$name-small.png" -o "$out/$name.webp"
}

still type
still talk --talk
still mine --mine
still clipboard --clipboard

# An animated WebP from frames. Each argument after the name and the width is
# "<delay>:<png>". The delay is in hundredths of a second. Each frame goes on
# the stage. The width is twice the width on the page, for Retina screens.
animate() {
  local name="$1" width="$2"; shift 2
  local args=()
  for frame in "$@"; do
    args+=(-delay "${frame%%:*}" "${frame#*:}")
  done
  magick "${args[@]}" -background "$stage" -alpha remove -alpha off \
    -resize "${width}x" -quality 90 -define webp:method=6 -loop 0 "$out/$name.webp"
}

# Type mode: the keyboard types a sentence, and a prediction completes it.
typing=("A" "Ar" "Are" "Are w" "Are we" "Are we st" "Are we still" "Are we still on"
  "Are we still on f" "Are we still on for t")
frames=()
for i in "${!typing[@]}"; do
  "$bin/Keyboard" --snapshot "$work/type-$i.png" --light --typed "${typing[$i]}" >/dev/null
  frames+=("45:$work/type-$i.png")
done
last=$(( ${#typing[@]} - 1 ))
frames[$last]="160:$work/type-$last.png"
"$bin/Keyboard" --snapshot "$work/type-done.png" --light --typed "Are we still on for the match tonight?" >/dev/null
frames+=("250:$work/type-done.png")
animate typing 3200 "${frames[@]}"

# Talk mode: Speak reads the bar aloud, one word at a time.
line="Which Lego set are we building this weekend?"
words=($line)
frames=()
for i in "${!words[@]}"; do
  "$bin/Keyboard" --snapshot "$work/talk-$i.png" --light --talk --spoken "$i" >/dev/null
  frames+=("38:$work/talk-$i.png")
done
frames[0]="120:$work/talk-0.png"
frames[$(( ${#words[@]} - 1 ))]="200:$work/talk-$(( ${#words[@]} - 1 )).png"
animate speaking 2800 "${frames[@]}"

# The Write paper: the paper grows up out of the bar, one line at a time, as
# the document gets longer. The snapshot draws the paper as the keyboard does,
# and the bar shows the line at the caret. Each frame sits at the bottom of the
# same canvas.
doc=(
  "# The Dragon Who Could Not Roar"
  ""
  "Every morning, Ember climbed the hill and tried to roar."
  "- On Monday, a hiccup came out."
  "- On Tuesday, a bigger hiccup."
  "- On Wednesday, a **tiny spark**."
  ""
  "On Thursday, the whole village heard him laugh."
)
frames=()
for n in $(seq 1 "${#doc[@]}"); do
  line="${doc[$((n - 1))]}"
  [[ -z "$line" ]] && continue
  printf '%s\n' "${doc[@]:0:$n}" >"$work/paper-$n.md"
  # The bar shows the text of the line, without the Markdown marks.
  plain="$(printf '%s' "$line" | sed -e 's/^# //' -e 's/^- //' -e 's/\*\*//g')"
  "$bin/Keyboard" --snapshot "$work/paper-$n.png" --light --write --paper "$work/paper-$n.md" \
    --typed "$plain" >/dev/null
  frames+=("80:$work/paper-$n.png")
done
end=$(( ${#frames[@]} - 1 ))
frames[$end]="300:${frames[$end]#*:}"
size=$(magick identify -format '%wx%h' "${frames[$end]#*:}")
for frame in "${frames[@]}"; do
  magick "${frame#*:}" -background none -gravity south -extent "$size" "${frame#*:}"
done
animate writing 3200 "${frames[@]}"
# The whole document, for a reader who turns animations off.
magick "${frames[$end]#*:}" -resize 3200x "$work/paper.png"
cwebp -quiet -q 86 -alpha_q 90 "$work/paper.png" -o "$out/paper.webp"

ls -lh "$out"
