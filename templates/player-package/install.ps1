$ErrorActionPreference = 'Stop'

$SourceDir = $PSScriptRoot
$targetDir = Join-Path $env:LOCALAPPDATA "DnD-Companion-Player"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Instalace DnD Companion (Hrac)       " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
}

Copy-Item (Join-Path $SourceDir "dnd.ico") (Join-Path $targetDir "dnd.ico") -Force
Copy-Item (Join-Path $SourceDir "launch.vbs") (Join-Path $targetDir "launch.vbs") -Force
Copy-Item (Join-Path $SourceDir "launch.ps1") (Join-Path $targetDir "launch.ps1") -Force
Copy-Item (Join-Path $SourceDir "config.json") (Join-Path $targetDir "config.json") -Force

# Create shortcut on Desktop
$desktop = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop "DnD Companion.lnk"

$WshShell = New-Object -ComObject WScript.Shell
$shortcut = $WshShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "$env:SystemRoot\System32\wscript.exe"
$shortcut.Arguments = "`"`"$targetDir\launch.vbs`"`""
$shortcut.WorkingDirectory = $targetDir
$shortcut.Description = "DnD Companion - Hrac"
$shortcut.WindowStyle = 7
$shortcut.IconLocation = "$targetDir\dnd.ico,0"
$shortcut.Save()

Write-Host "[OK] Soubory zkopirovany do pocitace: $targetDir" -ForegroundColor Green
Write-Host "[OK] Zastupce vytvoren na Plosi: $shortcutPath" -ForegroundColor Green
Write-Host ""
Write-Host "--------------------------------------------------------" -ForegroundColor Yellow
Write-Host "Doporuceni:" -ForegroundColor Yellow
Write-Host "1. Na ikonu 'DnD Companion' na Plosi muzes kliknout pravym" -ForegroundColor Yellow
Write-Host "   tlacitkem a zvolit: 'Pripnout na hlavni panel' (Taskbar)." -ForegroundColor Yellow
Write-Host "2. Flashku nyni muzes bez obav vytahnout z pocitace." -ForegroundColor Yellow
Write-Host "--------------------------------------------------------" -ForegroundColor Yellow
Write-Host ""
