<#
.SYNOPSIS
  Check why confirmation emails or texts are not sending.

.DESCRIPTION
  Prompts for ADMIN_TOKEN with masked input, so the token never appears on the command
  line and never lands in PowerShell's history file. Calls /api/admin/diagnostics and
  prints a readable summary.

  Why that matters: PowerShell records every command you type to
    $env:APPDATA\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt
  in plaintext, permanently, with no expiry, and that file gets swept up by backup and
  sync tools. A token pasted inline sits there until someone deletes it. Typed at a
  masked prompt instead, it is never recorded and never shown on screen.

  This file is deliberately ASCII-only and saved with a UTF-8 BOM. Windows PowerShell
  5.1 reads .ps1 files as Windows-1252 when there is no BOM, which corrupts any
  multi-byte character and produces confusing "string is missing the terminator" errors
  far from the real cause. Keep it that way: no em dashes, no curly quotes.

.EXAMPLE
  .\scripts\diagnose.ps1

.EXAMPLE
  .\scripts\diagnose.ps1 -Url https://your-worker.workers.dev
#>

[CmdletBinding()]
param(
  [string]$Url = "https://dsacentralpa.org"
)

Write-Host ""
Write-Host "  Diagnostics for $Url" -ForegroundColor Cyan
Write-Host "  Paste your ADMIN_TOKEN. It will not be shown or saved." -ForegroundColor DarkGray
Write-Host ""

$secure = Read-Host "  ADMIN_TOKEN" -AsSecureString
if (-not $secure -or $secure.Length -eq 0) {
  Write-Host ""
  Write-Host "  No token entered. Nothing to do." -ForegroundColor Yellow
  Write-Host ""
  exit 1
}

# Unwrap only for the moment the request is made, then clear it.
$cred  = New-Object System.Net.NetworkCredential("", $secure)
$token = $cred.Password
$headers = @{ Authorization = "Bearer $token" }
$endpoint = "$Url/api/admin/diagnostics"

$r = $null
try {
  $r = Invoke-RestMethod -Uri $endpoint -Headers $headers -Method Get -ErrorAction Stop
}
catch {
  $code = 0
  if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
  Write-Host ""
  if ($code -eq 401) {
    Write-Host "  401 Unauthorized - that token does not match." -ForegroundColor Red
    Write-Host ""
    Write-Host "  Cloudflare secrets cannot be read back, by design. If you did not save it" -ForegroundColor DarkGray
    Write-Host "  when you set it, it is not recoverable. Set a new one:" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "    npx wrangler secret put ADMIN_TOKEN" -ForegroundColor White
    Write-Host "    npm run deploy" -ForegroundColor White
    Write-Host ""
    Write-Host "  Generate one with:" -ForegroundColor DarkGray
    Write-Host "    python -c 'import secrets;print(secrets.token_hex(32))'" -ForegroundColor White
    Write-Host "  Then store it in a password manager. The second admin needs the same value." -ForegroundColor DarkGray
  }
  elseif ($code -eq 404) {
    Write-Host "  404 - the diagnostics endpoint is not deployed yet." -ForegroundColor Red
    Write-Host "  Run: npm run deploy" -ForegroundColor White
  }
  else {
    Write-Host "  Request failed: $($_.Exception.Message)" -ForegroundColor Red
  }
  Write-Host ""
}
finally {
  # Do not leave the plaintext token sitting in the session.
  $token = $null
  $cred = $null
  $headers = $null
  [System.GC]::Collect()
}

if ($null -eq $r) { exit 1 }

function Show-Flag {
  param($Label, $Ok, $OkText = "set", $BadText = "MISSING")
  if ($Ok) {
    Write-Host ("  [ok]  {0,-32}{1}" -f $Label, $OkText) -ForegroundColor Green
  } else {
    Write-Host ("  [--]  {0,-32}{1}" -f $Label, $BadText) -ForegroundColor Yellow
  }
}

Write-Host ""
Write-Host "  SECRETS" -ForegroundColor Cyan
Show-Flag "RESEND_API_KEY"     $r.secrets.RESEND_API_KEY
Show-Flag "ADMIN_TOKEN"        $r.secrets.ADMIN_TOKEN
Show-Flag "TWILIO_ACCOUNT_SID" $r.secrets.TWILIO_ACCOUNT_SID
Show-Flag "TWILIO_AUTH_TOKEN"  $r.secrets.TWILIO_AUTH_TOKEN
Show-Flag "TWILIO_MSG_SVC_SID" $r.secrets.TWILIO_MESSAGING_SERVICE_SID "set" "not set (fine until A2P clears)"

Write-Host ""
Write-Host "  EMAIL (Resend)" -ForegroundColor Cyan
if ($r.resend.checked -and $r.resend.ok) {
  Write-Host ("        FROM_EMAIL domain: {0}" -f $r.resend.sending_domain_in_from)
  if ($r.resend.domains) {
    foreach ($d in $r.resend.domains) {
      if ($d.status -eq "verified") {
        Write-Host ("        {0,-34}{1}" -f $d.name, $d.status) -ForegroundColor Green
      } else {
        Write-Host ("        {0,-34}{1}" -f $d.name, $d.status) -ForegroundColor Yellow
      }
    }
  } else {
    Write-Host "        no domains registered in Resend" -ForegroundColor Yellow
  }
  Write-Host ""
  if ($r.resend.from_domain_verified) {
    Write-Host ("  -> " + $r.resend.verdict) -ForegroundColor Green
  } else {
    Write-Host ("  -> " + $r.resend.verdict) -ForegroundColor Yellow
  }
}
elseif ($r.resend.checked -and $r.resend.restricted_send_only_key) {
  Write-Host "        API key is send-only, so domain status cannot be read." -ForegroundColor DarkGray
  Write-Host "        That is the correct least-privilege key to use in production." -ForegroundColor DarkGray
  Write-Host ""
  Write-Host ("  -> " + $r.resend.verdict) -ForegroundColor Cyan
  Write-Host ""
  Write-Host "  Run a real test send to settle it:" -ForegroundColor Cyan
  Write-Host "    .\scripts\test-email.ps1 -To you@example.com" -ForegroundColor White
}
elseif ($r.resend.checked) {
  Write-Host ("  Resend API error {0}: {1}" -f $r.resend.status, $r.resend.error) -ForegroundColor Red
  Write-Host ("  -> " + $r.resend.verdict) -ForegroundColor Yellow
}
else {
  Write-Host ("  -> " + $r.resend.verdict) -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  TEXTS (Twilio)" -ForegroundColor Cyan
if ($r.twilio.ready) {
  Write-Host ("  -> " + $r.twilio.note) -ForegroundColor Green
} else {
  Write-Host ("  -> " + $r.twilio.note) -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  DATABASE" -ForegroundColor Cyan
Write-Host ("        subscribers {0}   email pending {1}   email confirmed {2}" -f $r.database.subscribers, $r.database.email_pending, $r.database.email_confirmed)

Write-Host ""
Write-Host "  RECENT SEND FAILURES" -ForegroundColor Cyan
if ($r.recent_send_failures -and @($r.recent_send_failures).Count -gt 0) {
  foreach ($f in $r.recent_send_failures) {
    Write-Host ("        {0}  {1}" -f $f.created_at, $f.channel) -ForegroundColor Red
    Write-Host ("          {0}" -f $f.detail) -ForegroundColor DarkGray
  }
} else {
  Write-Host "        none recorded" -ForegroundColor Green
}
Write-Host ""
