# =========================
# STOP ALL SERVICES
# =========================

Write-Host ""
Write-Host "====================================="
Write-Host "STOPPING SERVICES..."
Write-Host "====================================="
Write-Host ""

# =========================
# STOP NGROK
# =========================

Write-Host "Stopping ngrok..."

Get-Process ngrok -ErrorAction SilentlyContinue | Stop-Process -Force

# =========================
# STOP CLOUDFLARED
# =========================

Write-Host "Stopping cloudflared..."

Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force

# =========================
# STOP MOBSF
# =========================

Write-Host "Stopping MobSF..."

Get-Process python -ErrorAction SilentlyContinue | Where-Object {
    $_.Path -like "*python*"
} | Stop-Process -Force

# =========================
# STOP GOTENBERG CONTAINER
# =========================

Write-Host "Stopping Gotenberg container..."

$gotenbergContainer = docker ps --filter "ancestor=gotenberg/gotenberg:8" -q

if ($gotenbergContainer) {
    docker stop $gotenbergContainer | Out-Null
}

# =========================
# OPTIONAL
# STOP DOCKER DESKTOP
# =========================

Write-Host "Stopping Docker Desktop..."

Get-Process "Docker Desktop" -ErrorAction SilentlyContinue | Stop-Process -Force

# =========================
# CLEAN LOG FILES
# =========================

$cloudflareLog = "$PSScriptRoot\cloudflare.log"

if (Test-Path $cloudflareLog) {
    Remove-Item $cloudflareLog -Force
}

# =========================
# DONE
# =========================

Write-Host ""
Write-Host "====================================="
Write-Host "ALL SERVICES STOPPED"
Write-Host "====================================="
Write-Host ""