# TaskFlow — Self-Signed Code Signing Certificate Generator
# Usage: .\scripts\create-signing-cert.ps1 -Password "your-strong-password"

param(
  [Parameter(Mandatory=$true)]
  [string]$Password
)

$ErrorActionPreference = "Stop"

$certsDir = Join-Path $PSScriptRoot "..\certs"
$pfxPath  = Join-Path $certsDir "taskflow-signing.pfx"

# Create certs/ directory if it doesn't exist
if (-not (Test-Path $certsDir)) {
  New-Item -ItemType Directory -Path $certsDir | Out-Null
}

Write-Host ""
Write-Host "Creating self-signed code signing certificate..." -ForegroundColor Cyan

$cert = New-SelfSignedCertificate `
  -Type CodeSigningCert `
  -Subject "CN=TaskFlow, O=s4nby" `
  -KeyUsage DigitalSignature `
  -FriendlyName "TaskFlow Code Signing" `
  -CertStoreLocation "Cert:\CurrentUser\My" `
  -HashAlgorithm SHA256 `
  -NotAfter (Get-Date).AddYears(10)

Write-Host "Certificate created." -ForegroundColor Green
Write-Host "  Thumbprint : $($cert.Thumbprint)"
Write-Host "  Expires    : $($cert.NotAfter.ToString('yyyy-MM-dd'))"

# Export to PFX
$securePassword = ConvertTo-SecureString -String $Password -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $securePassword | Out-Null

Write-Host ""
Write-Host "PFX saved to: $pfxPath" -ForegroundColor Green
Write-Host ""
Write-Host "Add these lines to your .env file:" -ForegroundColor Yellow
Write-Host "  CSC_LINK=./certs/taskflow-signing.pfx"
Write-Host "  CSC_KEY_PASSWORD=$Password"
Write-Host ""
Write-Host "IMPORTANT: Keep the password secret. Never commit the certs/ folder." -ForegroundColor Red
