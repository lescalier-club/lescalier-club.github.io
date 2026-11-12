#!/bin/bash
# La montée de L'Escalier : 6 vidéos Seedance 2.0 enchaînées (architecture A de scroll-world),
# rendues via Monid (paiement à la vidéo). Chaque vidéo démarre sur la DERNIÈRE image réelle
# de la précédente : coutures invisibles, la caméra ne recule jamais.
#
# Usage :  bash montee.sh [16:9|9:16] [720p|480p]
#   16:9 = ordinateur (départ : scenes/scene_1.jpg)   9:16 = téléphone (départ : scenes/scene_1_vertical.jpg)
# Reprise automatique : une vidéo déjà téléchargée n'est jamais refaite (ni repayée).
set -u
RATIO="${1:-16:9}"; VRES="${2:-720p}"; DUR=8
ICI="$(cd "$(dirname "$0")" && pwd)"
if [ "$RATIO" = "9:16" ]; then SUF="-m"; DEPART="$ICI/scenes/scene_1_vertical.jpg"; else SUF=""; DEPART="$ICI/scenes/scene_1.jpg"; fi
WORK="$ICI/videos/brut$SUF"; mkdir -p "$WORK"
LOG="$ICI/videos/montee$SUF.log"
say() { echo "$(date '+%H:%M:%S') $*" | tee -a "$LOG"; }

command -v monid >/dev/null || { say "ERREUR : monid introuvable"; exit 1; }
[ -f "$DEPART" ] || { say "ERREUR : image de départ manquante ($DEPART)"; exit 1; }
# Coût estimé : w*h*24*s/1024 tokens à 7 $/M (720p) ; 6 vidéos de 8 s
case "$VRES" in 720p) PX=921600; [ "$RATIO" = "9:16" ] && PX=921600 ;; 480p) PX=409920 ;; *) PX=921600 ;; esac
EST=$(python3 -c "print(round(6*$PX*24*$DUR/1024*7/1e6,2))")
SOLDE=$(NO_COLOR=1 monid balance -j 2>/dev/null | jq -r '.balance // .available // .amount // empty' 2>/dev/null)
say "Montée $RATIO $VRES : coût estimé ~$EST \$ (hors vidéos à refaire). Solde Monid : ${SOLDE:-inconnu}"
if [ -n "$SOLDE" ] && python3 -c "import sys; sys.exit(0 if float('$SOLDE') >= $EST else 1)"; then :; elif [ -n "$SOLDE" ]; then say "STOP : solde insuffisant"; exit 2; fi

monid_frame_url() { # imageLocale nomDistant -> URL publique signée (gratuit)
  jpg="$WORK/sfs_$2.jpg"
  ffmpeg -v error -y -i "$1" -vf "scale='min(1536,iw)':-2" -q:v 2 "$jpg"
  size=$(stat -f%z "$jpg")
  up=$(NO_COLOR=1 monid run -p sfs -e /put -i "{\"path\":\"escalier/$2.jpg\",\"sizeBytes\":$size,\"ttl\":\"1h\"}" -w 60 -j | jq -r '.output.uploadUrl')
  curl -fsS -T "$jpg" "$up" > /dev/null
  NO_COLOR=1 monid run -p sfs -e /cat -i "{\"path\":\"escalier/$2.jpg\",\"ttl\":\"1d\"}" -w 60 -j | jq -r '.output.url'
}
monid_wait() { # runId sortieJson
  while :; do
    NO_COLOR=1 monid runs get -r "$1" -j > "$2" 2>/dev/null
    case "$(jq -r '.status // empty' "$2")" in COMPLETED|FAILED|BLOCKED|STOPPED|TIME_OUT) break ;; esac
    sleep 8
  done
}

DEBUT="$DEPART"; TOTAL=0
i=1
while [ $i -le 6 ]; do
  OUT="$WORK/leg_$i.mp4"
  if [ ! -s "$OUT" ]; then
    essai=1
    while [ $essai -le 3 ] && [ ! -s "$OUT" ]; do
      say "Montée $i, essai $essai : envoi"
      url=$(monid_frame_url "$DEBUT" "leg${i}_debut${SUF}")
      jq -n --arg p "$(cat "$ICI/prompts/leg_$i.txt")" --arg u "$url" --arg r "$VRES" --arg ra "$RATIO" \
        '{content:[{type:"text",text:$p},{type:"image_url",image_url:{url:$u},role:"first_frame"}],
          resolution:$r, duration:'"$DUR"', ratio:$ra, generate_audio:false}' > "$WORK/leg_$i.body.json"
      rid=$(NO_COLOR=1 monid run -p bytedance -e /v1/video/seedance-2.0 -f "$WORK/leg_$i.body.json" -j | jq -r '.runId')
      monid_wait "$rid" "$WORK/leg_$i.json"
      st=$(jq -r '.status' "$WORK/leg_$i.json"); cout=$(jq -r '.cost.value // 0' "$WORK/leg_$i.json")
      vurl=$(jq -r '.output.content.video_url // empty' "$WORK/leg_$i.json")
      if [ -n "$vurl" ]; then curl -fsSL "$vurl" -o "$OUT"; say "Montée $i OK (coût $cout \$)"; else say "Montée $i : échec ($st, coût $cout \$)"; fi
      [ "$st" = "BLOCKED" ] && { say "STOP : budget Monid bloqué"; exit 3; }
      essai=$((essai+1))
    done
    [ -s "$OUT" ] || { say "STOP : montée $i impossible après 3 essais"; exit 4; }
  else say "Montée $i déjà faite, reprise"; fi
  # La suivante démarre sur la dernière image réelle de celle-ci
  ffmpeg -v error -y -sseof -0.08 -i "$OUT" -frames:v 1 -q:v 2 "$WORK/leg_${i}_fin.png"
  ffmpeg -v error -y -i "$OUT" -frames:v 1 -q:v 2 "$WORK/leg_${i}_debut.jpg"
  DEBUT="$WORK/leg_${i}_fin.png"
  i=$((i+1))
done

# Encodage pour un scroll fluide (taille native, GOP court ; mobile : 720 de large, GOP 4)
mkdir -p "$ICI/videos/final" "$ICI/assets"
i=1
while [ $i -le 6 ]; do
  if [ -z "$SUF" ]; then
    ffmpeg -v error -y -i "$WORK/leg_$i.mp4" -an -vf "unsharp=5:5:0.8:5:5:0.0" -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -g 8 -keyint_min 8 -sc_threshold 0 -movflags +faststart "$ICI/videos/final/leg_$i.mp4"
  else
    ffmpeg -v error -y -i "$WORK/leg_$i.mp4" -an -vf "scale=720:-2,unsharp=5:5:0.6:5:5:0.0" -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p -g 4 -keyint_min 4 -sc_threshold 0 -movflags +faststart "$ICI/videos/final/leg_$i-m.mp4"
  fi
  cp "$WORK/leg_${i}_debut.jpg" "$ICI/assets/poster_$i$SUF.jpg"   # affiche = 1re image réelle de la vidéo
  i=$((i+1))
done
say "Terminé : vidéos dans videos/final, affiches dans assets/. Solde : $(NO_COLOR=1 monid balance 2>/dev/null | tr '\n' ' ')"
