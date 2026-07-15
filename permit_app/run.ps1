# Flutter Web Dev Launcher — clears file locks before every run
Write-Host "Stopping any lingering browser/flutter processes..." -ForegroundColor Cyan
Get-Process -Name "chrome","msedge","msedgewebview2","dart","flutter_tester" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

Write-Host "Clearing locked build directories..." -ForegroundColor Cyan
$dirs = @("build", ".dart_tool", "windows\flutter\ephemeral", "linux\flutter\ephemeral", "macos\Flutter\ephemeral", "ios\Flutter\ephemeral")
foreach ($d in $dirs) {
    if (Test-Path $d) {
        # Grant full permissions first, then delete
        icacls $d /grant "$($env:USERNAME):(OI)(CI)F" /T /Q 2>$null
        Remove-Item -Recurse -Force $d -ErrorAction SilentlyContinue
        Write-Host "  Removed: $d" -ForegroundColor Gray
    }
}

Write-Host "Starting Flutter on Chrome..." -ForegroundColor Green
flutter run -d chrome
