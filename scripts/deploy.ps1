param(
    [ValidateSet("preflight", "install", "deploy", "status", "verify", "logs", "backup-db", "rollback", "crea-accesso")]
    [string] $Action = "status",
    [string] $Ref = "origin/main",
    [string] $Release = ""
)
$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$root = Split-Path -Parent $PSScriptRoot
$contractText = Get-Content -Raw -LiteralPath (Join-Path $root "deploy/staging.json")
$contract = $contractText | ConvertFrom-Json
$encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($contractText))
$modules = @("00-base.sh", "20-release.sh", "90-main.sh")
$remoteScript = ($modules | ForEach-Object {
    (Get-Content -Raw -LiteralPath (Join-Path $root "deploy/remote/$_")).Replace("`r`n", "`n")
}) -join "`n"

function Invoke-Remote([string] $Operation, [string] $ReleaseId = "-", [string] $Sha = "-", [string] $ArchiveSha = "-") {
    $remoteScript | & ssh -o BatchMode=yes -o ConnectTimeout=15 $contract.sshHost `
        "sed -e '1s/^\xEF\xBB\xBF//' -e 's/\r$//' | bash -s -- $Operation $encoded $ReleaseId $Sha $ArchiveSha"
    if ($LASTEXITCODE -ne 0) { throw "Operazione remota $Operation fallita. La release non è confermata." }
}

function New-ReleaseArchive {
    $dirty = @(git -C $root status --porcelain --untracked-files=normal)
    if ($LASTEXITCODE -ne 0 -or $dirty.Count -gt 0) {
        throw "Il checkout deve essere pulito. Il deploy usa esclusivamente un commit Git."
    }
    git -C $root fetch origin main
    if ($LASTEXITCODE -ne 0) { throw "Aggiornamento origin/main fallito." }
    $sha = (git -C $root rev-parse --verify "$Ref^{commit}").Trim()
    if ($LASTEXITCODE -ne 0 -or $sha -notmatch '^[a-f0-9]{40}$') { throw "Ref non valida." }
    $releaseId = (Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmmss") + "-" + $sha.Substring(0, 8)
    $temp = Join-Path ([IO.Path]::GetTempPath()) ("eqia-release-" + [guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Path $temp | Out-Null
    $archive = Join-Path $temp "$releaseId.tar.gz"
    git -C $root archive --format=tar.gz "--output=$archive" $sha .dockerignore backend frontend db shared deploy
    if ($LASTEXITCODE -ne 0) { throw "Creazione archivio fallita." }
    return @{Id=$releaseId; Sha=$sha; Path=$archive; Directory=$temp; Hash=(Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()}
}

Push-Location $root
try {
    if ($Action -in @("install", "deploy")) {
        $bundle = New-ReleaseArchive
        try {
            Write-Host "Equia: $($bundle.Id), commit $($bundle.Sha)"
            Invoke-Remote "prepare"
            & scp -o BatchMode=yes -o ConnectTimeout=15 $bundle.Path "$($contract.sshHost):$($contract.base)/incoming/$($bundle.Id).tar.gz"
            if ($LASTEXITCODE -ne 0) { throw "Trasferimento archivio fallito." }
            Invoke-Remote $Action $bundle.Id $bundle.Sha $bundle.Hash
        } finally {
            # Solo l'archivio temporaneo creato da questa esecuzione.
            if (Test-Path -LiteralPath $bundle.Path) { Remove-Item -LiteralPath $bundle.Path }
            if (Test-Path -LiteralPath $bundle.Directory) { Remove-Item -LiteralPath $bundle.Directory }
        }
    } elseif ($Action -eq "rollback") {
        if ($Release -notmatch '^\d{8}-\d{6}-[a-f0-9]{7,12}$') { throw "Specificare -Release con l'identificativo esatto." }
        Invoke-Remote $Action $Release
    } else {
        Invoke-Remote $Action
    }
} finally { Pop-Location }
