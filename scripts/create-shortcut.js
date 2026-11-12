const path = require('path');
const { execSync } = require('child_process');

const psScript = path.join(__dirname, 'create-shortcut.ps1');

try {
    execSync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${psScript}"`, { stdio: 'inherit' });
} catch (err) {
    // Handled in ps script
}
