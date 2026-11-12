param(
    [string]$ProjectDir = $PSScriptRoot + "\..",
    [string]$BatPath = $PSScriptRoot + "\..\start.bat"
)

$resolvedProject = (Resolve-Path $ProjectDir).Path
$resolvedBat = (Resolve-Path $BatPath).Path
$WshShell = New-Object -ComObject WScript.Shell

$locations = @(
    (Join-Path $resolvedProject "DnD Companion.lnk")
)

$homeDir = $env:USERPROFILE
$desktops = @(
    (Join-Path $homeDir "OneDrive\Plocha"),
    (Join-Path $homeDir "OneDrive\Desktop"),
    (Join-Path $homeDir "Desktop"),
    (Join-Path $homeDir "Plocha")
) | Where-Object { Test-Path $_ } | Select-Object -Unique

foreach ($d in $desktops) {
    $locations += (Join-Path $d "DnD Companion.lnk")
}

foreach ($loc in $locations) {
    try {
        $shortcut = $WshShell.CreateShortcut($loc)
        $shortcut.TargetPath = "$env:SystemRoot\System32\cmd.exe"
        $shortcut.Arguments = "/k `"`"$resolvedBat`"`" minimized"
        $shortcut.WorkingDirectory = $resolvedProject
        $shortcut.Description = "DnD Companion Server"
        $shortcut.WindowStyle = 7
        $shortcut.IconLocation = "$resolvedProject\dnd.ico,0"
        $shortcut.Save()
        Write-Host "[OK] Vytvoren zastupce: $loc"
    } catch {
        Write-Host "[INFO] Nelze zapsat na $loc (pristupova prava nebo sandbox), zkontrolujte umisteni."
    }
}
