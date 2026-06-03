/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CollapsiblePanel, CollapsiblePanelGroup } from '../../src/components/CollapsiblePanel';
import { MarkdownEditor, MarkdownRenderer } from '../../src/components/Markdown';
import { Toolbelt } from '../../src/components/Toolbelt';
import { CombatPage } from '../../src/pages/CombatPage';
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
        <Toolbelt role="dm" state={state} />
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
    render(<Toolbelt role="player" state={gameState()} />);

    const toolbelt = screen.getByLabelText('Table toolbelt');
    expect(within(toolbelt).queryByRole('button', { name: 'Party Checks' })).not.toBeInTheDocument();
    fireEvent.click(within(toolbelt).getByRole('button', { name: 'Dice Roller' }));
    expect(screen.getByRole('heading', { name: 'Dice Roller' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Dice expression'), { target: { value: '4d4+7d6+10' } });
    fireEvent.change(screen.getByLabelText('Roll mode'), { target: { value: 'advantage' } });
    fireEvent.click(screen.getByLabelText('Reroll 1s'));
    fireEvent.click(screen.getByRole('button', { name: 'Roll' }));
    expect(within(screen.getByLabelText('Dice log')).getByText('4d4+7d6+10')).toBeInTheDocument();
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
    schemaVersion: 3,
    characters: [character()],
    combatState: { active: false, currentTurn: 0, round: 1, playedThisRound: [] },
    monsterDatabase: [],
    magicItemDatabase: [],
    potionDatabase: [],
    conditionDatabase: [],
    itemDatabase: [],
    actionLog: [],
    redoStacks: {},
    nextSequence: 1,
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
