#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_MAJOR_REQUIRED=20

has_node_20() {
  command -v node >/dev/null 2>&1 && [ "$(node -p "process.versions.node.split('.')[0]")" -ge "$NODE_MAJOR_REQUIRED" ]
}

echo "[install] Instalando dependencias base"
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

if ! has_node_20; then
  echo "[install] Instalando Node.js ${NODE_MAJOR_REQUIRED}.x"
  curl -fsSL https://deb.nodesource.com/setup_${NODE_MAJOR_REQUIRED}.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

if ! command -v google-chrome >/dev/null 2>&1; then
  echo "[install] Instalando Google Chrome estable"
  curl -fsSL https://dl.google.com/linux/linux_signing_key.pub | sudo gpg --dearmor -o /usr/share/keyrings/google-linux-signing-keyring.gpg
  echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-linux-signing-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list >/dev/null
  sudo apt-get update
  sudo apt-get install -y google-chrome-stable
fi

echo "[install] Instalando pnpm y pm2 globalmente"
sudo npm install -g pnpm pm2

echo "[install] Instalando dependencias del SDK"
cd "$ROOT_DIR"
export PUPPETEER_SKIP_DOWNLOAD=true
pnpm install

if [ ! -f .env ]; then
  cp .env.example .env
fi

echo "[install] Verificando proyecto"
pnpm run check
pnpm test

echo "[install] Listo. Usa: pnpm run start"
