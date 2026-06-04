/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CollapsiblePanel, CollapsiblePanelGroup } from '../../src/components/CollapsiblePanel';
import { MarkdownEditor, MarkdownRenderer } from '../../src/components/Markdown';
import { SearchPicker } from '../../src/components/SearchPicker';
import { Toolbelt } from '../../src/components/Toolbelt';
import { CombatPage } from '../../src/pages/CombatPage';
import { DatabasesPage } from '../../src/pages/DatabasesPage';
import { InventoryPage } from '../../src/pages/InventoryPage';
import { SpellsPage } from '../../src/pages/SpellsPage';
import type { Character, GameAction, GameState } from '../../src/shared/types';
import { adjustedAbilityScores, saveBonus, skillBonus } from '../../src/shared/characterSheet';

describe('visual UX helpers', () => {
  it('keeps collapsible panels closed by default and opens on demand', () => {
    render(
      <CollapsiblePanel title="Add item" summary="Create records.">
        <label htmlFor="hidden-name">Hidden field</label>
        <input id="hidden-name" />
      </CollapsiblePanel>
    );

    expect(screen.queryByLabelText('Hidden field')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Add item/i }));
    expect(screen.getByLabelText('Hidden field')).toBeInTheDocument();
  });

  it('renders Markdown without turning unsafe HTML into DOM', () => {
    render(<MarkdownRenderer text={'## Treasure\n\n**Bold** and *italic*\n\n<script>alert(1)</script>'} />);

    expect(screen.getByRole('heading', { name: 'Treasure' })).toBeInTheDocument();
    expect(screen.getByText('Bold')).toBeInTheDocument();
    expect(screen.getByText('italic')).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
    expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument();
  });

  it('opens only one horizontal expander panel at a time', () => {
    render(
      <CollapsiblePanelGroup
        panels={[
          { id: 'one', title: 'One', content: <p>First body</p> },
          { id: 'two', title: 'Two', content: <p>Second body</p> }
        ]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /One/i }));
    expect(screen.getByText('First body')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Two/i }));
    expect(screen.queryByText('First body')).not.toBeInTheDocument();
    expect(screen.getByText('Second body')).toBeInTheDocument();
  });

  it('uses readable Markdown toolbar labels and separates view actions', () => {
    render(<MarkdownEditor value="" onChange={vi.fn()} label="Item notes" />);

    expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Italic' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Header' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preview' })).toHaveClass('markdown-preview-toggle');
    expect(screen.getByRole('button', { name: 'Pop out' })).toHaveClass('markdown-popout');
  });

  it('renders search as dynamic result cards instead of a select-only picker', () => {
    const onSelect = vi.fn();
    render(
      <SearchPicker
        items={[{ id: 'burning', name: 'Burning', kind: 'debuff', description: 'Ongoing fire.' }]}
        query="burn"
        onQueryChange={vi.fn()}
        selectedId="burning"
        onSelect={onSelect}
        placeholder="Search conditions"
        getId={item => item.id}
        getLabel={item => item.name}
        getMeta={item => item.kind}
        getDescription={item => item.description}
      />
    );

    expect(screen.getByRole('option', { name: /Burning/i })).toHaveClass('search-result');
    fireEvent.click(screen.getByRole('option', { name: /Burning/i }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ name: 'Burning' }));
  });
});

