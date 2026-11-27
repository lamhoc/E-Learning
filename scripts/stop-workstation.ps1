param([int]$Port = 3000)

Write-Host "Dang dung Cloudflare Tunnel va Next.js Server tren cong $Port..." -ForegroundColor Yellow

Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

$conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
foreach ($c in $conns) {
  Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
}

Write-Host "Da dung toan bo tien trinh deploy." -ForegroundColor Green
