const { makeId } = require('./utils');

function epicLimit(name) {
    const match = String(name || '').match(/\((\d+)\s*\/\s*(round|turn|encounter|day|rest)\)/i);
    const reset = match?.[2]?.toLowerCase();
    return { maxUses: Number(match?.[1]) || 0, resetOn: reset === 'round' || !reset ? 'turn' : reset };
}

function normalizeEpicAction(action) {
    const source = action || {};
    const id = String(source.id || makeId('epic'));
    const description = String(source.description || '').replace(/\r\n?/g, '\n');
    const headings = [...description.matchAll(/^###\s+(.+?)\s*$/gm)];
    // Upgrade previously imported Markdown groups without requiring a re-import.
    const legacyOptions = headings.map((heading, index) => {
        const title = heading[1].replace(/\*\*/g, '').trim();
        const [name, ...cost] = title.replace(/\s*\(\d+\s*\/\s*(?:round|turn|encounter|day|rest)\)/i, '').trim().split(/\s+[—–-]\s+/);
        return { name, cost: cost.join(' — '), ...epicLimit(title), used: 0,
            description: description.slice(heading.index + heading[0].length, headings[index + 1]?.index ?? description.length).trim() };
    });
    const options = Array.isArray(source.options) && source.options.length ? source.options : legacyOptions;
    const resetOn = ['turn', 'encounter', 'day', 'rest'].includes(source.resetOn) ? source.resetOn : epicLimit(source.name).resetOn;
    const max = Number(source.maxUses ?? 1);
    return {
        id,
        name: String(source.name || 'Epic Action'),
        description: legacyOptions.length && !source.options?.length ? description.slice(0, headings[0].index).trim() : description,
        maxUses: Number.isFinite(max) ? Math.max(0, Math.floor(max)) : 1,
        used: Math.max(0, Number(source.used) || 0),
        resetOn,
        options: options.map((option, index) => {
            const normalized = normalizeEpicAction({ ...option, id: option.id || `${id}_option_${index}`, options: [], description: '' });
            delete normalized.options;
            return { ...normalized, description: String(option.description || ''), cost: String(option.cost || '') };
        })
    };
}

function resetEpicResources(monster, resetOn) {
    for (const action of monster.monsterAbilities?.epicActions?.actions || []) {
        if ((action.resetOn || 'turn') === resetOn) action.used = 0;
        for (const option of action.options || []) {
            if ((option.resetOn || 'turn') === resetOn) option.used = 0;
        }
    }
}

module.exports = { normalizeEpicAction, resetEpicResources };