describe('page visual behavior', () => {
  it('collapses combat setup panels and colors condition tags by kind', () => {
    const submitAction = vi.fn(async (_action: GameAction) => undefined);
    render(
      <CombatPage
        state={gameState({
          characters: [character({ effects: [{ name: 'Bless' }] })],
          conditionDatabase: [{ id: 'bless', name: 'Bless', kind: 'buff', description: 'Add **1d4** to attacks.' }]
        })}
        role="dm"
        submitAction={submitAction}
        onOpenSpells={vi.fn()}
        onOpenInventory={vi.fn()}
        onOpenMonsters={vi.fn()}
      />
    );

    expect(screen.queryByTestId('add-character-form')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Add character \/ monster/i }));
    expect(screen.getByTestId('add-character-form')).toBeInTheDocument();

    const effect = within(screen.getByTestId('character-Ayla')).getByRole('button', { name: 'Bless' });
    expect(effect).toHaveClass('effect-buff');
    expect(effect).toHaveAttribute('data-tooltip', 'Add **1d4** to attacks.');
    fireEvent.click(effect);
    expect(submitAction).toHaveBeenCalledWith({
      type: 'effect.remove',
      payload: { characterId: 'ayla', index: 0 }
    });
  });

  it('opens condition management for dice effects and shows dice text', () => {
    const submitAction = vi.fn(async (_action: GameAction) => undefined);
    render(
      <CombatPage
        state={gameState({
          characters: [character({ effects: [{ name: 'Burning', diceCount: 2, diceSides: 4, damageType: 'fire' }] })],
          conditionDatabase: [{ id: 'burning', name: 'Burning', kind: 'debuff', description: 'Ongoing fire.', hasDice: true, defaultDiceCount: 2, defaultDiceSides: 4, defaultDamageType: 'fire' }]
        })}
        role="dm"
        submitAction={submitAction}
        onOpenSpells={vi.fn()}
        onOpenInventory={vi.fn()}
        onOpenMonsters={vi.fn()}
      />
    );

    const effect = within(screen.getByTestId('character-Ayla')).getByRole('button', { name: 'Burning 2d4 fire' });
    fireEvent.click(effect);
    expect(screen.getByRole('heading', { name: 'Conditions for Ayla' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save dice' })).toBeInTheDocument();
  });

  it('shows combat-style health and conditions on Character Sheets', () => {
    const submitAction = vi.fn(async (_action: GameAction) => undefined);
    render(
      <SpellsPage
        state={gameState({
          characters: [character({ effects: [{ name: 'Bless' }], currentHp: 22, maxHp: 30 })],
          conditionDatabase: [{ id: 'bless', name: 'Bless', kind: 'buff', description: 'Add 1d4.' }]
        })}
        role="player"
        submitAction={submitAction}
        selectedCharacterId="ayla"
        onSelectCharacter={vi.fn()}
        onBackToCombat={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: 'Health & Conditions' })).toBeInTheDocument();
    expect(screen.getByText('22/30')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bless' })).toHaveClass('effect-buff');
    fireEvent.change(screen.getByTestId('sheet-heal-Ayla'), { target: { value: '5' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Apply' })[1]);
    expect(submitAction).toHaveBeenCalledWith({
      type: 'character.adjustHp',
      payload: { characterId: 'ayla', amount: 5 }
    });
  });

  it('labels level 10 to 12 spell slots as Epic slots', () => {
    render(
      <SpellsPage
        state={gameState({
          characters: [character({ spellSlots: { 10: { max: 1, used: 0 }, 11: { max: 1, used: 0 }, 12: { max: 1, used: 0 } } })]
        })}
        role="player"
        submitAction={vi.fn(async (_action: GameAction) => undefined)}
        selectedCharacterId="ayla"
        onSelectCharacter={vi.fn()}
        onBackToCombat={vi.fn()}
      />
    );

    expect(screen.getByText('Epic 1: 1/1')).toBeInTheDocument();
    expect(screen.getByText('Epic 2: 1/1')).toBeInTheDocument();
    expect(screen.getByText('Epic 3: 1/1')).toBeInTheDocument();
  });

  it('shows spell database tab with searchable spell cards', () => {
    render(
      <DatabasesPage
        state={gameState({ spellDatabase: [spell({ id: 'shield', name: 'Shield', levelKey: '1', levelLabel: 'Level 1', school: 'Abjuration' })] })}
        role="player"
        submitAction={vi.fn(async (_action: GameAction) => undefined)}
        onBackToCombat={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Spells' }));
    fireEvent.change(screen.getByPlaceholderText('Search Spells'), { target: { value: 'shield' } });
    expect(screen.getByRole('heading', { name: 'Shield' })).toBeInTheDocument();
    expect(screen.getByText(/Level 1/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Spell' })).not.toBeInTheDocument();
  });

  it('shows known spells, opens spell details and edits learned/prepared spells', () => {
    const submitAction = vi.fn(async (_action: GameAction) => undefined);
    const state = gameState({
      spellDatabase: [
        spell({ id: 'light', name: 'Light', levelKey: 'cantrip', levelLabel: 'Cantrip', description: '**Glow**.' }),
        spell({ id: 'shield', name: 'Shield', levelKey: '1', levelLabel: 'Level 1', description: 'Reaction defense.' }),
        spell({ id: 'song', name: 'Holding Song', levelKey: 'special-voidsong', levelLabel: 'Voidsong', description: 'Song Power: 6' })
      ],
      characters: [character({
        spellbook: {
          knownSpellIds: ['light', 'shield', 'song'],
          preparedSpellIds: ['song'],
          preparesSpells: true,
          preparedNonEpicMax: 1,
          preparedEpicMax: 0
        }
      })]
    });

    render(
      <SpellsPage
        state={state}
        role="player"
        submitAction={submitAction}
        selectedCharacterId="ayla"
        onSelectCharacter={vi.fn()}
        onBackToCombat={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: 'Spells Known' })).toBeInTheDocument();
    expect(screen.getByTestId('spell-Shield')).toHaveClass('unprepared');
    fireEvent.click(screen.getByTestId('spell-Light'));
    expect(screen.getByRole('heading', { name: 'Light' })).toBeInTheDocument();
    expect(screen.getByText('Glow')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    fireEvent.click(screen.getByRole('button', { name: 'Edit spell list' }));
    expect(screen.getByRole('heading', { name: 'Edit Ayla Spell List' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save spellcasting settings' }));
    expect(submitAction).toHaveBeenCalledWith(expect.objectContaining({ type: 'spellbook.settings.update' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    fireEvent.click(screen.getByRole('button', { name: 'Change prepared spells' }));
    fireEvent.click(screen.getByLabelText(/Shield/));
    fireEvent.click(screen.getByRole('button', { name: 'Save prepared spells' }));
    expect(submitAction).toHaveBeenCalledWith(expect.objectContaining({
      type: 'spellbook.prepared.set',
      payload: expect.objectContaining({ characterId: 'ayla', preparedSpellIds: expect.arrayContaining(['shield', 'song']) })
    }));
  });

  it('shows sheet navigation and party-wide DM checks from the global toolbelt', () => {
    const state = gameState({
      characters: [
        character({
          abilityScores: { strength: 18, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 },
          savingThrowProficiencies: ['strength'],
          proficiencyBonus: 4
        }),
        character({
          id: 'borin',
          name: 'Borin',
          abilityScores: { strength: 12, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 },
          proficiencyBonus: 2
        })
      ]
    });

    render(
      <>
        <SpellsPage
          state={state}
          role="dm"
          submitAction={vi.fn(async (_action: GameAction) => undefined)}
          selectedCharacterId="ayla"
          onSelectCharacter={vi.fn()}
          onBackToCombat={vi.fn()}
        />
        <Toolbelt role="dm" state={state} submitAction={vi.fn(async (_action: GameAction) => undefined)} />
      </>
    );

    expect(screen.getByRole('heading', { name: 'Character Sheets' }).closest('section')).toHaveClass('page-sticky-section');
    const sheetIndex = screen.getByLabelText('Character sheet sections');
    expect(within(sheetIndex).queryByRole('button', { name: 'Character' })).not.toBeInTheDocument();
    expect(within(sheetIndex).getByRole('button', { name: 'Health & Conditions' })).toHaveClass('active');
    expect(within(screen.getByLabelText('Table toolbelt')).getByRole('button', { name: 'Party Checks' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Party Checks' }));
    expect(screen.getByRole('heading', { name: 'Party Checks' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Difficulty class'), { target: { value: '15' } });
    const table = document.querySelector('.party-check-table') as HTMLElement;
    expect(within(table).getByText('STR Save')).toBeInTheDocument();
    expect(within(table).getByText('Chance')).toBeInTheDocument();
    expect(within(table).getByText('Ayla')).toBeInTheDocument();
    expect(within(table).getByText('Borin')).toBeInTheDocument();
    expect(within(table).getByText('+8')).toBeInTheDocument();
    expect(within(table).getByText('+1')).toBeInTheDocument();
    expect(within(table).getByText('70%')).toBeInTheDocument();
    expect(within(table).getByText('35%')).toBeInTheDocument();
  });

  it('lets players use the dice roller but not DM-only party checks', () => {
    const submitAction = vi.fn(async (_action: GameAction) => undefined);
    render(<Toolbelt role="player" state={gameState()} submitAction={submitAction} />);

    const toolbelt = screen.getByLabelText('Table toolbelt');
    expect(within(toolbelt).queryByRole('button', { name: 'Party Checks' })).not.toBeInTheDocument();
    fireEvent.click(within(toolbelt).getByRole('button', { name: 'Dice Roller' }));
    expect(screen.getByRole('heading', { name: 'Dice Roller' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Dice expression'), { target: { value: '4d4+7d6+10' } });
    fireEvent.change(screen.getByLabelText('Roll mode'), { target: { value: 'advantage' } });
    fireEvent.click(screen.getByLabelText('Reroll 1s'));
    fireEvent.click(screen.getByRole('button', { name: 'Roll' }));
    expect(submitAction).toHaveBeenCalledWith(expect.objectContaining({
      type: 'toolbelt.dice.add',
      payload: expect.objectContaining({ expression: '4d4+7d6+10', mode: 'advantage', rerollOnes: true })
    }));
  });

  it('uses Wisdom for Crow aura and Intelligence for Astria aura', () => {
    const state = gameState({
      characters: [
        character({ name: 'Crow', abilityScores: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 18, charisma: 10 } }),
        character({ id: 'astria', name: 'Astria', abilityScores: { strength: 10, dexterity: 10, constitution: 10, intelligence: 16, wisdom: 10, charisma: 10 } })
      ]
    });

    render(<Toolbelt role="dm" state={state} submitAction={vi.fn(async (_action: GameAction) => undefined)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Party Checks' }));
    expect(screen.getByLabelText('Crow aura +4')).toBeInTheDocument();
    expect(screen.getByLabelText('Astria aura +3')).toBeInTheDocument();
  });

  it('adds per-character inspiration and Funyana half proficiency on unproficient checks', () => {
    const state = gameState({
      characters: [
        character({
          id: 'funyana',
          name: 'Funyana',
          proficiencyBonus: 5,
          abilityScores: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 },
          skillProficiencies: [],
          skillExpertise: []
        })
      ]
    });

    render(<Toolbelt role="dm" state={state} submitAction={vi.fn(async (_action: GameAction) => undefined)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Party Checks' }));
    fireEvent.change(screen.getByDisplayValue('Saving throw'), { target: { value: 'ability' } });
    fireEvent.change(screen.getByLabelText('Difficulty class'), { target: { value: '15' } });
    expect(screen.getByText(/Funyana \+2/)).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('d12'));
    expect(screen.getByLabelText('d12')).toBeChecked();
  });

  it('recalculates stealth pass/fail when Pass without Trace toggles', () => {
    const state = gameState({ characters: [character({ skillProficiencies: [] })] });
    render(<Toolbelt role="dm" state={state} submitAction={vi.fn(async (_action: GameAction) => undefined)} />);

    fireEvent.click(screen.getByRole('button', { name: 'Stealth' }));
    fireEvent.change(screen.getByLabelText('Stealth DC'), { target: { value: '15' } });
    fireEvent.change(screen.getByLabelText('Ayla stealth'), { target: { value: '10' } });
    expect(screen.getByText('Successes 0 / Failures 1')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Pass without Trace +10'));
    expect(screen.getByText('Successes 1 / Failures 0')).toBeInTheDocument();
  });

  it('shows a calendar month grid and submits edited day events', () => {
    const submitAction = vi.fn(async (_action: GameAction) => undefined);
    const state = gameState({
      toolbelt: {
        diceRolls: {},
        improvNames: [],
        calendar: {
          weekday: 'Tuesday',
          day: 23,
          month: 'December',
          year: 502,
          records: [{ id: 'event-1', dateKey: '502-December-24', text: '**Festival**', timestamp: '2026-06-03T00:00:00.000Z' }]
        },
        notes: []
      }
    });

    render(<Toolbelt role="dm" state={state} submitAction={submitAction} />);
    fireEvent.click(screen.getByRole('button', { name: 'Calendar' }));
    expect(screen.getByText('December 502 AE')).toBeInTheDocument();
    const day24 = screen.getAllByRole('button').find(button => button.textContent?.startsWith('24'));
    expect(day24).toBeTruthy();
    fireEvent.click(day24 as HTMLElement);
    expect(screen.getByText('Festival')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Edit event'), { target: { value: '**Festival edited**' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Event' }));
    expect(submitAction).toHaveBeenCalledWith(expect.objectContaining({
      type: 'toolbelt.calendar.record.upsert',
      payload: expect.objectContaining({ id: 'event-1', dateKey: '502-December-24', text: '**Festival edited**' })
    }));
  });

  it('orders notepad notes by date latest first', () => {
    const state = gameState({
      toolbelt: {
        diceRolls: {},
        improvNames: [],
        calendar: { weekday: 'Tuesday', day: 23, month: 'December', year: 502, records: [] },
        notes: [
          { id: 'old', date: '2026-01-01', title: 'Old Note', text: 'Old', timestamp: '2026-01-01T00:00:00.000Z' },
          { id: 'new', date: '2026-06-03', title: 'New Note', text: 'New', timestamp: '2026-06-03T00:00:00.000Z' }
        ]
      }
    });

    render(<Toolbelt role="dm" state={state} submitAction={vi.fn(async (_action: GameAction) => undefined)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Notepad' }));
    const noteHeadings = screen.getAllByRole('heading', { level: 3 }).map(heading => heading.textContent);
    expect(noteHeadings).toEqual(['New Note', 'Old Note']);
  });

  it('keeps inventory item actions inside the item modal', () => {
    const submitAction = vi.fn(async (_action: GameAction) => undefined);
    render(
      <InventoryPage
        state={gameState({
          characters: [
            character({
              inventory: {
                ...emptyInventory(),
                magicItems: [{ name: 'Moonblade', quantity: 1, description: '**Silver** sword', attuned: false }]
              }
            }),
            character({ id: 'borin', name: 'Borin' })
          ]
        })}
        role="player"
        submitAction={submitAction}
        selectedCharacterId="ayla"
        onSelectCharacter={vi.fn()}
        onBackToCombat={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: 'Inventory' }).closest('section')).toHaveClass('page-sticky-section');
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('inventory-item-Moonblade'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('dialog').querySelector('.item-modal-card')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveClass('item-modal-backdrop');
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Transfer' })).toBeInTheDocument();
    expect(screen.getByLabelText('Attuned')).toBeInTheDocument();
    expect(screen.getByText('Silver')).toBeInTheDocument();
    expect(screen.queryByText('Magic item', { selector: '.type-pill' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByPlaceholderText('Item name'), { target: { value: 'Edited Moonblade' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save edits' }));
    expect(submitAction).toHaveBeenCalledWith(expect.objectContaining({
      type: 'inventory.item.update',
      payload: expect.objectContaining({
        collection: 'magicItems',
        item: expect.objectContaining({ name: 'Edited Moonblade' })
      })
    }));
  });
});

describe('character sheet math', () => {
  it('computes saves and skills with proficiency, expertise and temporary ability score effects', () => {
    const hero = character({
      proficiencyBonus: 4,
      abilityScores: { strength: 18, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 12, charisma: 10 },
      savingThrowProficiencies: ['strength'],
      skillProficiencies: ['athletics'],
      skillExpertise: ['perception'],
      effects: [{ name: 'Ability Score Increased', ability: 'wisdom', value: 4, level: 4 }]
    });

    const adjusted = adjustedAbilityScores(hero);
    expect(adjusted.scores.wisdom).toBe(16);
    expect(saveBonus(hero, 'strength', adjusted.scores)).toBe(8);
    expect(skillBonus(hero, 'athletics', adjusted.scores)).toBe(8);
    expect(skillBonus(hero, 'perception', adjusted.scores)).toBe(11);
  });
});

function gameState(overrides: Partial<GameState> = {}): GameState {
  return {
    schemaVersion: 4,
    characters: [character()],
    combatState: { active: false, currentTurn: 0, round: 1, playedThisRound: [] },
    monsterDatabase: [],
    magicItemDatabase: [],
    potionDatabase: [],
    conditionDatabase: [],
    spellDatabase: [],
    itemDatabase: [],
    actionLog: [],
    redoStacks: {},
    nextSequence: 1,
    toolbelt: {
      diceRolls: {},
      improvNames: [],
      calendar: { weekday: 'Tuesday', day: 23, month: 'December', year: 502, records: [] },
      notes: []
    },
    ...overrides
  };
}

function character(overrides: Partial<Character> = {}): Character {
  return {
    id: 'ayla',
    name: 'Ayla',
    type: 'player',
    maxHp: 30,
    currentHp: 30,
    tempHp: 0,
    ac: 15,
    initBonus: 2,
    initiative: null,
    effects: [],
    activeInCombat: true,
    revealedToPlayers: true,
    spellcasterLevel: 1,
    spellSlots: {},
    customFeatures: [],
    hitDice: { max: 1, current: 1 },
    proficiencyBonus: 2,
    abilityScores: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 },
    savingThrowProficiencies: [],
    skillProficiencies: [],
    skillExpertise: [],
    inventory: emptyInventory(),
    spellbook: { knownSpellIds: [], preparedSpellIds: [], preparesSpells: false, preparedNonEpicMax: 0, preparedEpicMax: 0 },
    ...overrides
  };
}

function spell(overrides = {}) {
  return {
    id: 'spell',
    name: 'Spell',
    levelKey: '1',
    levelLabel: 'Level 1',
    classes: ['Wizard'],
    school: 'Evocation',
    castingTime: 'Action',
    range: 'Self',
    components: 'V',
    duration: 'Instantaneous',
    ritual: false,
    source: 'Test',
    page: '1',
    description: 'Spell text',
    atHigherLevels: '',
    tags: [],
    ...overrides
  };
}

function emptyInventory() {
  return {
    currency: { manaCoins: 0, platinum: 0, gold: 0, silver: 0, copper: 0 },
    spellComponents: [],
    potions: [],
    scrolls: [],
    generalItems: [],
    magicItems: []
  };
}
