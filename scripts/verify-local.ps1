param()
$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$projectRoot = Split-Path -Parent $PSScriptRoot
$python = Join-Path $projectRoot "backend/.venv/Scripts/python.exe"
if (!(Test-Path -LiteralPath $python)) {
    throw "Creare backend/.venv e installare requirements.txt come descritto in docs/development.md."
}
Push-Location $projectRoot
try {
    docker compose --profile test up -d --wait db-test
    if ($LASTEXITCODE -ne 0) { throw "Database di test non disponibile." }
    Push-Location (Join-Path $projectRoot "backend")
    try {
        & $python -m pytest -q
        if ($LASTEXITCODE -ne 0) { throw "Test backend falliti." }
    } finally { Pop-Location }
    Push-Location (Join-Path $projectRoot "frontend")
    try {
        foreach ($task in @("lint", "test", "build")) {
            npm run $task
            if ($LASTEXITCODE -ne 0) { throw "Frontend: $task fallito." }
        }
    } finally { Pop-Location }
} finally { Pop-Location }
