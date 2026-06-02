const crypto = require('crypto');

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function makeId(prefix = 'id') {
    return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function toNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

module.exports = {
    clone,
    makeId,
    clamp,
    toNumber
};
