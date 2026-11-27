param(
  [switch]$Rebuild,
  [int]$Port = 3000
)

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $ProjectRoot

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  E-LEARNING LHU - WORKSTATION DEPLOY (SQL SERVER + HTTPS)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Kiểm tra SQL Server 2019 (MSSQLSERVER)
$sqlSvc = Get-Service -Name "MSSQLSERVER" -ErrorAction SilentlyContinue
if ($sqlSvc) {
  if ($sqlSvc.Status -ne "Running") {
    Write-Host "[1/4] Dang khoi dong dich vu SQL Server (MSSQLSERVER)..." -ForegroundColor Yellow
    Start-Service -Name "MSSQLSERVER"
  }
  Write-Host "[1/4] SQL Server 2019: RUNNING (127.0.0.1:1433 - chi nghe noi bo)" -ForegroundColor Green
} else {
  Write-Host "[1/4] Canh bao: Khong tim thay service MSSQLSERVER mac dinh. Dam bao SQL Server dang chay." -ForegroundColor Yellow
}

# 2. Kiem tra file .env.local va nap CLOUDFLARE_TUNNEL_TOKEN neu co
$TunnelToken = $env:CLOUDFLARE_TUNNEL_TOKEN
$EnvLocalPath = Join-Path $ProjectRoot ".env.local"
if (Test-Path $EnvLocalPath) {
  foreach ($line in Get-Content $EnvLocalPath) {
    if ($line -match '^\s*CLOUDFLARE_TUNNEL_TOKEN\s*=\s*(.+)\s*$') {
      $val = $Matches[1].Trim().Trim('"').Trim("'")
      if ($val) { $TunnelToken = $val }
    }
  }
}

# 3. Kiem tra ban dung production (.next)
if ($Rebuild -or -not (Test-Path (Join-Path $ProjectRoot ".next\BUILD_ID"))) {
  Write-Host "[2/4] Dang bien dich ban dung Production (npm run build)..." -ForegroundColor Yellow
  & npm.cmd run build
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Bien dich Next.js that bai!"
    exit 1
  }
} else {
  Write-Host "[2/4] Ban dung Production (.next) da san sang (dung -Rebuild neu muon build lai)." -ForegroundColor Green
}

# 4. Tim binary cloudflared
$CloudflaredBin = @(
  (Get-Command cloudflared -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source),
  "C:\Program Files (x86)\cloudflared\cloudflared.exe",
  "C:\Program Files\cloudflared\cloudflared.exe"
) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1

if (-not $CloudflaredBin) {
  Write-Error "Chua cai dat cloudflared. Chay: winget install --id Cloudflare.cloudflared --exact"
  exit 1
}

# 5. Don tien trinh cu tren cong muc tieu (neu co)
$LogDir = Join-Path $ProjectRoot ".deploy-logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$existingConn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($existingConn) {
  Write-Host "[3/4] Phat hien server cu dang nghe cong $Port, dang khoi dong lai..." -ForegroundColor Yellow
  foreach ($c in $existingConn) {
    Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
  }
  Start-Sleep -Seconds 1
}

# 6. Khoi chay Next.js chi nghe 127.0.0.1 (tuyet doi khong mo truc tiep ra Internet)
$NextOut = Join-Path $LogDir "next-server.out.log"
$NextErr = Join-Path $LogDir "next-server.err.log"
$NextProc = Start-Process -FilePath "cmd.exe" `
  -ArgumentList "/c", "npx next start -H 127.0.0.1 -p $Port" `
  -WorkingDirectory $ProjectRoot `
  -RedirectStandardOutput $NextOut `
  -RedirectStandardError $NextErr `
  -WindowStyle Hidden `
  -PassThru

Write-Host "[3/4] Dang cho Next.js san sang tai http://127.0.0.1:$Port ..." -ForegroundColor Yellow
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
  try {
    $res = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/login" -UseBasicParsing -TimeoutSec 2
    if ($res.StatusCode -eq 200) {
      $ready = $true
      break
    }
  } catch {
    Start-Sleep -Milliseconds 500
  }
}

if (-not $ready) {
  Write-Error "Next.js khong phan hoi tren cong $Port. Xem log tai $NextErr"
  Stop-Process -Id $NextProc.Id -Force -ErrorAction SilentlyContinue
  exit 1
}
Write-Host "[3/4] Next.js Production: RUNNING (http://127.0.0.1:$Port)" -ForegroundColor Green

# 7. Khoi chay Cloudflare Tunnel
$CfLog = Join-Path $LogDir "cloudflared.log"
if (Test-Path $CfLog) { Remove-Item $CfLog -Force }

try {
  if ($TunnelToken) {
    Write-Host "[4/4] Dang mo Cloudflare Named Tunnel (ten mien co dinh)..." -ForegroundColor Green
    $CfProc = Start-Process -FilePath $CloudflaredBin `
      -ArgumentList "tunnel", "--no-autoupdate", "run", "--token", $TunnelToken `
      -WorkingDirectory $ProjectRoot `
      -RedirectStandardError $CfLog `
      -WindowStyle Hidden `
      -PassThru
    Write-Host ""
    Write-Host "He thong dang chay online qua ten mien Cloudflare Zero Trust cua ban." -ForegroundColor Cyan
  } else {
    Write-Host "[4/4] Dang mo Cloudflare Quick Tunnel (HTTPS tu dong, khong mo port router)..." -ForegroundColor Yellow
    $CfProc = Start-Process -FilePath $CloudflaredBin `
      -ArgumentList "tunnel", "--no-autoupdate", "--url", "http://127.0.0.1:$Port" `
      -WorkingDirectory $ProjectRoot `
      -RedirectStandardError $CfLog `
      -WindowStyle Hidden `
      -PassThru

    $publicUrl = $null
    for ($i = 0; $i -lt 40; $i++) {
      if (Test-Path $CfLog) {
        $text = Get-Content $CfLog -Raw -ErrorAction SilentlyContinue
        if ($text -match 'https://[a-z0-9-]+\.trycloudflare\.com') {
          $publicUrl = $Matches[0]
          break
        }
      }
      Start-Sleep -Milliseconds 500
    }

    if ($publicUrl) {
      Set-Content -Path (Join-Path $ProjectRoot "deploy-url.txt") -Value $publicUrl -Encoding UTF8
      Write-Host ""
      Write-Host "============================================================" -ForegroundColor Green
      Write-Host "  PUBLIC HTTPS URL : $publicUrl" -ForegroundColor Green
      Write-Host "  LOCAL URL        : http://127.0.0.1:$Port" -ForegroundColor Cyan
      Write-Host "  SQL SERVER       : 127.0.0.1:1433 (An toan, khong mo port)" -ForegroundColor Cyan
      Write-Host "============================================================" -ForegroundColor Green
    } else {
      Write-Warning "Chua bat duoc URL tu log cloudflared. Kiem tra file: $CfLog"
    }
  }

  Write-Host "Nhan Ctrl+C de dung ca Web Server va Cloudflare Tunnel." -ForegroundColor Gray
  while (-not $NextProc.HasExited -and -not $CfProc.HasExited) {
    Start-Sleep -Seconds 2
  }
} finally {
  Write-Host "`nDang tat Cloudflare Tunnel va Next.js Server..." -ForegroundColor Yellow
  if ($CfProc -and -not $CfProc.HasExited) { Stop-Process -Id $CfProc.Id -Force -ErrorAction SilentlyContinue }
  if ($NextProc -and -not $NextProc.HasExited) { Stop-Process -Id $NextProc.Id -Force -ErrorAction SilentlyContinue }
  Write-Host "Da dung an toan." -ForegroundColor Green
}
