$ErrorActionPreference = "Stop"
$TaskName = "AutoBankELearningServer"
$ScriptPath = (Resolve-Path (Join-Path $PSScriptRoot "start-background-service.ps1")).Path
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

Write-Host "Dang cai dat tac vu tu dong khoi dong Windows: $TaskName ..." -ForegroundColor Cyan

# Dung tac vu cu neu da ton tai
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
  Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$ScriptPath`"" `
  -WorkingDirectory $ProjectRoot

$trigger = New-ScheduledTaskTrigger -AtStartup

$principal = New-ScheduledTaskPrincipal `
  -UserId "SYSTEM" `
  -LogonType ServiceAccount `
  -RunLevel Highest

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Seconds 0) `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Principal $principal `
  -Settings $settings `
  -Description "Tu dong khoi chay E-Learning LHU (Next.js Production + SQL Server + Tailscale Funnel) khi bat may Windows." | Out-Null

Start-ScheduledTask -TaskName $TaskName
Write-Host "Da cai dat va khoi chay thanh cong tac vu $TaskName (tu dong chay khi bat may Windows)." -ForegroundColor Green
