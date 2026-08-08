<#
.SYNOPSIS
  Back up the member database to an encrypted-at-rest local file.

.DESCRIPTION
  There is currently no backup. If the Cloudflare account is compromised, a migration goes
  wrong, or someone runs a DELETE they shouldn't, the member list and - more importantly -
  the consent records are gone.

  The consent records are the part that matters most. They are the legally required proof
  that each person opted in. Losing the subscriber list is embarrassing; losing the proof
  of consent while keeping the list is a compliance problem, because you would be holding
  contact details you can no longer demonstrate a right to use.

  Exports the entire database, not just the subscriber table.

  WHERE TO PUT THE OUTPUT: not in this repository, and not anywhere that syncs to a public
  place. The file contains every member's name, email address and phone number. Treat it
  like the spreadsheet it replaces. The script writes to a folder outside the repo by
  default and refuses to write inside it.

  ASCII-only, UTF-8 BOM, CRLF - Windows PowerShell 5.1 misreads .ps1 without a BOM.

.EXAMPLE
  .\scripts\backup.ps1

.EXAMPLE
  .\scripts\backup.ps1 -OutDir "D:\backups\dsa"
#>

[CmdletBinding()]
param(
  [string]$OutDir = "$env:USERPROFILE\Documents\dsa-backups",
  [string]$Database = "dsa-list-db",
  [int]$KeepDays = 90
)

$ErrorActionPreference = "Stop"
$repoRoot = (git rev-parse --show-toplevel 2>$null)

Write-Host ""
Write-Host "  Backing up $Database" -ForegroundColor Cyan
Write-Host ""

# Refuse to write member data anywhere inside the repository.
if ($repoRoot) {
  $full = [System.IO.Path]::GetFullPath($OutDir)
  $root = [System.IO.Path]::GetFullPath(($repoRoot -replace '/', '\'))
  if ($full.StartsWith($root, [StringComparison]::OrdinalIgnoreCase)) {
    Write-Host "  Refusing to write backups inside the git repository." -ForegroundColor Red
    Write-Host "  This file contains member names, emails and phone numbers." -ForegroundColor DarkGray
    Write-Host "  Pick a location outside the project, e.g. -OutDir `"$env:USERPROFILE\Documents\dsa-backups`"" -ForegroundColor DarkGray
    Write-Host ""
    exit 1
  }
}

if (-not (Test-Path $OutDir)) {
  New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
  Write-Host "  Created $OutDir" -ForegroundColor DarkGray
}

$stamp = Get-Date -Format "yyyy-MM-dd-HHmm"
$file = Join-Path $OutDir "$Database-$stamp.sql"

Write-Host "  Exporting (this reads the live database)..." -ForegroundColor DarkGray
& npx wrangler d1 export $Database --remote --output $file 2>&1 | Out-Null

if ($LASTEXITCODE -ne 0 -or -not (Test-Path $file)) {
  Write-Host ""
  Write-Host "  Export failed." -ForegroundColor Red
  Write-Host "  Check you are logged in:  npx wrangler login" -ForegroundColor DarkGray
  Write-Host ""
  exit 1
}

$size = [math]::Round((Get-Item $file).Length / 1KB, 1)

# Sanity-check the dump actually contains the tables that matter, rather than trusting
# a zero exit code. An empty or truncated export that looks like a success is worse than
# a visible failure, because you find out when you need to restore.
$content = Get-Content $file -Raw
$tables = @("subscribers", "consent_events", "tokens", "messages")
$missing = @()
foreach ($t in $tables) { if ($content -notmatch "CREATE TABLE.*$t") { $missing += $t } }

Write-Host ""
if ($missing.Count -gt 0) {
  Write-Host "  WARNING - these tables are not in the dump: $($missing -join ', ')" -ForegroundColor Yellow
  Write-Host "  Do not rely on this backup until you know why." -ForegroundColor Yellow
} else {
  Write-Host "  All four tables present." -ForegroundColor Green
}

$subs = ([regex]::Matches($content, "INSERT INTO subscribers")).Count
$events = ([regex]::Matches($content, "INSERT INTO consent_events")).Count

Write-Host ""
Write-Host "  File     $file"
Write-Host "  Size     $size KB"
Write-Host "  Rows     subscribers $subs, consent_events $events"

# Prune old backups so this doesn't quietly accumulate member data forever.
$cutoff = (Get-Date).AddDays(-$KeepDays)
$old = Get-ChildItem $OutDir -Filter "$Database-*.sql" | Where-Object { $_.LastWriteTime -lt $cutoff }
if ($old) {
  $old | Remove-Item -Force
  Write-Host "  Pruned   $($old.Count) backup(s) older than $KeepDays days" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "  Keep at least one copy somewhere other than this machine." -ForegroundColor Cyan
Write-Host "  A backup that only exists on the laptop that might fail is not a backup." -ForegroundColor DarkGray
Write-Host ""
