#!/usr/bin/env bash
# Assemble Vercel output: StoryLens static site at / plus built CHItest at /chitest/.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${ROOT}/.vercel-dist"

rm -rf "${OUT}"
mkdir -p "${OUT}"

copy_static() {
  if command -v rsync >/dev/null 2>&1; then
    rsync -a \
      --exclude '.git/' \
      --exclude '.vercel/' \
      --exclude '.vercel-dist/' \
      --exclude 'api/' \
      --exclude '.env' \
      --exclude '.env.*' \
      --exclude 'CHItest/' \
      --exclude 'node_modules/' \
      --exclude '.cursor/' \
      "${ROOT}/" "${OUT}/"
    return
  fi
  tar -C "${ROOT}" \
    --exclude='.git' \
    --exclude='.vercel' \
    --exclude='.vercel-dist' \
    --exclude='api' \
    --exclude='.env' \
    --exclude='CHItest' \
    --exclude='node_modules' \
    --exclude='.cursor' \
    -cf - . | tar -C "${OUT}" -xf -
}

copy_static

cd "${ROOT}/CHItest"
if [ ! -d node_modules/vite ]; then
  npm ci
fi
npm run build

mkdir -p "${OUT}/chitest"
cp -a dist/. "${OUT}/chitest/"

if ! grep -q '/chitest/assets/' "${OUT}/chitest/index.html"; then
  echo "CHItest build is missing /chitest/ asset prefix" >&2
  exit 1
fi

echo "Vercel output ready at ${OUT} (CHItest -> /chitest/)"
