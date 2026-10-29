import type { ActionType, Character } from './types';

export const ACTION_TYPES: Array<{ value: ActionType; label: string; plural: string }> = [
  { value: 'action', label: 'Action', plural: 'Actions / Attacks' },
  { value: 'bonus', label: 'Bonus action', plural: 'Bonus Actions' },
  { value: 'reaction', label: 'Reaction', plural: 'Reactions' }
];

export function actionTypeLabel(type?: ActionType) {
  return ACTION_TYPES.find(item => item.value === type)?.label || 'Action';
}

export function requiresReaction(action: { actionType?: ActionType; consumesReaction?: boolean }) {
  return action.actionType === 'reaction' && action.consumesReaction !== false;
}

export function availableReactions(character: Character) {
  return character.currentReactions ?? character.maxReactions ?? 1;
}
