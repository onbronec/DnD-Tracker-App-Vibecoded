const fs = require('fs');
const path = require('path');
const os = require('os');

const rootDir = path.resolve(__dirname, '..');
const templateDir = path.join(rootDir, 'templates', 'player-package');
const outDir = path.join(rootDir, 'dnd-player-usb');
const filesDir = path.join(outDir, 'files');

if (!fs.existsSync(filesDir)) {
    fs.mkdirSync(filesDir, { recursive: true });
}

// 1. Detect DM's current hostname and local Wi-Fi IP
const hostname = os.hostname();
let localIp = '192.168.1.10';
const nets = os.networkInterfaces();
for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
        if (net.family === 'IPv4' && !net.internal) {
            localIp = net.address;
            break;
        }
    }
}

// 2. Generate config.json
const config = {
    hostname,
    lastKnownIp: localIp,
    port: 3000
};
fs.writeFileSync(path.join(filesDir, 'config.json'), JSON.stringify(config, null, 2), 'utf8');

// 3. Copy files from template
fs.copyFileSync(path.join(templateDir, 'launch.vbs'), path.join(filesDir, 'launch.vbs'));
fs.copyFileSync(path.join(templateDir, 'launch.ps1'), path.join(filesDir, 'launch.ps1'));
fs.copyFileSync(path.join(templateDir, 'install.ps1'), path.join(filesDir, 'install.ps1'));
fs.copyFileSync(path.join(templateDir, 'Instalovat DnD Companion.bat'), path.join(outDir, 'Instalovat DnD Companion.bat'));
fs.copyFileSync(path.join(templateDir, 'README_HRAC.txt'), path.join(outDir, 'README_HRAC.txt'));

// 4. Copy dnd.ico
const icoSrc = path.join(rootDir, 'dnd.ico');
if (fs.existsSync(icoSrc)) {
    fs.copyFileSync(icoSrc, path.join(filesDir, 'dnd.ico'));
}

console.log('================================================================');
console.log('  DnD Companion - Balíček pro hráče na USB flashku je hotov!');
console.log('================================================================');
console.log(`Cílová složka:      ${outDir}`);
console.log(`Detekovaný DM host: ${hostname}`);
console.log(`Detekovaná DM IP:   ${localIp}:3000`);
console.log('----------------------------------------------------------------');
console.log('Instrukce:');
console.log('Zkopíruj celý obsah složky "dnd-player-usb" na libovolnou flashku.');
console.log('================================================================');
