#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const DEFAULT_FIELDS = ['description', 'atHigherLevels'];

function main(argv = process.argv.slice(2)) {
    const options = parseArgs(argv);
    const file = path.resolve(process.cwd(), options.file);
    if (!fs.existsSync(file)) {
        throw new Error(`Autosave file not found: ${file}`);
    }

    const state = JSON.parse(fs.readFileSync(file, 'utf8'));
    const result = linkSpellDatabaseReferences(state, options);
    printSummary(result, options);

    if (!options.apply) return;
    if (options.backup) {
        const backupFile = `${file}.${timestampForFile()}.bak`;
        fs.copyFileSync(file, backupFile);
        console.log(`Backup written: ${backupFile}`);
    }
    fs.writeFileSync(file, `${JSON.stringify(state, null, 2)}\n`);
    console.log(`Updated autosave: ${file}`);
}

function parseArgs(argv) {
    const options = {
        file: 'dnd-tracker-autosave.json',
        apply: false,
        backup: true,
        minNameLength: 4,
        fields: DEFAULT_FIELDS
    };

    argv.forEach(arg => {
        if (arg === '--apply') options.apply = true;
        else if (arg === '--dry-run') options.apply = false;
        else if (arg === '--no-backup') options.backup = false;
        else if (arg.startsWith('--file=')) options.file = arg.slice('--file='.length);
        else if (arg.startsWith('--min-name-length=')) options.minNameLength = Math.max(1, Number(arg.slice('--min-name-length='.length)) || options.minNameLength);
        else if (arg.startsWith('--fields=')) options.fields = arg.slice('--fields='.length).split(',').map(item => item.trim()).filter(Boolean);
        else if (arg === '--help') {
            printHelp();
            process.exit(0);
        } else {
            throw new Error(`Unknown argument: ${arg}`);
        }
    });

    return options;
}

function printHelp() {
    console.log(`Usage:
  node scripts/link-spell-markdown-references.js [--apply] [--file=dnd-tracker-autosave.json]

Options:
  --dry-run                 Report changes without writing. Default.
  --apply                   Write updated spell Markdown into the autosave.
  --no-backup               Do not create a timestamped .bak file with --apply.
  --min-name-length=N       Ignore database names shorter than N. Default: 4.
  --fields=a,b              Spell text fields to process. Default: description,atHigherLevels.

References:
  Simple names become @Stunned.
  Multi-word or punctuation names become @[Accursed Wish].
`);
}

function linkSpellDatabaseReferences(state, options = {}) {
    const fields = options.fields || DEFAULT_FIELDS;
    const spells = Array.isArray(state.spellDatabase) ? state.spellDatabase : [];
    const baseReferences = collectReferences(state, {
        minNameLength: options.minNameLength ?? 4
    });
    const totals = {
        spellsScanned: spells.length,
        spellsChanged: 0,
        fieldsChanged: 0,
        inserted: 0,
        normalized: 0,
        byKind: { condition: 0, spell: 0, monster: 0 }
    };
    const spellChanges = [];

    spells.forEach(spell => {
        const references = baseReferences.filter(reference => !(reference.kind === 'spell' && reference.id === String(spell.id || '')));
        let spellChanged = false;
        const fieldChanges = [];

        fields.forEach(field => {
            if (typeof spell[field] !== 'string' || !spell[field].trim()) return;
            const linked = linkTextReferences(spell[field], references);
            if (linked.text === spell[field]) return;
            spell[field] = linked.text;
            spellChanged = true;
            totals.fieldsChanged += 1;
            totals.inserted += linked.inserted;
            totals.normalized += linked.normalized;
            Object.keys(totals.byKind).forEach(kind => {
                totals.byKind[kind] += linked.byKind[kind] || 0;
            });
            fieldChanges.push({ field, inserted: linked.inserted, byKind: linked.byKind });
        });

        if (spellChanged) {
            totals.spellsChanged += 1;
            spellChanges.push({
                id: String(spell.id || ''),
                name: String(spell.name || ''),
                fields: fieldChanges
            });
        }
    });

    return { totals, spellChanges };
}

function collectReferences(state, { minNameLength = 4 } = {}) {
    const references = [];
    addReferences(references, 'condition', state.conditionDatabase, minNameLength);
    addReferences(references, 'spell', state.spellDatabase, minNameLength);
    addReferences(references, 'monster', state.monsterDatabase, minNameLength);
    return dedupeReferences(references).sort((a, b) => b.name.length - a.name.length || kindRank(a.kind) - kindRank(b.kind));
}

function addReferences(result, kind, items, minNameLength) {
    (Array.isArray(items) ? items : []).forEach(item => {
        const name = String(item?.name || '').trim();
        if (!isUsefulReferenceName(name, minNameLength)) return;
        result.push({
            kind,
            id: String(item.id || `${kind}:${name}`),
            name
        });
    });
}

