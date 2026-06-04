const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { normalizeSpell } = require('./migrations');

function importSpellsFromDataFolder(rootDir = process.cwd()) {
    const spellsDir = path.join(rootDir, 'data', 'Spells');
    if (!fs.existsSync(spellsDir)) return [];
    const zipPath = fs.readdirSync(spellsDir)
        .filter(file => file.toLowerCase().endsWith('.zip'))
        .map(file => path.join(spellsDir, file))
        .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
    if (!zipPath) return [];
    const entries = readZipRecursive(fs.readFileSync(zipPath));
    const csvEntry = entries
        .filter(entry => entry.name.toLowerCase().endsWith('.csv'))
        .sort((a, b) => scoreCsvEntry(b.name) - scoreCsvEntry(a.name))[0];
    if (!csvEntry) return [];
    return parseSpellCsv(csvEntry.data.toString('utf8'));
}

function scoreCsvEntry(name) {
    const lower = name.toLowerCase();
    if (lower.includes('_all.csv')) return 2;
    if (lower.endsWith('.csv')) return 1;
    return 0;
}

function readZipRecursive(buffer) {
    const result = [];
    for (const entry of readZipEntries(buffer)) {
        if (entry.name.toLowerCase().endsWith('.zip')) {
            result.push(...readZipRecursive(entry.data));
        } else {
            result.push(entry);
        }
    }
    return result;
}

function readZipEntries(buffer) {
    const eocdOffset = findEndOfCentralDirectory(buffer);
    if (eocdOffset < 0) throw new Error('ZIP central directory not found.');
    const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
    let offset = buffer.readUInt32LE(eocdOffset + 16);
    const entries = [];
    for (let index = 0; index < totalEntries; index += 1) {
        if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error('Invalid ZIP central directory entry.');
        const compression = buffer.readUInt16LE(offset + 10);
        const compressedSize = buffer.readUInt32LE(offset + 20);
        const fileNameLength = buffer.readUInt16LE(offset + 28);
        const extraLength = buffer.readUInt16LE(offset + 30);
        const commentLength = buffer.readUInt16LE(offset + 32);
        const localHeaderOffset = buffer.readUInt32LE(offset + 42);
        const name = buffer.slice(offset + 46, offset + 46 + fileNameLength).toString('utf8');
        const data = readLocalFile(buffer, localHeaderOffset, compressedSize, compression);
        if (!name.endsWith('/')) entries.push({ name, data });
        offset += 46 + fileNameLength + extraLength + commentLength;
    }
    return entries;
}

function findEndOfCentralDirectory(buffer) {
    const min = Math.max(0, buffer.length - 65557);
    for (let index = buffer.length - 22; index >= min; index -= 1) {
        if (buffer.readUInt32LE(index) === 0x06054b50) return index;
    }
    return -1;
}

function readLocalFile(buffer, offset, compressedSize, compression) {
    if (buffer.readUInt32LE(offset) !== 0x04034b50) throw new Error('Invalid ZIP local header.');
    const fileNameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const dataStart = offset + 30 + fileNameLength + extraLength;
    const compressed = buffer.slice(dataStart, dataStart + compressedSize);
    if (compression === 0) return compressed;
    if (compression === 8) return zlib.inflateRawSync(compressed);
    throw new Error(`Unsupported ZIP compression method: ${compression}`);
}

function parseSpellCsv(text) {
    const rows = parseCsv(text);
    const [header, ...records] = rows;
    if (!header) return [];
    const keys = header.map(value => value.trim());
    return records
        .map(values => Object.fromEntries(keys.map((key, index) => [key, values[index] ?? ''])))
        .filter(row => String(row.Name || '').trim())
        .map(row => normalizeSpell(spellFromCsvRow(row)));
}

function spellFromCsvRow(row) {
    return {
        name: row.Name,
        ritual: row['As a Ritual'],
        atHigherLevels: row['At Higher Levels'],
        castingTime: row['Casting Time'],
        classes: row.Classes,
        components: row.Components,
        duration: row.Duration,
        levelLabel: row.Level,
        page: row.Page,
        range: row.Range,
        school: row.School,
        source: row.Source,
        description: row.Text,
        importKey: [row.Name, row.Level, row.Source, row.Page].map(value => String(value || '').trim().toLowerCase()).join('|')
    };
}

function parseCsv(text) {
    const rows = [];
    let row = [];
    let value = '';
    let quoted = false;
    for (let index = 0; index < text.length; index += 1) {
        const char = text[index];
        if (quoted) {
            if (char === '"' && text[index + 1] === '"') {
                value += '"';
                index += 1;
            } else if (char === '"') {
                quoted = false;
            } else {
                value += char;
            }
        } else if (char === '"') {
            quoted = true;
        } else if (char === ',') {
            row.push(value);
            value = '';
        } else if (char === '\n') {
            row.push(value.replace(/\r$/, ''));
            rows.push(row);
            row = [];
            value = '';
        } else {
            value += char;
        }
    }
    if (value || row.length) {
        row.push(value.replace(/\r$/, ''));
        rows.push(row);
    }
    return rows;
}

module.exports = {
    importSpellsFromDataFolder,
    parseSpellCsv,
    parseCsv,
    readZipEntries
};
