#!/usr/bin/env bash
# Brings the published site back up: runs the backend against Atlas, opens a
# Cloudflare tunnel to it, and redeploys the frontend pointed at that tunnel.
# The tunnel hostname is random per run, hence the rebuild every time.
set -euo pipefail

SCRATCH="/tmp/claude-1000/-home-abdelrahman-elsayed-prayer-project/177753e4-59cd-4e43-bd2b-ee2c2cb1db28/scratchpad"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

for f in local-run.env vercel_token.txt cloudflared; do
  [ -e "$SCRATCH/$f" ] || { echo "missing $SCRATCH/$f — secrets live in the session scratchpad and are gone; re-create them before running this"; exit 1; }
done

echo "==> backend on :3000 (Atlas)"
cd "$ROOT/Backend/back"
npm run build
node --env-file="$SCRATCH/local-run.env" dist/main > "$SCRATCH/backend.log" 2>&1 &
sleep 10
curl -sf -o /dev/null http://localhost:3000/ || { echo "backend did not come up — see $SCRATCH/backend.log"; exit 1; }

echo "==> tunnel"
: > "$SCRATCH/tunnel.log"
"$SCRATCH/cloudflared" tunnel --url http://localhost:3000 --no-autoupdate > "$SCRATCH/tunnel.log" 2>&1 &
for _ in $(seq 1 30); do
  URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$SCRATCH/tunnel.log" | head -1 || true)
  [ -n "${URL:-}" ] && break
  sleep 2
done
[ -n "${URL:-}" ] || { echo "tunnel gave no URL — see $SCRATCH/tunnel.log"; exit 1; }
echo "    $URL"

echo "==> frontend -> Vercel"
cd "$ROOT/Frontend/front"
npx --yes vercel@latest deploy --prod --yes --archive=tgz \
  --build-env VITE_API_URL="$URL" \
  --token="$(cat "$SCRATCH/vercel_token.txt")" > /dev/null

echo
echo "live: https://prayer-teacher.vercel.app"
echo "stop with: pkill -f 'node --env-file'; pkill -f 'cloudflared tunnel'"