function dedupeReferences(references) {
    const seen = new Set();
    return references.filter(reference => {
        const key = `${reference.kind}:${normalizeReferenceName(reference.name)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function linkTextReferences(text, references) {
    const protectedRanges = protectedMarkdownRanges(text);
    let index = 0;
    let output = '';
    const byKind = { condition: 0, spell: 0, monster: 0 };
    let inserted = 0;
    let normalized = 0;

    while (index < text.length) {
        const existing = matchExistingReferenceAt(text, index, references);
        if (existing) {
            const next = markdownReferenceSyntax(existing.reference.name);
            output += next;
            index += existing.length;
            if (existing.raw !== next) normalized += 1;
            continue;
        }

        const range = protectedRanges.find(item => item.start === index);
        if (range) {
            output += text.slice(range.start, range.end);
            index = range.end;
            continue;
        }

        const match = matchReferenceAt(text, index, references);
        if (match) {
            output += markdownReferenceSyntax(match.reference.name);
            index += match.reference.name.length;
            inserted += 1;
            byKind[match.reference.kind] += 1;
            continue;
        }

        output += text[index];
        index += 1;
    }

    return { text: output, inserted, normalized, byKind };
}

function matchExistingReferenceAt(text, index, references) {
    if (text[index] !== '@') return null;
    const remaining = text.slice(index);
    const bracket = remaining.match(/^@\[([^\]]+)\]/);
    if (bracket) {
        const reference = findReferenceByName(bracket[1], references);
        return reference ? { reference, raw: bracket[0], length: bracket[0].length } : null;
    }

    const simple = remaining.match(/^@([A-Za-z0-9_'-]+)/);
    if (!simple) return null;
    const reference = findReferenceByName(simple[1], references);
    return reference ? { reference, raw: simple[0], length: simple[0].length } : null;
}

function matchReferenceAt(text, index, references) {
    const previous = index > 0 ? text[index - 1] : '';
    if (previous === '@' || isWordish(previous)) return null;

    for (const reference of references) {
        if (text.slice(index, index + reference.name.length).toLowerCase() !== reference.name.toLowerCase()) continue;
        const next = text[index + reference.name.length] || '';
        if (isWordish(next)) continue;
        return { reference };
    }

    return null;
}

function findReferenceByName(name, references) {
    const normalized = normalizeReferenceName(name);
    return references.find(reference => normalizeReferenceName(reference.name) === normalized) || null;
}

function markdownReferenceSyntax(referenceName) {
    if (isSimpleReferenceName(referenceName)) return `@${referenceName}`;
    return `@[${referenceName}]`;
}

function protectedMarkdownRanges(text) {
    const ranges = [];
    addRanges(ranges, text, /\[[^\]]+\]\([^)]+\)/g);
    addRanges(ranges, text, /@[A-Za-z0-9_'’-]+/g);
    addRanges(ranges, text, /\bhttps?:\/\/\S+/g);
    return mergeRanges(ranges.sort((a, b) => a.start - b.start));
}

function addRanges(ranges, text, pattern) {
    let match;
    while ((match = pattern.exec(text))) {
        ranges.push({ start: match.index, end: match.index + match[0].length });
    }
}

function mergeRanges(ranges) {
    const merged = [];
    ranges.forEach(range => {
        const last = merged[merged.length - 1];
        if (last && range.start <= last.end) {
            last.end = Math.max(last.end, range.end);
        } else {
            merged.push({ ...range });
        }
    });
    return merged;
}

function isUsefulReferenceName(name, minNameLength) {
    if (!name || name.length < minNameLength) return false;
    if (!/[A-Za-z]/.test(name)) return false;
    return true;
}

function isSimpleReferenceName(name) {
    return /^[A-Za-z0-9_'’-]+$/.test(name);
}

function isWordish(char) {
    return /[A-Za-z0-9_'’-]/.test(char);
}

function normalizeReferenceName(name) {
    return String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function kindRank(kind) {
    if (kind === 'condition') return 0;
    if (kind === 'spell') return 1;
    return 2;
}

function timestampForFile() {
    return new Date().toISOString().replace(/[:.]/g, '-');
}

function printSummary(result, options) {
    const mode = options.apply ? 'APPLY' : 'DRY RUN';
    console.log(`${mode}: spell Markdown database references`);
    console.log(`Spells scanned: ${result.totals.spellsScanned}`);
    console.log(`Spells changed: ${result.totals.spellsChanged}`);
    console.log(`Fields changed: ${result.totals.fieldsChanged}`);
    console.log(`References inserted: ${result.totals.inserted}`);
    console.log(`Existing references normalized: ${result.totals.normalized}`);
    console.log(`By kind: conditions=${result.totals.byKind.condition}, spells=${result.totals.byKind.spell}, monsters=${result.totals.byKind.monster}`);
    if (!options.apply) console.log('No file written. Re-run with --apply to update the autosave.');
}

if (require.main === module) {
    try {
        main();
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }
}

module.exports = {
    collectReferences,
    linkSpellDatabaseReferences,
    linkTextReferences,
    markdownReferenceSyntax,
    protectedMarkdownRanges
};
