<#
.SYNOPSIS
  Send one real test email and print exactly what Resend says.

.DESCRIPTION
  With a send-only Resend API key the domain list cannot be read, so inspection can only
  get so far. Actually sending is the only way to know whether the sending domain is
  verified. This prints Resend's own response, which names the precise problem.

  Prompts for ADMIN_TOKEN with masked input so it never enters PowerShell history.

  ASCII-only, UTF-8 BOM, CRLF. Windows PowerShell 5.1 reads .ps1 as Windows-1252 without
  a BOM, which corrupts any non-ASCII byte and throws parse errors far from the cause.

.EXAMPLE
  .\scripts\test-email.ps1 -To you@example.com
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$To,
  [string]$Url = "https://dsacentralpa.org"
)

Write-Host ""
Write-Host "  Test send to $To via $Url" -ForegroundColor Cyan
Write-Host "  Paste your ADMIN_TOKEN. It will not be shown or saved." -ForegroundColor DarkGray
Write-Host ""

$secure = Read-Host "  ADMIN_TOKEN" -AsSecureString
if (-not $secure -or $secure.Length -eq 0) {
  Write-Host ""
  Write-Host "  No token entered." -ForegroundColor Yellow
  Write-Host ""
  exit 1
}

$cred = New-Object System.Net.NetworkCredential("", $secure)
$token = $cred.Password
$headers = @{ Authorization = "Bearer $token" }
$body = @{ to = $To } | ConvertTo-Json -Compress

$r = $null
$failed = $false
try {
  $r = Invoke-RestMethod -Uri "$Url/api/admin/test-email" -Method Post -Headers $headers -ContentType "application/json" -Body $body -ErrorAction Stop
}
catch {
  $failed = $true
  $code = 0
  if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }

  # A non-2xx from our own API still carries a useful JSON body. Getting at it in
  # Windows PowerShell 5.1 needs two attempts:
  #
  #   1. $_.ErrorDetails.Message - PowerShell buffers the error body here, and this is
  #      the reliable route. Try it first.
  #   2. The raw response stream - fallback, but 5.1 has often already consumed or
  #      disposed it by the time the catch block runs, leaving nothing to read. That is
  #      why an earlier version of this script printed a bare "502 Bad Gateway" and
  #      discarded the actual reason.
  $text = $null
  if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
    $text = $_.ErrorDetails.Message
  }
  elseif ($_.Exception.Response) {
    try {
      $stream = $_.Exception.Response.GetResponseStream()
      if ($stream) {
        $reader = New-Object System.IO.StreamReader($stream)
        $text = $reader.ReadToEnd()
      }
    } catch { $text = $null }
  }
  if ($text) { try { $r = $text | ConvertFrom-Json } catch { $r = $null } }

  if ($null -eq $r -and $text) {
    Write-Host ""
    Write-Host "  Server said:" -ForegroundColor DarkGray
    Write-Host ("    " + $text) -ForegroundColor DarkGray
  }

  if ($null -eq $r) {
    Write-Host ""
    if ($code -eq 502) {
      Write-Host "  502 - the deployed worker is an older build." -ForegroundColor Red
      Write-Host ""
      Write-Host "  It returned 502 when Resend refused the send, which hides the reason." -ForegroundColor DarkGray
      Write-Host "  The current code returns 200 with the reason in the body. Deploy it:" -ForegroundColor DarkGray
      Write-Host ""
      Write-Host "    npm run deploy" -ForegroundColor White
      Write-Host ""
      Write-Host "  Note: 502 here still means the endpoint worked and Resend rejected the" -ForegroundColor DarkGray
      Write-Host "  send - so the API key is reaching Resend. Most likely the sending domain" -ForegroundColor DarkGray
      Write-Host "  is not verified yet at resend.com/domains." -ForegroundColor DarkGray
    }
    elseif ($code -eq 404) {
      Write-Host "  404 - this endpoint is not in the deployed worker." -ForegroundColor Red
      Write-Host ""
      Write-Host "  Most likely cause: 'wrangler secret put' redeploys using the LAST" -ForegroundColor DarkGray
      Write-Host "  UPLOADED script, not your local files. Setting a secret does not ship" -ForegroundColor DarkGray
      Write-Host "  code changes. Deploy, then retry:" -ForegroundColor DarkGray
      Write-Host ""
      Write-Host "    npm run deploy" -ForegroundColor White
    }
    elseif ($code -eq 401) {
      Write-Host "  401 Unauthorized - that token does not match ADMIN_TOKEN." -ForegroundColor Red
      Write-Host "  Secrets cannot be read back. If it is lost, set a new one:" -ForegroundColor DarkGray
      Write-Host "    npx wrangler secret put ADMIN_TOKEN" -ForegroundColor White
      Write-Host "    npm run deploy" -ForegroundColor White
    }
    else {
      Write-Host ("  Request failed: " + $_.Exception.Message) -ForegroundColor Red
    }
    Write-Host ""
  }
}
finally {
  $token = $null
  $cred = $null
  $headers = $null
  [System.GC]::Collect()
}

if ($null -eq $r) { exit 1 }

Write-Host ""
if ($r.ok) {
  Write-Host "  SENT" -ForegroundColor Green
} else {
  Write-Host ("  NOT SENT  (Resend returned {0})" -f $r.resend_status) -ForegroundColor Red
}
Write-Host ""
Write-Host ("  from : {0}" -f $r.from)
Write-Host ("  to   : {0}" -f $r.to)
Write-Host ""
Write-Host ("  -> " + $r.verdict) -ForegroundColor $(if ($r.ok) { "Green" } else { "Yellow" })
Write-Host ""
Write-Host "  Resend said:" -ForegroundColor DarkGray
($r.resend_response | ConvertTo-Json -Depth 5) -split "`n" | ForEach-Object {
  Write-Host ("    " + $_) -ForegroundColor DarkGray
}
Write-Host ""
