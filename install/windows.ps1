$ErrorActionPreference = "Stop"

$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..")

function Test-Command {
  param([string]$Name)
  return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Test-Node20 {
  if (-not (Test-Command "node")) { return $false }
  $major = node -p "process.versions.node.split('.')[0]"
  return [int]$major -ge 20
}

if (-not (Test-Command "winget")) {
  throw "winget es requerido para instalar Node.js y Google Chrome automaticamente en Windows."
}

if (-not (Test-Node20)) {
  Write-Host "[install] Instalando Node.js LTS"
  winget install --id OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements
}

if (-not (Test-Command "chrome")) {
  Write-Host "[install] Instalando Google Chrome"
  winget install --id Google.Chrome -e --accept-package-agreements --accept-source-agreements
}

Write-Host "[install] Instalando pnpm y pm2 globalmente"
npm install -g pnpm pm2

Write-Host "[install] Instalando dependencias del SDK"
Set-Location $RootDir
$env:PUPPETEER_SKIP_DOWNLOAD = "true"
pnpm install

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
}

Write-Host "[install] Verificando proyecto"
pnpm run check
pnpm test

Write-Host "[install] Listo. Usa: pnpm run start"
