import { useEffect, useMemo, useState } from 'react';
import type { Character, GameAction, GameState, MonsterAbilities } from '../shared/types';
import { CollapsiblePanel } from '../components/CollapsiblePanel';

interface Props {
  state: GameState;
  submitAction: (action: GameAction) => Promise<unknown>;
  selectedCharacterId?: string | null;
  onSelectCharacter: (characterId: string) => void;
  onBackToCombat: () => void;
}

export function MonstersPage({ state, submitAction, selectedCharacterId, onSelectCharacter, onBackToCombat }: Props) {
  const monsters = state.characters.filter(character => character.type === 'monster');
  const [selectedId, setSelectedId] = useState(selectedCharacterId || monsters[0]?.id || '');
  const selected = useMemo(
    () => monsters.find(character => String(character.id) === String(selectedId)) || monsters[0],
    [monsters, selectedId]
  );

  useEffect(() => {
    if (selectedCharacterId && monsters.some(character => String(character.id) === String(selectedCharacterId))) {
      setSelectedId(String(selectedCharacterId));
    }
  }, [selectedCharacterId]);

  useEffect(() => {
    if (!selectedId && monsters[0]) {
      const fallback = String(monsters[0].id);
      setSelectedId(fallback);
      onSelectCharacter(fallback);
    } else if (selectedId && monsters.length > 0 && !monsters.some(character => String(character.id) === String(selectedId))) {
      const fallback = String(monsters[0].id);
      setSelectedId(fallback);
      onSelectCharacter(fallback);
    }
  }, [monsters, selectedId, onSelectCharacter]);

  function selectCharacter(characterId: string) {
    setSelectedId(characterId);
    onSelectCharacter(characterId);
  }

  if (!selected) {
    return (
      <section className="section">
        <div className="section-title-row">
          <div>
            <h2>Monster Abilities</h2>
            <p>No monsters in combat.</p>
          </div>
          <button className="btn" onClick={onBackToCombat}>Back to Combat</button>
        </div>
      </section>
    );
  }

  return (
    <div className="stack">
      <section className="section">
        <div className="section-title-row">
          <div>
            <h2>Monster Abilities</h2>
            <p>DM-only resource and ability tracking.</p>
          </div>
          <div className="button-row">
            <select value={String(selected.id)} onChange={event => selectCharacter(event.target.value)}>
              {monsters.map(monster => <option key={monster.id} value={String(monster.id)}>{monster.name}</option>)}
            </select>
            <button className="btn" onClick={onBackToCombat}>Back to Combat</button>
          </div>
        </div>
      </section>
      <MonsterDetail monster={selected} submitAction={submitAction} />
    </div>
  );
}

function MonsterDetail({ monster, submitAction }: { monster: Character; submitAction: Props['submitAction'] }) {
  const abilities: MonsterAbilities = monster.monsterAbilities || {};
  const legendary = abilities.legendaryActions;

  return (
    <>
      <section className="section">
        <h2>{monster.name}</h2>
        <div className="stats-grid">
          <div className="stat"><span>Power</span><strong>{monster.currentPower || 0}/{monster.maxPower || 0}</strong></div>
          <div className="stat"><span>Spellcasting</span><strong>{abilities.spellcastingType || 'none'}</strong></div>
          <div className="stat"><span>Legendary</span><strong>{legendary?.enabled ? `${legendary.used || 0}/${legendary.max || 0}` : '-'}</strong></div>
        </div>
        <div className="item-list">
          {(abilities.customFeatures || []).map((feature, index) => (
            <div className="item-row" key={`${feature.name}-${index}`}>
              <strong>{feature.name}</strong>
              <span>{feature.used}/{feature.maxUses}</span>
            </div>
          ))}
        </div>
      </section>
      <CollapsiblePanel title="Monster controls" summary="Adjust power and other moment-to-moment resources.">
        <div className="button-row">
          <button className="btn danger" onClick={() => submitAction({ type: 'character.updatePower', payload: { characterId: monster.id, value: (monster.currentPower || 0) - 1 } })}>Power -1</button>
          <button className="btn success" onClick={() => submitAction({ type: 'character.updatePower', payload: { characterId: monster.id, value: (monster.currentPower || 0) + 1 } })}>Power +1</button>
        </div>
      </CollapsiblePanel>
    </>
  );
}
