import type { EpicActionReset, MonsterEpicAction, MonsterEpicOption } from './types';

export function epicLimit(name: string) {
  const match = name.match(/\((\d+)\s*\/\s*(round|turn|encounter|day|rest)\)/i);
  const reset = match?.[2]?.toLowerCase();
  return { maxUses: Number(match?.[1]) || 0, resetOn: (reset === 'round' || !reset ? 'turn' : reset) as EpicActionReset };
}

export function structureEpicAction(action: MonsterEpicAction): MonsterEpicAction {
  const description = String(action.description || '').replace(/\r\n?/g, '\n');
  const headings = [...description.matchAll(/^###\s+(.+?)\s*$/gm)];
  const options = action.options?.length ? action.options : headings.map((heading, index) => {
    const title = heading[1].replace(/\*\*/g, '').trim();
    const limit = epicLimit(title);
    const withoutLimit = title.replace(/\s*\(\d+\s*\/\s*(?:round|turn|encounter|day|rest)\)/i, '').trim();
    const [name, ...cost] = withoutLimit.split(/\s+[—–-]\s+/);
    return {
      name, cost: cost.join(' — '), ...limit, used: 0,
      description: description.slice(heading.index! + heading[0].length, headings[index + 1]?.index ?? description.length).trim()
    };
  });
  return {
    ...action,
    resetOn: action.resetOn || epicLimit(action.name).resetOn,
    description: headings.length && !action.options?.length ? description.slice(0, headings[0].index).trim() : description,
    options: options.map(option => ({ ...option, cost: option.cost || '', resetOn: option.resetOn || 'turn' }))
  };
}

export function epicOptionMarkdown(option: MonsterEpicOption) {
  const reset = { turn: 'Round', encounter: 'Encounter', day: 'Day', rest: 'Rest' }[option.resetOn || 'turn'];
  return `### ${option.name}${option.cost ? ` — ${option.cost}` : ''}${option.maxUses > 0 || (option.resetOn && option.resetOn !== 'turn') ? ` (${option.maxUses}/${reset})` : ''}\n\n${option.description}`;
}

export function epicRecoveryLabel(resetOn?: EpicActionReset) {
  return { turn: 'round', encounter: 'encounter', day: 'day', rest: 'rest' }[resetOn || 'turn'];
}

export function epicBody(description: string) {
  return description.replace(/^\*\*[^*\n]+\*\*[\t ]*/, '').trim();
}
