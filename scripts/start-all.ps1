# =========================
# CONFIG
# =========================

$dockerDesktop = "C:\Program Files\Docker\Docker\Docker Desktop.exe"

$cloudflareLog = "$PSScriptRoot\cloudflare.log"

# =========================
# START DOCKER DESKTOP
# =========================

Write-Host ""
Write-Host "====================================="
Write-Host "STARTING DOCKER DESKTOP..."
Write-Host "====================================="
Write-Host ""

Start-Process $dockerDesktop

# Wait for Docker Engine
Write-Host "Waiting for Docker Engine..."

do {
    Start-Sleep -Seconds 5
    docker info *> $null
} until ($LASTEXITCODE -eq 0)

Write-Host "Docker Engine is READY."
Write-Host ""

# =========================
# START MOBSF
# =========================

Write-Host "Launching MobSF..."

Start-Process powershell -ArgumentList `
"-NoExit", `
"-Command", `
"mobsf"

Start-Sleep -Seconds 8

# =========================
# START NGROK
# =========================

Write-Host "Launching ngrok..."

Start-Process powershell -ArgumentList `
"-NoExit", `
"-Command", `
"ngrok http 8000"

Start-Sleep -Seconds 8

# =========================
# START GOTENBERG
# =========================

Write-Host "Launching Gotenberg..."

Start-Process powershell -ArgumentList `
"-NoExit", `
"-Command", `
"docker run --rm -p 3000:3000 gotenberg/gotenberg:8"

Start-Sleep -Seconds 10

# =========================
# START CLOUDFLARED
# =========================

Write-Host "Launching Cloudflared Tunnel..."

# delete old log
if (Test-Path $cloudflareLog) {
    Remove-Item $cloudflareLog
}

Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "& { cloudflared tunnel --url http://localhost:3000 2>&1 | Tee-Object -FilePath '$cloudflareLog' }"
)

# =========================
# WAIT FOR SERVICES
# =========================

Write-Host ""
Write-Host "Waiting for public URLs..."
Write-Host ""

Start-Sleep -Seconds 10

# =========================
# GET NGROK PUBLIC URL
# =========================

$ngrokUrl = $null

try {

    $ngrokData = Invoke-RestMethod `
    http://127.0.0.1:4040/api/tunnels

    $ngrokUrl = (
        $ngrokData.tunnels | Where-Object {
            $_.proto -eq "https"
        }
    ).public_url
}
catch {
    Write-Host "Could not retrieve ngrok URL."
}

# =========================
# GET CLOUDFLARE URL
# =========================

$cloudflareUrl = $null

for ($i = 0; $i -lt 30; $i++) {

    Start-Sleep -Seconds 2

    if (Test-Path $cloudflareLog) {

        $content = Get-Content $cloudflareLog -Raw

        $match = [regex]::Match(
            $content,
            'https://[a-zA-Z0-9\-]+\.trycloudflare\.com'
        )

        if ($match.Success) {

            $cloudflareUrl = $match.Value
            break
        }
    }
}

# =========================
# DISPLAY RESULTS
# =========================

Write-Host ""
Write-Host "====================================="
Write-Host "PUBLIC URLS"
Write-Host "====================================="
Write-Host ""

if ($ngrokUrl) {

    Write-Host "NGROK URL:"
    Write-Host $ngrokUrl
    Write-Host ""
}
else {

    Write-Host "NGROK URL NOT FOUND"
    Write-Host ""
}

if ($cloudflareUrl) {

    Write-Host "CLOUDFLARE URL:"
    Write-Host $cloudflareUrl
    Write-Host ""
}
else {

    Write-Host "CLOUDFLARE URL NOT FOUND"
    Write-Host ""
}

Write-Host "====================================="
Write-Host "SERVICES STARTED SUCCESSFULLY"
Write-Host "====================================="

# =========================
# OPTIONAL
# OPEN URLS IN BROWSER
# =========================

if ($ngrokUrl) {
    Start-Process $ngrokUrl
}

if ($cloudflareUrl) {
    Start-Process $cloudflareUrl
}

# =========================
# OPTIONAL
# COPY URLS TO CLIPBOARD
# =========================

if ($cloudflareUrl) {
    $cloudflareUrl | Set-Clipboard
}