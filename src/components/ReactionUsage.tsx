import type { Character } from '../shared/types';
import { availableReactions } from '../shared/actions';

export function ReactionUsage({ character }: { character: Character }) {
  const max = character.maxReactions ?? 1;
  const available = availableReactions(character);
  return <span className="reaction-usage" aria-label="Used reactions" title={`${available} reactions available`}>R {Math.max(0, max - available)}/{max} used</span>;
}
