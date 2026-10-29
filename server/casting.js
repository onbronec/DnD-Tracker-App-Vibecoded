const { clone } = require('./utils');

function normalizeActionSettings(source) {
    const actionType = ['action', 'bonus', 'reaction'].includes(source.actionType) ? source.actionType : 'action';
    return { actionType, consumesReaction: actionType === 'reaction' && source.consumesReaction !== false };
}

function spendActionReaction(character, action) {
    if (action.actionType !== 'reaction' || action.consumesReaction === false) return;
    if ((character.currentReactions ?? character.maxReactions ?? 1) < 1) throw new Error('Postava nema dostupnou reakci.');
    character.currentReactions = (character.currentReactions ?? character.maxReactions ?? 1) - 1;
}

function normalizeFeatureActions(actions) {
    return (Array.isArray(actions) ? actions : []).filter(action => action && String(action.name || '').trim()).map((action, index) => ({
        id: String(action.id || `feature_action_${index}`),
        name: String(action.name).trim(), description: String(action.description || ''),
        ...normalizeActionSettings(action)
    }));
}

function normalizeFeatures(features) {
    return (Array.isArray(features) ? features : []).map((feature, index) => ({
        ...clone(feature), id: String(feature.id || `legacy_feature_${index}`),
        description: String(feature.description || ''), isAction: Boolean(feature.isAction),
        ...normalizeActionSettings(feature),
        actions: normalizeFeatureActions(feature.actions)
    }));
}

function normalizeCasting(source, character) {
    const features = character.customFeatures || [];
    const byName = name => features.find(feature => feature.name.toLowerCase() === name.toLowerCase())?.id;
    if (!source && character.type === 'player') {
        if (character.name.toLowerCase() === 'nif' && byName('Warlock Spells')) {
            const featureByLevel = Object.fromEntries(['1', '2', '3', '4', '5'].map(level => [level, byName('Warlock Spells')]));
            ['Asuryan Blessing', 'Force Cage', 'Storm of Light-Lings', 'Foresight'].forEach((name, index) => {
                if (byName(name)) featureByLevel[String(index + 6)] = byName(name);
            });
            source = { type: 'warlock', featureByLevel };
        } else if (character.name.toLowerCase() === 'anir' && byName('Divine Spark')) {
            source = { type: 'divineSpark', sparkFeatureId: byName('Divine Spark') };
        }
    }
    const current = source || {};
    return {
        type: ['standard', 'warlock', 'divineSpark'].includes(current.type) ? current.type : 'standard',
        featureByLevel: Object.fromEntries(Object.entries(current.featureByLevel || {}).filter(([key, id]) => /^[1-9]$/.test(key) && typeof id === 'string' && id)),
        sparkFeatureId: String(current.sparkFeatureId || ''),
        sparkCondition: String(current.sparkCondition || 'Divine Spark')
    };
}

function featureFor(character, payload) {
    return payload.featureId ? character.customFeatures.find(feature => feature.id === payload.featureId) : character.customFeatures[Number(payload.index)];
}

function consumeSpark(character) {
    if (character.casting?.type !== 'divineSpark') throw new Error('Postava nema Divine Spark casting.');
    const index = character.effects.findIndex(effect => String(effect.name || effect).toLowerCase() === character.casting.sparkCondition.toLowerCase());
    if (index >= 0) character.effects.splice(index, 1);
    else {
        const feature = character.customFeatures.find(item => item.id === character.casting.sparkFeatureId);
        if (!feature || (feature.used || 0) >= feature.maxUses) throw new Error('Divine Spark neni dostupny.');
        feature.used = (feature.used || 0) + 1;
    }
}

module.exports = { normalizeFeatures, normalizeFeatureActions, normalizeActionSettings, spendActionReaction, normalizeCasting, featureFor, consumeSpark };
