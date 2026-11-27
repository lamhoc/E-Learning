param([int]$Port = 3000)

$ErrorActionPreference = "Continue"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $ProjectRoot

$LogDir = Join-Path $ProjectRoot ".deploy-logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$ServiceLog = Join-Path $LogDir "autostart-watchdog.log"

function Write-Log([string]$msg) {
  $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  Add-Content -Path $ServiceLog -Value "[$ts] $msg" -Encoding UTF8
}

Write-Log "=== Khoi dong dich vu nen E-Learning LHU (Port $Port) ==="

# 1. Dam bao SQL Server 2019 dang chay
$sqlSvc = Get-Service -Name "MSSQLSERVER" -ErrorAction SilentlyContinue
if ($sqlSvc -and $sqlSvc.Status -ne "Running") {
  Write-Log "Dang bat service MSSQLSERVER..."
  Start-Service -Name "MSSQLSERVER" -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 3
}

# 2. Dam bao Tailscale Funnel dang tro cong 3000
$tsBin = "C:\Program Files\Tailscale\tailscale.exe"
if (Test-Path $tsBin) {
  $tsSvc = Get-Service -Name "Tailscale" -ErrorAction SilentlyContinue
  if ($tsSvc -and $tsSvc.Status -ne "Running") {
    Start-Service -Name "Tailscale" -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3
  }
  & $tsBin funnel --bg $Port 2>&1 | Out-Null
  Write-Log "Da xac nhan Tailscale Funnel tren cong $Port."
}

# 3. Xac dinh duong dan node.exe & next binary tuyet doi (an toan khi chay duoi quyen SYSTEM)
$NodeExe = @(
  "C:\Program Files\nodejs\node.exe",
  (Get-Command node -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source)
) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1

$NextBin = Join-Path $ProjectRoot "node_modules\next\dist\bin\next"

if (-not $NodeExe -or -not (Test-Path $NextBin)) {
  Write-Log "LOI: Khong tim thay node.exe ($NodeExe) hoac next ($NextBin)."
  exit 1
}

# 4. Vong lap giam sat: chay Next.js Production tren 127.0.0.1:3000 va tu dong khoi dong lai neu crash
$OutLog = Join-Path $LogDir "next-service.out.log"
$ErrLog = Join-Path $LogDir "next-service.err.log"

while ($true) {
  # Don tien trinh cu chiem cong (neu co)
  $existing = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  foreach ($c in $existing) {
    if ($c.OwningProcess -ne $PID) {
      Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
    }
  }

  Write-Log "Dang khoi chay Next.js Production (127.0.0.1:$Port)..."
  $env:NODE_ENV = "production"
  $proc = Start-Process -FilePath $NodeExe `
    -ArgumentList "`"$NextBin`"", "start", "-H", "127.0.0.1", "-p", "$Port" `
    -WorkingDirectory $ProjectRoot `
    -RedirectStandardOutput $OutLog `
    -RedirectStandardError $ErrLog `
    -WindowStyle Hidden `
    -PassThru

  $proc.WaitForExit()
  Write-Log "Canh bao: Next.js thoat voi ma $($proc.ExitCode). Tu dong khoi dong lai sau 5 giay..."
  Start-Sleep -Seconds 5
}
