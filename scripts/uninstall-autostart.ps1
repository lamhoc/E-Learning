$TaskName = "AutoBankELearningServer"

$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
  Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  Write-Host "Da go bo tac vu tu dong khoi dong $TaskName." -ForegroundColor Green
} else {
  Write-Host "Tac vu $TaskName chua duoc cai dat." -ForegroundColor Yellow
}

& (Join-Path $PSScriptRoot "stop-workstation.ps1")
