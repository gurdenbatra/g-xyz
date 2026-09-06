#!/usr/bin/env bash
# Convert a GIF (or any video) into a small, pausable WebM + MP4 pair with a
# poster, ready for a project's `media:` gallery. GIFs are huge and can't be
# paused for prefers-reduced-motion; video fixes both.
#
#   scripts/gif2video.sh <project-slug> <input.gif|.mov|.mp4> [name]
#
# Writes: public/media/projects/<slug>/<name>.webm, <name>.mp4
#         src/assets/projects/<slug>/<name>-poster.webp   (optimised by Astro)
# and prints the frontmatter to paste into src/content/projects/<slug>.mdx.
set -euo pipefail
slug="${1:?project slug}"; in="${2:?input gif/video}"; name="${3:-$(basename "${in%.*}")}"
pub="public/media/projects/$slug"; assets="src/assets/projects/$slug"
mkdir -p "$pub" "$assets"
# even dimensions required by h264; cap width at 1600 for weight
scale='scale=min(1600\,iw):-2'
ffmpeg -v error -y -i "$in" -vf "$scale,fps=24" -c:v libvpx-vp9 -b:v 0 -crf 34 -an "$pub/$name.webm"
ffmpeg -v error -y -i "$in" -vf "$scale,fps=24" -c:v libx264 -pix_fmt yuv420p -crf 26 -movflags +faststart -an "$pub/$name.mp4"
ffmpeg -v error -y -i "$in" -vf "$scale" -frames:v 1 "$assets/$name-poster.png"
if command -v node >/dev/null; then
  node -e "require('sharp')('$assets/$name-poster.png').webp({quality:82}).toFile('$assets/$name-poster.webp').then(()=>require('fs').unlinkSync('$assets/$name-poster.png'))" \
    && poster="$name-poster.webp" || poster="$name-poster.png"
else poster="$name-poster.png"; fi
du -h "$pub/$name.webm" "$pub/$name.mp4" | sed 's/^/  /'
cat <<YAML

Paste into src/content/projects/$slug.mdx frontmatter (under \`media:\`):

media:
  - kind: video
    src: /media/projects/$slug/$name.webm
    poster: ../../assets/projects/$slug/$poster
    alt: "Describe what the clip shows"
    caption: "Optional caption"
YAML
