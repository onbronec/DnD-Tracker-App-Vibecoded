import type { Character } from './types';

export function castingResource(character: Character, level: string) {
  if (level === 'cantrip') return { kind: 'free' as const, label: 'Cantrip', available: Infinity, max: 0 };
  const casting = character.casting;
  if (casting?.type === 'divineSpark' && /^epic[1-3]$/.test(level)) {
    const active = character.effects.some(effect => String(typeof effect === 'string' ? effect : effect.name).toLowerCase() === (casting.sparkCondition || 'Divine Spark').toLowerCase());
    const feature = character.customFeatures.find(item => item.id === casting.sparkFeatureId);
    return { kind: 'spark' as const, label: casting.sparkCondition || 'Divine Spark', available: (active ? 1 : 0) + Math.max(0, (feature?.maxUses || 0) - (feature?.used || 0)), max: (feature?.maxUses || 0) + (active ? 1 : 0), feature, active };
  }
  const featureId = casting?.type === 'warlock' ? casting.featureByLevel?.[level] : null;
  if (featureId) {
    const feature = character.customFeatures.find(item => item.id === featureId);
    return { kind: 'feature' as const, label: feature?.name || 'Missing casting resource', available: Math.max(0, (feature?.maxUses || 0) - (feature?.used || 0)), max: feature?.maxUses || 0, feature };
  }
  const slots = character.spellSlots[level];
  return { kind: 'slot' as const, label: /^epic/.test(level) ? `Epic ${level.slice(-1)}` : `Level ${level}`, available: Math.max(0, (slots?.max || 0) - (slots?.used || 0)), max: slots?.max || 0 };
}

export function castingLevels(character: Character) {
  return [...new Set([
    ...Object.keys(character.spellSlots || {}).filter(level => character.spellSlots[level].max > 0),
    ...(character.casting?.type === 'warlock' ? Object.keys(character.casting.featureByLevel || {}) : []),
    ...(character.casting?.type === 'divineSpark' ? ['epic1', 'epic2', 'epic3'] : [])
  ])].sort((a, b) => (a.startsWith('epic') ? 9 + Number(a.slice(-1)) : Number(a)) - (b.startsWith('epic') ? 9 + Number(b.slice(-1)) : Number(b)));
}
