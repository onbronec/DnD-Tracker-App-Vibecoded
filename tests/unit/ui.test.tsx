/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CollapsiblePanel, CollapsiblePanelGroup } from '../../src/components/CollapsiblePanel';
import { DatabaseReferenceProvider } from '../../src/components/DatabaseReferences';
import { MarkdownEditor, MarkdownRenderer } from '../../src/components/Markdown';
import { SearchPicker } from '../../src/components/SearchPicker';
import { Toolbelt } from '../../src/components/Toolbelt';
import { NumberInput } from '../../src/components/NumberInput';
import { CombatPage } from '../../src/pages/CombatPage';
import { DatabasesPage } from '../../src/pages/DatabasesPage';
import { EncounterPlannerPage } from '../../src/pages/EncounterPlannerPage';
import { MonsterEditorPage } from '../../src/pages/MonsterEditorPage';
import { InventoryPage } from '../../src/pages/InventoryPage';
import { SpellsPage } from '../../src/pages/SpellsPage';
import type { Character, GameAction, GameState } from '../../src/shared/types';
import { abilityCheckBonus, adjustedAbilityScores, armorClass, effectiveMaxHp, initiativeBonus, saveBonus, skillBonus, spellAttackBonus, spellSaveDc } from '../../src/shared/characterSheet';

describe('visual UX helpers', () => {
  it('keeps number drafts empty through server patches and commits once on blur or Enter', () => {
    const commit = vi.fn();
    const { rerender } = render(<NumberInput value={11} onCommit={commit} aria-label="Vitae" />);
    const input = screen.getByLabelText('Vitae');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '' } });
    rerender(<NumberInput value={12} onCommit={commit} aria-label="Vitae" />);
    expect(input).toHaveValue(null);
    expect(commit).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: '47' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.blur(input);
    expect(commit).toHaveBeenCalledExactlyOnceWith(47);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    expect(input).toHaveValue(0);
    expect(commit).toHaveBeenLastCalledWith(0);
  });

  it('keeps quick HP, effects and reactions available on collapsed player and monster cards', () => {
    const state = gameState({ characters: [character({ effects: [{ name: 'Blessed' }] }), character({ id: 'orc', name: 'Orc', type: 'monster', maxHp: 100, currentHp: 50, maxReactions: 3, currentReactions: 1, effects: [{ name: 'Stunned' }] })] });
    const props = { state, submitAction: vi.fn(async () => undefined), onOpenSpells: vi.fn(), onOpenInventory: vi.fn(), onOpenMonsters: vi.fn() };
    const { rerender } = render(<CombatPage {...props} role="dm" />);
    const hero = within(screen.getByTestId('character-Ayla'));
    expect(hero.getByRole('button', { name: 'input' })).toHaveAttribute('aria-expanded', 'false');
    expect(hero.getByRole('button', { name: /^HP -10$/ })).toBeVisible();
    expect(hero.getByRole('button', { name: 'Blessed' })).toBeVisible();
    expect(hero.getByRole('button', { name: 'Ayla reaction 1' })).toBeVisible();
    expect(hero.queryByPlaceholderText('Damage')).not.toBeInTheDocument();
    fireEvent.click(hero.getByRole('button', { name: 'input' }));
    expect(hero.getByPlaceholderText('Damage')).toBeVisible();
    fireEvent.click(hero.getByRole('button', { name: 'input' }));
    expect(within(screen.getByTestId('character-Orc')).getByRole('button', { name: /^HP \+10$/ })).toBeVisible();
    rerender(<CombatPage {...props} role="player" />);
    const orc = within(screen.getByTestId('character-Orc'));
    expect(orc.getByText('Bloodied').closest('.stat')).toHaveClass('health-medium');
    expect(orc.getByRole('button', { name: 'Stunned' })).toBeVisible();
    expect(orc.getByRole('button', { name: 'Orc reaction 1' })).not.toBeDisabled();
    expect(orc.getByRole('button', { name: 'Orc reaction 1' })).toHaveAttribute('aria-pressed', 'true');
    expect(orc.getByRole('button', { name: 'Orc reaction 3' })).toHaveAttribute('aria-pressed', 'false');
    expect(orc.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();

    // Player clicking Refresh calls character.reaction.set with max reactions
    fireEvent.click(orc.getByRole('button', { name: 'Refresh' }));
    expect(props.submitAction).toHaveBeenCalledWith({
      type: 'character.reaction.set',
      payload: { characterId: 'orc', value: 3, refresh: true }
    });

    // Player clicking available reaction 3 spends 1 reaction (currentReactions was 1, so 1 - 1 = 0)
    fireEvent.click(orc.getByRole('button', { name: 'Orc reaction 3' }));
    expect(props.submitAction).toHaveBeenCalledWith({
      type: 'character.reaction.set',
      payload: { characterId: 'orc', value: 0 }
    });
    state.characters[1].currentHp = 20;
    rerender(<CombatPage {...props} role="player" />);
    expect(orc.getByText('Critical').closest('.stat')).toHaveClass('health-low');
  });

  it('adds non-monster objects with fixed initiative and notes', () => {
    const submitAction = vi.fn(async () => undefined);
    render(<CombatPage state={gameState()} role="dm" submitAction={submitAction} onOpenSpells={vi.fn()} onOpenInventory={vi.fn()} onOpenMonsters={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Add character \/ monster \/ object/ }));
    const form = screen.getByTestId('add-character-form');
    fireEvent.change(within(form).getByLabelText('Combatant type'), { target: { value: 'nonMonster' } });
    fireEvent.change(within(form).getByPlaceholderText('Name'), { target: { value: 'Falling rocks' } });
    fireEvent.change(within(form).getByPlaceholderText('Fixed initiative'), { target: { value: '12' } });
    fireEvent.submit(form);
    expect(submitAction).toHaveBeenCalledWith(expect.objectContaining({ type: 'character.add', payload: expect.objectContaining({ isNonMonster: true, hasHpAc: false, fixedInitiative: 12, maxReactions: 0 }) }));
  });

  it('offers database objects through the shared picker and preserves their fixed initiative', () => {
    const submitAction = vi.fn(async () => undefined);
    const state = gameState({ monsterDatabase: [
      { id: 'orc', name: 'Orc', hp: 20, ac: 12, initBonus: 1 },
      { id: 'hazard', name: 'Falling rocks', entityKind: 'nonMonster', fixedInitiative: 0, hasHpAc: false, maxReactions: 0, hp: 0, ac: 0, initBonus: 0 }
    ] });
    render(<CombatPage state={state} role="dm" submitAction={submitAction} onOpenSpells={vi.fn()} onOpenInventory={vi.fn()} onOpenMonsters={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Add monster \/ object from database/ }));
    fireEvent.change(screen.getByLabelText('Database entity type'), { target: { value: 'objects' } });
    expect(screen.queryByRole('option', { name: /^Orc/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: /Falling rocks/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Add to combat' }));
    expect(submitAction).toHaveBeenCalledWith(expect.objectContaining({ type: 'character.add', payload: expect.objectContaining({ name: 'Falling rocks', isNonMonster: true, hasHpAc: false, fixedInitiative: 0, initiative: 0, maxReactions: 0 }) }));
  });

  it('previews AOE damage and cumulative conditions without submitting until global Apply', async () => {
    const submitAction = vi.fn(async () => ({ ok: true }));
    const state = gameState({ characters: [character({ effects: [{ name: 'Exhaustion', level: 2 }] }), character({ id: 'borin', name: 'Borin' })], conditionDatabase: [{ id: 'exhaustion', name: 'Exhaustion', hasLevels: true, maxLevel: 6 }] });
    render(<Toolbelt role="dm" state={state} submitAction={submitAction} />);
    fireEvent.click(screen.getByRole('button', { name: 'AOE Resolver' }));
    expect(screen.queryByText('Chance')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Damage total'), { target: { value: '31' } });
    fireEvent.click(screen.getByText('Applied conditions (0)'));
    fireEvent.click(screen.getByRole('option', { name: /Exhaustion/ }));
    fireEvent.change(screen.getByLabelText('Levels to add'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Ayla save total'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Borin save total'), { target: { value: '20' } });
    const ayla = within(screen.getByRole('article', { name: 'Ayla AOE target' }));
    const borin = within(screen.getByRole('article', { name: 'Borin AOE target' }));
    fireEvent.click(borin.getByLabelText('Half damage'));
    expect(ayla.getByText('Failure · Damage 31')).toBeVisible();
    expect(ayla.getByText('Exhaustion 2 → 4')).toBeVisible();
    expect(borin.getByText('Success · Damage 7')).toBeVisible();
    expect(borin.getByText('No conditions')).toBeVisible();
    fireEvent.click(borin.getByLabelText('Include Borin'));
    expect(borin.getByText('Excluded — no changes')).toBeVisible();
    expect(submitAction).not.toHaveBeenCalled();
    expect(state.characters[0].effects[0].level).toBe(2);
    fireEvent.click(screen.getByRole('button', { name: 'Apply to 1 target' }));
    await screen.findByRole('button', { name: 'Applied' });
    expect(submitAction).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ type: 'combat.aoe.apply', page: 'combat', payload: expect.objectContaining({ damageTotal: 31, conditions: [{ conditionId: 'exhaustion', level: 2 }], targets: [{ characterId: 'ayla', saveTotal: 10, natural: null, halfDamage: false }] }) }));
    expect(screen.getByRole('button', { name: 'Applied' })).toBeDisabled();
  });

  it('rolls monster saves in the AOE preview without changing server state', () => {
    const submitAction = vi.fn(async () => undefined);
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    render(<Toolbelt role="dm" state={gameState({ characters: [character({ id: 'mage', name: 'Mage', type: 'monster', monsterData: { saves: 'Dex +9', stats: { dexterity: 18 } } })] })} submitAction={submitAction} />);
    fireEvent.click(screen.getByRole('button', { name: 'AOE Resolver' }));
    fireEvent.change(screen.getByLabelText('Targets'), { target: { value: 'enemies' } });
    expect(screen.getByText('DEX save +9')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Roll save' }));
    expect(screen.getByLabelText('Mage save total')).toHaveValue(20);
    expect(submitAction).not.toHaveBeenCalled();
    random.mockRestore();
  });

  it('supports negative AOE damage as healing, No roll auto-fail, and per-character Crow/Astria auras', async () => {
    const submitAction = vi.fn(async () => ({ ok: true }));
    const state = gameState({
      characters: [
        character({ id: 'crow', name: 'Crow', abilityScores: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 18, charisma: 10 } }),
        character({ id: 'astria', name: 'Astria', abilityScores: { strength: 10, dexterity: 14, constitution: 10, intelligence: 16, wisdom: 10, charisma: 10 } })
      ]
    });
    render(<Toolbelt role="dm" state={state} submitAction={submitAction} />);
    fireEvent.click(screen.getByRole('button', { name: 'AOE Resolver' }));

    const crowTarget = within(screen.getByRole('article', { name: 'Crow AOE target' }));
    fireEvent.change(screen.getByLabelText('Crow save total'), { target: { value: '10' } });
    fireEvent.click(crowTarget.getByLabelText('Crow Crow aura'));
    fireEvent.click(crowTarget.getByLabelText('Crow Astria aura'));
    expect(screen.getByLabelText('Crow save total')).toHaveValue(17);
    expect(crowTarget.getByText('Auras: Crow aura +4, Astria aura +3')).toBeVisible();
    expect(crowTarget.getByText('DEX save +7 (base +0, Crow aura +4, Astria aura +3)')).toBeVisible();

    fireEvent.change(screen.getByLabelText('Damage total'), { target: { value: '-50' } });
    fireEvent.click(screen.getByLabelText('No roll'));
    expect(crowTarget.getByText('Failure · Healing 50')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Apply to 2 targets' }));
    await screen.findByRole('button', { name: 'Applied' });
    expect(submitAction).toHaveBeenCalledWith(expect.objectContaining({
      type: 'combat.aoe.apply',
      payload: expect.objectContaining({
        damageTotal: -50,
        noRoll: true
      })
    }));
  });

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

  it('shows optional duration as a compact number on a condition', () => {
    render(<CombatPage state={gameState({ characters: [character({ effects: [{ name: 'Hasted', remainingRounds: 2 }, { name: 'Blessed' }] })] })} role="dm" submitAction={vi.fn(async () => undefined)} onOpenSpells={vi.fn()} onOpenInventory={vi.fn()} onOpenMonsters={vi.fn()} />);
    expect(screen.getByTitle('2 rounds remaining; expires at round end')).toHaveTextContent('2');
    expect(screen.getByRole('button', { name: 'Blessed' }).querySelector('.effect-duration')).toBeNull();
  });

  it('shares feature usage and editable descriptions across Actions and Custom Features', () => {
    const submitAction = vi.fn(async () => undefined);
    const hero = character({ customFeatures: [{ id: 'breath', name: 'Breath', maxUses: 3, used: 0, isAction: true, description: '**Shared rules**' }] });
    const props = { role: 'dm' as const, submitAction, onSelectCharacter: vi.fn(), onBackToCombat: vi.fn() };
    const { rerender } = render(<SpellsPage {...props} state={gameState({ characters: [hero] })} />);
    const actions = within(document.getElementById('sheet-actions')!);
    const features = within(document.getElementById('sheet-features')!);
    expect(actions.getByRole('button', { name: 'Breath use 1' })).toBeInTheDocument();
    expect(features.getByRole('button', { name: 'Breath use 1' })).toBeInTheDocument();
    fireEvent.click(actions.getByText('Description'));
    expect(actions.getByText('Shared rules')).toBeVisible();
    fireEvent.click(actions.getByRole('button', { name: 'Breath use 1' }));
    expect(submitAction).toHaveBeenCalledWith(expect.objectContaining({ type: 'spell.feature.uses', payload: expect.objectContaining({ featureId: 'breath', used: 1 }) }));
    fireEvent.click(actions.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Feature description'), { target: { value: '**New draft**' } });
    rerender(<SpellsPage {...props} state={gameState({ characters: [{ ...hero, customFeatures: [{ ...hero.customFeatures[0], used: 1 }] }] })} />);
    expect(screen.getByLabelText('Feature description')).toHaveValue('**New draft**');
    expect(screen.getByLabelText('Show in Actions / Attacks')).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Save feature' }));
    expect(submitAction).toHaveBeenCalledWith(expect.objectContaining({ type: 'spell.feature.update', payload: expect.objectContaining({ featureId: 'breath', description: '**New draft**', isAction: true }) }));
  });

  it('keeps live spell resource controls available in a spell detail', () => {
    const submitAction = vi.fn(async () => undefined);
    const hero = character({ spellSlots: { '1': { max: 2, used: 0 } }, spellbook: { knownSpellIds: ['flame'], preparedSpellIds: [], preparesSpells: false, preparedNonEpicMax: 0, preparedEpicMax: 0 } });
    const state = gameState({ characters: [hero], spellDatabase: [spell({ id: 'flame', name: 'Flame', levelKey: '1', levelLabel: 'Level 1' })] });
    const props = { role: 'player' as const, submitAction, onSelectCharacter: vi.fn(), onBackToCombat: vi.fn() };
    const { rerender } = render(<SpellsPage {...props} state={state} />);
    fireEvent.click(screen.getByTestId('spell-Flame'));
    expect(within(screen.getByRole('dialog')).getByLabelText('Casting resources')).toHaveTextContent('2/2');
    fireEvent.click(screen.getByRole('button', { name: 'Cast Flame' }));
    expect(submitAction).toHaveBeenCalledWith({ type: 'spell.cast', payload: { characterId: hero.id, spellId: 'flame', level: '1' } });
    hero.spellSlots['1'].used = 2;
    rerender(<SpellsPage {...props} state={{ ...state }} />);
    expect(within(screen.getByRole('dialog')).getByLabelText('Casting resources')).toHaveTextContent('0/2');
    expect(screen.getByRole('button', { name: 'Cast Flame' })).toBeDisabled();
  });

  it('renders Markdown without turning unsafe HTML into DOM', () => {
    render(<MarkdownRenderer text={'## Treasure\n\n**Bold** and *italic*\n\n<script>alert(1)</script>'} />);

    expect(screen.getByRole('heading', { name: 'Treasure' })).toBeInTheDocument();
    expect(screen.getByText('Bold')).toBeInTheDocument();
    expect(screen.getByText('italic')).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
    expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument();
  });

  it('renders pipe tables as table elements', () => {
    render(<MarkdownRenderer text={'| Name | Uses |\n| --- | --- |\n| Fire Breath | 1/day |\n| Shield | at will |'} />);

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Fire Breath' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'at will' })).toBeInTheDocument();
  });

  it('renders pipe tables after explicit Markdown line breaks', () => {
    render(<MarkdownRenderer text={'[br]\n| Crystalization Level | Effect |\n| --- | --- |\n| 1 | Glow |'} />);

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Crystalization Level' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Glow' })).toBeInTheDocument();
  });

  it('renders clickable database references for conditions, spells and monsters', () => {
    render(
      <DatabaseReferenceProvider
        state={gameState({
          conditionDatabase: [
            { id: 'stunned', name: 'Stunned', kind: 'debuff', description: '**Incapacitated** and cannot move.' },
            { id: 'invisible', name: 'Invisible', kind: 'buff', description: 'Cannot be seen.' }
          ],
          spellDatabase: [
            spell({ id: 'accursed', name: 'Accursed Wish', levelLabel: 'Level 2', school: 'Conjuration', description: 'Wish text.' }),
            spell({ id: 'invisibility', name: 'Invisibility', levelLabel: 'Level 2', school: 'Illusion', description: 'Become unseen.' })
          ],
          monsterDatabase: [{ id: 'orc', name: 'Orc Warlord', hp: 90, ac: 16, description: 'A dangerous commander.' }]
        })}
      >
        <MarkdownRenderer text={'Hit @Stunned, become @invisible, cast @[Accursed Wish], sustain @invisibility, then face @Orc Warlord.'} />
      </DatabaseReferenceProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Stunned' }));
    expect(screen.getByRole('heading', { name: 'Stunned' })).toBeInTheDocument();
    expect(screen.getByText('Incapacitated')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    fireEvent.click(screen.getByRole('button', { name: 'Invisible' }));
    expect(screen.getByRole('heading', { name: 'Invisible' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    fireEvent.click(screen.getByRole('button', { name: 'Accursed Wish' }));
    expect(screen.getByRole('heading', { name: 'Accursed Wish' })).toBeInTheDocument();
    expect(screen.getByText(/Level 2/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    fireEvent.click(screen.getByRole('button', { name: 'Invisibility' }));
    expect(screen.getByRole('heading', { name: 'Invisibility' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    fireEvent.click(screen.getByRole('button', { name: 'Orc Warlord' }));
    expect(screen.getByRole('heading', { name: 'Orc Warlord' })).toBeInTheDocument();
    expect(screen.getByText('A dangerous commander.')).toBeInTheDocument();
  });

  it('links database references followed by spaces, not only punctuation', () => {
    render(
      <DatabaseReferenceProvider
        state={gameState({
          conditionDatabase: [{ id: 'invisible', name: 'Invisible', kind: 'buff', description: 'Cannot be seen.' }],
          spellDatabase: [spell({ id: 'invisibility', name: 'Invisibility', levelLabel: 'Level 2', school: 'Illusion', description: 'Become unseen.' })]
        })}
      >
        <MarkdownRenderer text={"You become @Invisible for the spell's duration. The @Invisibility will last. As long as you remain @Invisible, the first attack is stronger."} />
      </DatabaseReferenceProvider>
    );

    expect(screen.getAllByRole('button', { name: 'Invisible' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Invisibility' })).toBeInTheDocument();
  });

  it('automatically highlights dice expressions in Markdown and opens the Dice Roller with that expression on click', () => {
    const state = gameState();
    render(
      <DatabaseReferenceProvider state={state}>
        <MarkdownRenderer text={'Melee Attack: 1d20+6 to hit. Hit: 13 (3*(1d20+2*3)) slashing damage plus 2d6 + 4 fire damage.'} />
        <Toolbelt role="player" state={state} submitAction={vi.fn(async () => undefined)} />
      </DatabaseReferenceProvider>
    );

    const attackDice = screen.getByRole('button', { name: '1d20+6' });
    const complexDice = screen.getByRole('button', { name: '3*(1d20+2*3)' });
    const fireDice = screen.getByRole('button', { name: '2d6 + 4' });

    expect(attackDice).toHaveClass('markdown-reference-dice');
    expect(complexDice).toHaveClass('markdown-reference-dice');
    expect(fireDice).toHaveClass('markdown-reference-dice');

    fireEvent.click(attackDice);
    expect(screen.getByRole('heading', { name: 'Dice Roller' })).toBeInTheDocument();
    expect(screen.getByLabelText('Dice expression')).toHaveValue('1d20+6');

    fireEvent.click(complexDice);
    expect(screen.getByLabelText('Dice expression')).toHaveValue('3*(1d20+2*3)');
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
    expect(screen.getByRole('button', { name: 'Table' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reference' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preview' })).toHaveClass('markdown-preview-toggle');
    expect(screen.getByRole('button', { name: 'Pop out' })).toHaveClass('markdown-popout');
  });

  it('inserts a starter table from the Markdown toolbar', () => {
    const onChange = vi.fn();
    render(<MarkdownEditor value="" onChange={onChange} label="Item notes" />);

    fireEvent.click(screen.getByRole('button', { name: 'Table' }));

    expect(onChange).toHaveBeenCalledWith(expect.stringContaining('| Column 1 | Column 2 | Column 3 |'));
    expect(onChange).toHaveBeenCalledWith(expect.stringContaining('| --- | --- | --- |'));
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

  it('limits quoted search to entry names', () => {
    render(
      <SearchPicker
        items={[
          { id: 'named', name: 'Named Shield', description: 'Protective magic.' },
          { id: 'remove', name: 'Remove Person', description: 'Name the target.' }
        ]}
        query={'"Name"'}
        onQueryChange={vi.fn()}
        selectedId=""
        onSelect={vi.fn()}
        placeholder="Search spells"
        getId={item => item.id}
        getLabel={item => item.name}
        getDescription={item => item.description}
      />
    );

    expect(screen.getByRole('option', { name: /Named Shield/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Remove Person/i })).not.toBeInTheDocument();
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
    expect(screen.getAllByText(/Level 1/).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByRole('button', { name: 'Add Spell' })).not.toBeInTheDocument();
  });

  it('does not leak condition cards into other database tabs while switching and searching', () => {
    render(
      <DatabasesPage
        state={gameState({
          magicItemDatabase: [{ id: 'moonblade', name: 'Moonblade', itemType: 'Weapon', rarity: 'Rare', description: 'Silver blade' }],
          conditionDatabase: [
            { id: 'condition_23', name: 'Burning', kind: 'debuff', description: 'Ongoing fire.', hasDice: true, defaultDiceCount: 2, defaultDiceSides: 4, defaultDamageType: 'fire' },
            { id: 'condition_23', name: 'Burning', kind: 'debuff', description: 'Ongoing fire.', hasDice: true, defaultDiceCount: 2, defaultDiceSides: 4, defaultDamageType: 'fire' }
          ],
          spellDatabase: [spell({ id: 'shield', name: 'Shield', levelKey: '1', levelLabel: 'Level 1', school: 'Abjuration' })]
        })}
        role="dm"
        submitAction={vi.fn(async (_action: GameAction) => undefined)}
        onBackToCombat={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Conditions' }));
    expect(screen.getAllByRole('heading', { name: 'Burning' })).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Spells' }));
    expect(screen.queryByRole('heading', { name: 'Burning' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Shield' })).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Search Spells'), { target: { value: 'burn' } });
    expect(screen.queryByRole('heading', { name: 'Burning' })).not.toBeInTheDocument();
    expect(screen.getByText('No entries found.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Magic Items' }));
    expect(screen.queryByRole('heading', { name: 'Burning' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Moonblade' })).toBeInTheDocument();
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

  it('shows character abilities as heading cards with markdown detail and editor actions', () => {
    const submitAction = vi.fn(async (_action: GameAction) => undefined);
    render(
      <SpellsPage
        state={gameState({
          characters: [character({
            characterAbilities: [
              { id: 'bardic', name: 'Bardic Inspiration', source: 'Class feature', description: '**Bonus** die for an ally.' }
            ]
          })]
        })}
        role="player"
        submitAction={submitAction}
        selectedCharacterId="ayla"
        onSelectCharacter={vi.fn()}
        onBackToCombat={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: 'Abilities' })).toBeInTheDocument();
    expect(screen.getByTestId('ability-Bardic Inspiration')).toHaveTextContent('Bardic Inspiration');
    expect(screen.queryByText('Bonus')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('ability-Bardic Inspiration'));
    expect(screen.getByRole('heading', { name: 'Bardic Inspiration' })).toBeInTheDocument();
    expect(screen.getByText('Bonus')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByRole('heading', { name: 'Edit Ayla Abilities' })).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Ability heading'), { target: { value: 'Bardic Inspiration Updated' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save ability' }));
    expect(submitAction).toHaveBeenCalledWith(expect.objectContaining({
      type: 'spell.ability.upsert',
      payload: expect.objectContaining({
        characterId: 'ayla',
        ability: expect.objectContaining({ id: 'bardic', name: 'Bardic Inspiration Updated' })
      })
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

  it('formats repeated parenthesized dice expressions with individual roll sub-totals in the log', () => {
    const submitAction = vi.fn(async (_action: GameAction) => undefined);
    const random = vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.4)   // 9
      .mockReturnValueOnce(0.45)  // 10
      .mockReturnValueOnce(0.5)   // 11
      .mockReturnValueOnce(0.55)  // 12
      .mockReturnValueOnce(0.8);  // 17

    render(<Toolbelt role="dm" state={gameState()} submitAction={submitAction} />);
    fireEvent.click(within(screen.getByLabelText('Table toolbelt')).getByRole('button', { name: 'Dice Roller' }));
    fireEvent.change(screen.getByLabelText('Dice expression'), { target: { value: '5*(1d20+2*5)' } });
    fireEvent.click(screen.getByRole('button', { name: 'Roll' }));

    expect(submitAction).toHaveBeenCalledWith(expect.objectContaining({
      type: 'toolbelt.dice.add',
      payload: expect.objectContaining({
        expression: '5*(1d20+10)',
        total: 109,
        detail: '5×(1d20+10): 19 [9+10], 20 [10+10], 21 [11+10], 22 [12+10], 27 [17+10]'
      })
    }));

    random.mockRestore();
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

  it('adds per-character inspiration and uses sheet bonuses for Funyana-style unproficient checks', () => {
    const state = gameState({
      characters: [
        character({
          id: 'funyana',
          name: 'Funyana',
          proficiencyBonus: 5,
          abilityScores: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 },
          skillProficiencies: [],
          skillExpertise: [],
          sheetBonuses: [{ targetType: 'allAbilityChecks', valueMode: 'halfProficiency', value: 0, condition: 'ifNotProficientOrExpert', source: 'Funyana rule' }]
        })
      ]
    });

    render(<Toolbelt role="dm" state={state} submitAction={vi.fn(async (_action: GameAction) => undefined)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Party Checks' }));
    fireEvent.change(screen.getByDisplayValue('Saving throw'), { target: { value: 'ability' } });
    fireEvent.change(screen.getByLabelText('Difficulty class'), { target: { value: '15' } });
    expect(screen.getByText(/base \+2/)).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('d12'));
    expect(screen.getByLabelText('d12')).toBeChecked();
  });

  it('recalculates stealth pass/fail when Pass without Trace toggles', () => {
    const state = gameState({ characters: [character({ skillProficiencies: [] })], toolbelt: { ...gameState().toolbelt, partyChecks: { 'skill:stealth': { ayla: { total: 10, natural: null, detail: 'Manual result' } } } } });
    render(<Toolbelt role="dm" state={state} submitAction={vi.fn(async (_action: GameAction) => undefined)} />);

    fireEvent.click(screen.getByRole('button', { name: 'Party Checks' }));
    fireEvent.click(screen.getByRole('button', { name: 'Stealth' }));
    fireEvent.change(screen.getByLabelText('Difficulty class'), { target: { value: '15' } });
    expect(screen.getByText('Successes 0 / Failures 1')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Pass without Trace +10'));
    expect(screen.getByText('Successes 1 / Failures 0')).toBeInTheDocument();
  });

  it('rolls inspiration with advantage for checks and normally for saves', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const submitAction = vi.fn(async (_action: GameAction) => undefined);
    render(<Toolbelt role="dm" state={gameState({ characters: [character({ abilityScores: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 }, savingThrowProficiencies: [] })] })} submitAction={submitAction} />);
    fireEvent.click(screen.getByRole('button', { name: 'Party Checks' }));
    fireEvent.change(screen.getByDisplayValue('Saving throw'), { target: { value: 'ability' } });
    fireEvent.click(screen.getByLabelText('d12'));
    fireEvent.click(screen.getByRole('button', { name: 'Roll all' }));
    expect(random).toHaveBeenCalledTimes(3);
    expect(submitAction).toHaveBeenLastCalledWith(expect.objectContaining({ payload: expect.objectContaining({ checkKey: 'ability:strength', results: [expect.objectContaining({ total: 18, natural: 11, detail: expect.stringContaining('(7/7)') })] }) }));
    random.mockClear();
    fireEvent.change(screen.getByDisplayValue('Ability check'), { target: { value: 'save' } });
    fireEvent.click(screen.getByRole('button', { name: 'Roll all' }));
    expect(random).toHaveBeenCalledTimes(2);
    random.mockRestore();
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
    expect(screen.getAllByText('Festival').length).toBeGreaterThanOrEqual(1);
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

  it('displays dynamic To-Do count in toolbelt and opens full detail modal with actions', () => {
    const submitAction = vi.fn(async (_action: GameAction) => undefined);
    const state = gameState({
      toolbelt: {
        diceRolls: {},
        improvNames: [],
        calendar: {
          weekday: 'Wednesday',
          day: 24,
          month: 'December',
          year: 502,
          records: [
            // Due trigger on 23rd
            { id: 't1', type: 'trigger', dateKey: '502-December-23', recordedDateKey: '502-December-20', text: '**Ambush trigger**', completed: false, notified: true },
            // Future trigger on 28th
            { id: 't2', type: 'trigger', dateKey: '502-December-28', recordedDateKey: '502-December-20', text: '**Future trigger**', completed: false, notified: false }
          ]
        },
        notes: [
          // Incomplete temp note
          { id: 'n1', type: 'temp', title: 'Rewrite spell rules', text: 'Transfer to homebrew doc', date: '2026-06-04', completed: false, timestamp: '2026-06-04T00:00:00.000Z' },
          // Completed temp note
          { id: 'n2', type: 'temp', title: 'Done temp', text: 'Already done', date: '2026-06-03', completed: true, timestamp: '2026-06-03T00:00:00.000Z' },
          // Regular permanent note
          { id: 'n3', type: 'note', title: 'Regular note', text: 'Normal text', date: '2026-06-01', timestamp: '2026-06-01T00:00:00.000Z' }
        ]
      }
    });

    render(<Toolbelt role="dm" state={state} submitAction={submitAction} />);

    // Total active To-Do items: 1 due trigger (t1) + 1 incomplete temp note (n1) = 2
    const todoBtn = screen.getByRole('button', { name: /To-Do \(2\)/i });
    expect(todoBtn).toBeInTheDocument();
    fireEvent.click(todoBtn);

    // Modal opens
    expect(screen.getByRole('heading', { name: /To-Do/i })).toBeInTheDocument();
    expect(screen.getByText('Ambush trigger')).toBeInTheDocument();
    expect(screen.getByText('Rewrite spell rules')).toBeInTheDocument();
    expect(screen.queryByText('Future trigger')).not.toBeInTheDocument();
  });

  it('supports search and type filtering in notepad and toggles temp note completion', () => {
    const submitAction = vi.fn(async (_action: GameAction) => undefined);
    const state = gameState({
      toolbelt: {
        diceRolls: {},
        improvNames: [],
        calendar: { weekday: 'Tuesday', day: 23, month: 'December', year: 502, records: [] },
        notes: [
          { id: 'n1', type: 'temp', title: 'Buy diamonds', text: 'Components for revivify', date: '2026-06-05', completed: false, timestamp: '2026-06-05T00:00:00.000Z' },
          { id: 'n2', type: 'note', title: 'Lore of Astria', text: 'Ancient history', date: '2026-06-04', timestamp: '2026-06-04T00:00:00.000Z' }
        ]
      }
    });

    render(<Toolbelt role="dm" state={state} submitAction={submitAction} />);
    fireEvent.click(screen.getByRole('button', { name: 'Notepad' }));

    // Search input exists
    const searchInput = screen.getByPlaceholderText(/Search notes/i);
    expect(searchInput).toBeInTheDocument();

    // Search filters results
    fireEvent.change(searchInput, { target: { value: 'diamonds' } });
    expect(screen.getByText('Buy diamonds')).toBeInTheDocument();
    expect(screen.queryByText('Lore of Astria')).not.toBeInTheDocument();
  });

  it('filters monster database by combatType and flag with matching inactive counter', () => {
    const submitAction = vi.fn(async () => undefined);
    render(
      <DatabasesPage
        initialTab="monster"
        state={gameState({
          monsterDatabase: [
            { id: 'm1', name: 'Orc Warrior', type: 'humanoid', combatType: 'monster', flag: 'active', hp: 15, ac: 13 },
            { id: 'm2', name: 'Orc Shaman', type: 'humanoid', combatType: 'spellcaster', flag: 'active', hp: 20, ac: 12 },
            { id: 'm3', name: 'Old Boss', type: 'humanoid', combatType: 'leader', flag: 'inactive', hp: 50, ac: 16 }
          ]
        })}
        role="dm"
        submitAction={submitAction}
        onBackToCombat={vi.fn()}
      />
    );

    // Active monsters are visible by default
    expect(screen.getByText('Orc Warrior')).toBeInTheDocument();
    expect(screen.getByText('Orc Shaman')).toBeInTheDocument();
    expect(screen.queryByText('Old Boss')).not.toBeInTheDocument();

    // Bottom counter shows inactive monsters
    expect(screen.getByText(/Počet neaktivních monster/i)).toBeInTheDocument();
  });

  it('shows adapt flag monsters by default with adapt badge, supports multiple groups and 20-item load more pagination', () => {
    const submitAction = vi.fn(async () => undefined);
    const manyMonsters: MonsterDatabaseEntry[] = [];
    for (let i = 1; i <= 25; i++) {
      manyMonsters.push({
        id: `m_${i}`,
        name: `Monster ${i}`,
        hp: 50,
        ac: 15,
        flag: i === 1 ? 'adapt' : 'active',
        groups: i === 1 ? ['Undead', 'Bosses'] : ['Minions']
      });
    }

    render(
      <DatabasesPage
        initialTab="monster"
        state={gameState({
          monsterDatabase: manyMonsters
        })}
        role="dm"
        submitAction={submitAction}
        onBackToCombat={vi.fn()}
      />
    );

    // Adapt monster is visible by default with Adapt badge
    expect(screen.getByText('Monster 1')).toBeInTheDocument();
    expect(screen.getByText('Adapt')).toBeInTheDocument();

    // Pagination: only first 20 visible
    expect(screen.getByText('Monster 20')).toBeInTheDocument();
    expect(screen.queryByText('Monster 21')).not.toBeInTheDocument();

    // Load more button
    const loadMoreBtn = screen.getByRole('button', { name: /Load more \(\+20\)/i });
    expect(loadMoreBtn).toBeInTheDocument();
    expect(loadMoreBtn).toHaveTextContent('Showing 20 of 25');

    // Click load more
    fireEvent.click(loadMoreBtn);
    expect(screen.getByText('Monster 21')).toBeInTheDocument();
    expect(screen.getByText('Monster 25')).toBeInTheDocument();
  });

  it('renders Monster Groups tab, displays and edits Markdown descriptions, and toggles normal vs grouped by roles', async () => {
    const submitAction = vi.fn(async () => undefined);
    const monsters: MonsterDatabaseEntry[] = [
      {
        id: 'orc_grunt',
        name: 'Orc Grunt',
        hp: 30,
        ac: 13,
        combatType: 'monster',
        groups: ['Orc Clan'],
        imageUrl: '/images/monsters/orc.jpg',
        imageFocus: 'top'
      },
      {
        id: 'orc_shaman',
        name: 'Orc Shaman',
        hp: 45,
        ac: 12,
        combatType: 'spellcaster',
        groups: ['Orc Clan']
      },
      {
        id: 'orc_chief',
        name: 'Orc Chieftain',
        hp: 90,
        ac: 16,
        combatType: 'leader',
        groups: ['Orc Clan']
      },
      {
        id: 'goblin_archer',
        name: 'Goblin Scout',
        hp: 20,
        ac: 14,
        combatType: 'ranged',
        groups: ['Goblin Raiders']
      }
    ];

    render(
      <DatabasesPage
        initialTab="monsterGroups"
        state={gameState({
          monsterDatabase: monsters,
          monsterGroupDescriptions: {
            'Orc Clan': 'Fierce warriors who worship Gruumsh.'
          }
        })}
        role="dm"
        submitAction={submitAction}
        onBackToCombat={vi.fn()}
      />
    );

    // Monster Groups tab is active and shows group pills
    expect(screen.getByRole('button', { name: 'Monster Groups' })).toHaveClass('active');
    expect(screen.getByRole('button', { name: /Orc Clan/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Goblin Raiders/i })).toBeInTheDocument();

    // Select Orc Clan
    fireEvent.click(screen.getByRole('button', { name: /Orc Clan/i }));

    // Orc Clan is selected, shows Markdown description and Edit button
    expect(screen.getByText('Fierce warriors who worship Gruumsh.')).toBeInTheDocument();
    const editDescBtn = screen.getByRole('button', { name: 'Edit Description' });
    expect(editDescBtn).toBeInTheDocument();

    // Clicking edit description opens Markdown editor
    fireEvent.click(editDescBtn);
    const textarea = screen.getByPlaceholderText(/Napište Markdown popis/i);
    expect(textarea).toBeInTheDocument();
    fireEvent.change(textarea, { target: { value: 'Updated Orc Clan description with tactical notes.' } });

    // Save description calls action
    fireEvent.click(screen.getByRole('button', { name: 'Save Description' }));
    expect(submitAction).toHaveBeenCalledWith({
      type: 'database.monsterGroup.updateDescription',
      payload: {
        group: 'Orc Clan',
        description: 'Updated Orc Clan description with tactical notes.'
      }
    });

    // In normal view, monsters of Orc Clan are displayed
    expect(screen.getByText('Orc Grunt')).toBeInTheDocument();
    expect(screen.getByText('Orc Shaman')).toBeInTheDocument();
    expect(screen.getByText('Orc Chieftain')).toBeInTheDocument();
    expect(screen.queryByText('Goblin Scout')).not.toBeInTheDocument();

    // Image focus is applied to monster image
    const orcImg = screen.getByAltText('Orc Grunt');
    expect(orcImg).toHaveStyle({ objectPosition: 'top' });

    // Switch to Grouped by Roles view
    fireEvent.click(screen.getByRole('button', { name: /Rozdělené podle rolí/i }));

    // Role section headers with badges should now be visible
    expect(screen.getByText('Monster')).toBeInTheDocument();
    expect(screen.getByText('Spellcaster')).toBeInTheDocument();
    expect(screen.getByText('Leader')).toBeInTheDocument();
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
    expect(screen.getByTestId('inventory-item-Moonblade')).not.toHaveTextContent('x1');
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

  it('adds scrolls from the spell database search picker', () => {
    const submitAction = vi.fn(async (_action: GameAction) => undefined);
    render(
      <InventoryPage
        state={gameState({
          spellDatabase: [spell({ id: 'fireball', name: 'Fireball', levelKey: '3', levelLabel: 'Level 3', school: 'Evocation', description: 'A bright streak flashes.' })]
        })}
        role="player"
        submitAction={submitAction}
        selectedCharacterId="ayla"
        onSelectCharacter={vi.fn()}
        onBackToCombat={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Add item/i }));
    fireEvent.change(screen.getByDisplayValue('General'), { target: { value: 'scroll' } });
    fireEvent.change(screen.getByPlaceholderText('Search spells for scrolls'), { target: { value: 'fire' } });
    fireEvent.click(screen.getByRole('option', { name: /Fireball/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Add from database' }));

    expect(submitAction).toHaveBeenCalledWith(expect.objectContaining({
      type: 'inventory.item.add',
      payload: expect.objectContaining({
        itemType: 'scroll',
        item: expect.objectContaining({ spellName: 'Fireball', quantity: 1, description: 'A bright streak flashes.' })
      })
    }));
  });

  it('shows spell components as their own inventory section with count and value tracking', () => {
    render(
      <InventoryPage
        state={gameState({
          characters: [
            character({
              inventory: {
                ...emptyInventory(),
                spellComponents: [
                  { name: 'Soul Coin', trackingType: 'count', count: 666 },
                  { name: 'Diamond Dust', trackingType: 'value', goldValue: 200 }
                ]
              }
            })
          ]
        })}
        role="player"
        submitAction={vi.fn(async (_action: GameAction) => undefined)}
        selectedCharacterId="ayla"
        onSelectCharacter={vi.fn()}
        onBackToCombat={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: 'Spell Components' })).toBeInTheDocument();
    expect(screen.getByTestId('inventory-item-Soul Coin')).toHaveTextContent('x666');
    expect(screen.getByTestId('inventory-item-Diamond Dust')).toHaveTextContent('200 gp');
  });

  it('labels epic spell slot keys cleanly in the spell tracker', () => {
    render(
      <SpellsPage
        state={gameState({
          characters: [character({ spellSlots: { epic1: { max: 1, used: 0 }, epic2: { max: 1, used: 1 } } })]
        })}
        role="player"
        submitAction={vi.fn(async (_action: GameAction) => undefined)}
        selectedCharacterId="ayla"
        onSelectCharacter={vi.fn()}
        onBackToCombat={vi.fn()}
      />
    );

    expect(screen.getByText('Epic 1: 1/1')).toBeInTheDocument();
    expect(screen.getByText('Epic 2: 0/1')).toBeInTheDocument();
  });
});

describe('encounter planner', () => {
  it('organizes identical monsters into shared-initiative groups in the Encounter Planner', async () => {
    const submitAction = vi.fn(async (_action: GameAction) => undefined);
    const onOpenCombat = vi.fn();
    render(
      <EncounterPlannerPage
        state={gameState({
          monsterDatabase: [
            { id: 'skeleton', name: 'Skeleton', hp: 13, ac: 13, encounterPoints: 0.2, dpr: 5 }
          ]
        })}
        submitAction={submitAction}
        onCreateMonster={vi.fn()}
        onOpenCombat={onOpenCombat}
      />
    );

    fireEvent.change(screen.getByLabelText('Add quantity'), { target: { value: '6' } });
    fireEvent.change(screen.getByLabelText('Add groups'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Skeleton to encounter' }));

    expect(screen.getByText('2 groups (~3×/group)')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Skeleton groups'), { target: { value: '1' } });
    expect(screen.getByText('1 group (6× shared init)')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Import to Combat' }));
    await vi.waitFor(() => {
      expect(submitAction).toHaveBeenCalledWith(expect.objectContaining({
        type: 'encounter.upsert',
        payload: expect.objectContaining({
          encounter: expect.objectContaining({
            monsters: [expect.objectContaining({ monsterId: 'skeleton', quantity: 6, groupCount: 1 })]
          })
        })
      }));
      expect(submitAction).toHaveBeenCalledWith(expect.objectContaining({
        type: 'encounter.importToCombat'
      }));
      expect(onOpenCombat).toHaveBeenCalled();
    });
  });

  it('visually displays numbered monster groups in the initiative line and character cards', () => {
    const s1 = character({
      id: 'skel1',
      name: 'Skeleton 1',
      type: 'monster',
      groupId: 'grp_1',
      groupName: 'Group 1',
      initiative: 14
    });
    const s2 = character({
      id: 'skel2',
      name: 'Skeleton 2',
      type: 'monster',
      groupId: 'grp_1',
      groupName: 'Group 1',
      initiative: 14
    });
    const hero = character({
      id: 'ayla',
      name: 'Ayla',
      type: 'player',
      initiative: 18
    });

    render(
      <CombatPage
        state={gameState({
          characters: [hero, s1, s2],
          combatState: { active: true, currentTurn: 1, round: 1, playedThisRound: [] }
        })}
        role="dm"
        submitAction={vi.fn(async () => undefined)}
        onOpenSpells={vi.fn()}
        onOpenInventory={vi.fn()}
        onOpenMonsters={vi.fn()}
      />
    );

    // InitiativeLine shows group cluster for Group 1 with both skeleton buttons inside
    const nav = screen.getByRole('navigation', { name: 'Initiative order' });
    expect(within(nav).getByText(/Group 1/)).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: 'Go to Skeleton 1' })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: 'Go to Skeleton 2' })).toBeInTheDocument();

    // Character cards show group pill and in-group styling
    const card1 = screen.getByTestId('character-Skeleton 1');
    const card2 = screen.getByTestId('character-Skeleton 2');
    expect(card1).toHaveClass('in-group');
    expect(card2).toHaveClass('in-group');
    expect(card1.querySelector('.group-pill')).toHaveTextContent('Group 1');
    expect(card2.querySelector('.group-pill')).toHaveTextContent('Group 1');
    expect(within(card1).getByText('Init').closest('.stat')).toHaveTextContent('Group 1');
    expect(within(card2).getByText('Init').closest('.stat')).toHaveTextContent('Group 1');
  });

  it('opens encounter loader modal from the combat page and imports encounter into combat', async () => {
    const submitAction = vi.fn(async () => undefined);
    render(
      <CombatPage
        state={gameState({
          encounters: [
            {
              id: 'crypt_ambush',
              name: 'Crypt Ambush',
              groupId: null,
              notes: 'Sneak attack',
              monsters: [{ id: 'e1', monsterId: 'skeleton', quantity: 4, groupCount: 1 }],
              reserve: [],
              updatedAt: ''
            }
          ],
          monsterDatabase: [{ id: 'skeleton', name: 'Skeleton', hp: 13, ac: 13, encounterPoints: 0.2, dpr: 5 }]
        })}
        role="dm"
        submitAction={submitAction}
        onOpenSpells={vi.fn()}
        onOpenInventory={vi.fn()}
        onOpenMonsters={vi.fn()}
      />
    );

    // Header has the Load encounter button
    const loadBtn = screen.getByRole('button', { name: 'Load encounter' });
    expect(loadBtn).toBeInTheDocument();

    // Clicking it opens the modal
    fireEvent.click(loadBtn);
    const modal = screen.getByRole('dialog', { name: 'Load encounter from planner' });
    expect(modal).toBeInTheDocument();
    expect(within(modal).getByText('Crypt Ambush')).toBeInTheDocument();
    expect(within(modal).getByText(/Skeleton ×4/)).toBeInTheDocument();

    // Toggle clear existing monsters and click load
    fireEvent.click(within(modal).getByLabelText('Clear existing monsters'));
    fireEvent.click(within(modal).getByRole('button', { name: 'Load encounter Crypt Ambush' }));

    expect(submitAction).toHaveBeenCalledWith({
      type: 'encounter.importToCombat',
      page: 'combat',
      payload: {
        encounterId: 'crypt_ambush',
        clearExistingMonsters: true
      }
    });
  });

  it('renders ActiveEncounterBrief with close button and shows header Close button when encounter is active', () => {
    const submitAction = vi.fn(async () => undefined);
    render(
      <CombatPage
        state={gameState({
          activeEncounterId: 'crypt_ambush',
          combatState: { active: false, currentTurn: 0, round: 1, playedThisRound: [] },
          encounters: [
            {
              id: 'crypt_ambush',
              name: 'Crypt Ambush',
              groupId: null,
              notes: 'Watch out for shadows in corners.',
              monsters: [{ id: 'e1', monsterId: 'skeleton', quantity: 2, groupCount: 1 }],
              reserve: [],
              updatedAt: ''
            }
          ]
        })}
        role="dm"
        submitAction={submitAction}
        onOpenSpells={vi.fn()}
        onOpenInventory={vi.fn()}
        onOpenMonsters={vi.fn()}
      />
    );

    // ActiveEncounterBrief is displayed
    expect(screen.getByText('Encounter: Crypt Ambush')).toBeInTheDocument();
    expect(screen.getByText('Watch out for shadows in corners.')).toBeInTheDocument();

    // Close encounter button in the brief
    const closeEncounterBtn = screen.getByRole('button', { name: 'Close encounter' });
    expect(closeEncounterBtn).toBeInTheDocument();
    fireEvent.click(closeEncounterBtn);
    expect(submitAction).toHaveBeenCalledWith({
      type: 'encounter.close',
      page: 'combat'
    });

    // Header Close button is also available even when combatState.active is false
    const headerCloseBtn = screen.getByRole('button', { name: 'Close' });
    expect(headerCloseBtn).toBeInTheDocument();
    fireEvent.click(headerCloseBtn);
    expect(submitAction).toHaveBeenCalledWith({
      type: 'combat.close',
      page: 'combat'
    });
  });

  it('provides export notes (Notion-ready) and export summary buttons in Encounter Planner', () => {
    const submitAction = vi.fn(async () => undefined);
    render(
      <EncounterPlannerPage
        state={gameState({
          encounters: [
            {
              id: 'enc1',
              name: 'Goblin Raid',
              groupId: null,
              notes: '# Shrnutí\nTest encounter idea\n---\n# Loot\n10 gp',
              monsters: [
                { id: 'm1', monsterId: 'goblin', quantity: 2, groupCount: 1 }
              ],
              reserve: [],
              updatedAt: ''
            }
          ],
          monsterDatabase: [
            { id: 'goblin', name: 'Goblin', type: 'humanoid', combatType: 'ranged', flag: 'active', hp: 7, ac: 15 }
          ]
        })}
        role="dm"
        submitAction={submitAction}
      />
    );

    expect(screen.getAllByRole('button', { name: /Export notes/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: /Export summary/i }).length).toBeGreaterThanOrEqual(1);

    // Select the saved encounter to view its monster list
    fireEvent.click(screen.getByRole('button', { name: /Goblin Raid/i }));
    expect(screen.getByRole('button', { name: /Mutate this monster/i })).toBeInTheDocument();
  });

  it('handles encounter states (active/done/unused), arc collapsing, unused arc, direct monster edit and hides done in combat loader', async () => {
    const onOpenMonsterEditor = vi.fn();
    const submitAction = vi.fn(async () => undefined);

    const testState = gameState({
      encounterGroups: [
        { id: 'arc_active_and_done', name: 'Arc 1' },
        { id: 'arc_all_done', name: 'Arc 2' }
      ],
      encounters: [
        {
          id: 'enc_active',
          name: 'Active Ambush',
          groupId: 'arc_active_and_done',
          status: 'active',
          notes: 'Active encounter',
          monsters: [{ id: 'm1', monsterId: 'goblin', quantity: 1, groupCount: 1 }],
          reserve: [],
          updatedAt: ''
        },
        {
          id: 'enc_done_1',
          name: 'Done Skirmish',
          groupId: 'arc_active_and_done',
          status: 'done',
          notes: 'Completed skirmish',
          monsters: [{ id: 'm2', monsterId: 'goblin', quantity: 1, groupCount: 1 }],
          reserve: [],
          updatedAt: ''
        },
        {
          id: 'enc_done_all',
          name: 'Old Boss Fight',
          groupId: 'arc_all_done',
          status: 'done',
          notes: 'Completed boss',
          monsters: [{ id: 'm3', monsterId: 'goblin', quantity: 1, groupCount: 1 }],
          reserve: [],
          updatedAt: ''
        },
        {
          id: 'enc_unused',
          name: 'Unused Patrol',
          groupId: 'arc_active_and_done',
          status: 'unused',
          notes: 'Unused patrol',
          monsters: [{ id: 'm4', monsterId: 'goblin', quantity: 1, groupCount: 1 }],
          reserve: [],
          updatedAt: ''
        }
      ],
      monsterDatabase: [
        { id: 'goblin', name: 'Goblin', hp: 7, ac: 15, encounterPoints: 0.1, dpr: 5 }
      ]
    });

    const { rerender } = render(
      <EncounterPlannerPage
        state={testState}
        submitAction={submitAction}
        onCreateMonster={vi.fn()}
        onOpenMonsterEditor={onOpenMonsterEditor}
        onOpenCombat={vi.fn()}
      />
    );

    // Active encounter in Arc 1 is visible
    expect(screen.getByRole('button', { name: /Active Ambush/i })).toBeInTheDocument();

    // Arc 1 has Done encounters collapsible detail
    expect(screen.getByText(/Done encounters \(1\)/i)).toBeInTheDocument();

    // Arc 2 has only done encounters, so the entire arc summary says "All done (1)"
    expect(screen.getByText(/All done \(1\)/i)).toBeInTheDocument();

    // Dedicated "Unused" arc is visible and contains Unused Patrol
    const unusedArc = document.querySelector('.unused-arc');
    expect(unusedArc).toBeInTheDocument();
    expect(within(unusedArc as HTMLElement).getAllByText(/^Unused$/).length).toBeGreaterThanOrEqual(1);
    expect(within(unusedArc as HTMLElement).getByRole('button', { name: /Unused Patrol/i })).toBeInTheDocument();

    // Open Active Ambush to test Edit monster button
    fireEvent.click(screen.getByRole('button', { name: /Active Ambush/i }));
    const editBtn = screen.getByRole('button', { name: /Edit monster/i });
    expect(editBtn).toBeInTheDocument();
    fireEvent.click(editBtn);
    await waitFor(() => {
      expect(onOpenMonsterEditor).toHaveBeenCalledWith('goblin');
    });

    // In CombatPage, LoadEncounterModal hides done encounters
    rerender(
      <CombatPage
        state={testState}
        role="dm"
        submitAction={submitAction}
        onOpenSpells={vi.fn()}
        onOpenInventory={vi.fn()}
        onOpenMonsters={vi.fn()}
      />
    );

    const loadBtn = screen.getByRole('button', { name: 'Load encounter' });
    fireEvent.click(loadBtn);

    const modal = screen.getByRole('dialog', { name: 'Load encounter from planner' });
    expect(within(modal).getByText('Active Ambush')).toBeInTheDocument();
    expect(within(modal).getByText('Unused Patrol')).toBeInTheDocument();
    expect(within(modal).queryByText('Done Skirmish')).not.toBeInTheDocument();
    expect(within(modal).queryByText('Old Boss Fight')).not.toBeInTheDocument();
  });

  it('displays expected HP vs actual HP and expected DPS vs actual DPS in MonsterEditorPage based on points', () => {
    const testState = gameState({
      encounterDifficulty: {
        easyMax: 8,
        mediumMax: 12,
        hardMin: 13,
        barMaximum: 20,
        hpPerPoint: 150,
        dprPerPointMin: 80,
        dprPerPointMax: 100
      },
      monsterDatabase: [
        {
          id: 'test_dragon',
          name: 'Red Drake',
          hp: 300,
          dpr: 170,
          encounterPoints: 2,
          combatType: 'elite'
        }
      ]
    });

    render(
      <MonsterEditorPage
        state={testState}
        editingMonsterId="test_dragon"
        submitAction={vi.fn()}
        onBackToDatabases={vi.fn()}
      />
    );

    // Points: 2.0 pt -> Expected HP = 2 * 150 = 300; Expected DPS = 2 * (80-100) = 160-200
    // Check points card
    expect(screen.getByText('Encounter Body (Points)')).toBeInTheDocument();
    expect(screen.getByText('2.0 pt')).toBeInTheDocument();

    // Check HP: Skutečné vs. Očekávané
    expect(screen.getByText('HP (Skutečné vs. Očekávané)')).toBeInTheDocument();
    expect(screen.getByText('300 oček.')).toBeInTheDocument();

    // Check DPS: Skutečný vs. Očekávaný
    expect(screen.getByText('DPS (Skutečný vs. Očekávaný)')).toBeInTheDocument();
    expect(screen.getByText('160–200 oček.')).toBeInTheDocument();
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

  it('applies sheet bonus rules and intimidation ability override', () => {
    const hero = character({
      proficiencyBonus: 6,
      abilityScores: { strength: 18, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 8 },
      skillProficiencies: ['athletics'],
      skillExpertise: [],
      skillAbilityOverrides: { intimidation: 'strength' },
      sheetBonuses: [
        { targetType: 'allSkills', valueMode: 'halfProficiency', value: 0, condition: 'ifNotProficientOrExpert', source: 'Special rule' },
        { targetType: 'allAbilityChecks', valueMode: 'halfProficiency', value: 0, condition: 'ifNotProficientOrExpert', source: 'Special rule' }
      ]
    });

    const adjusted = adjustedAbilityScores(hero);
    expect(skillBonus(hero, 'intimidation', adjusted.scores)).toBe(7);
    expect(skillBonus(hero, 'athletics', adjusted.scores)).toBe(10);
    expect(abilityCheckBonus(hero, 'dexterity', adjusted.scores)).toBe(3);
  });

  it('applies sheet and condition bonuses to AC, initiative and spellcasting numbers', () => {
    const hero = character({
      ac: 17,
      initBonus: 1,
      proficiencyBonus: 4,
      abilityScores: { strength: 10, dexterity: 14, constitution: 10, intelligence: 18, wisdom: 10, charisma: 10 },
      sheetGeneral: { spellcastingAbility: 'intelligence', speeds: { walk: 30, fly: 0, hover: 0, swim: 0, climb: 0, burrow: 0 } },
      effects: [{ name: 'Armor Class Increased', value: 2 }, { name: 'AC Buff', value: 2 }, { name: 'AC Debuff', value: 1 }, { name: 'Innate Sorcery' }],
      sheetBonuses: [
        { targetType: 'ac', valueMode: 'flat', value: 1, source: 'Shield' },
        { targetType: 'initiative', valueMode: 'flat', value: 3, source: 'Alert' },
        { targetType: 'spellAttack', valueMode: 'flat', value: 2, source: 'Wand' },
        { targetType: 'spellDc', valueMode: 'flat', value: 1, source: 'Focus' }
      ]
    });

    const adjusted = adjustedAbilityScores(hero);
    expect(armorClass(hero)).toBe(21);
    expect(initiativeBonus(hero, adjusted.scores) + (hero.initBonus || 0)).toBe(6);
    expect(spellAttackBonus(hero, adjusted.scores)).toBe(10);
    expect(spellSaveDc(hero, adjusted.scores)).toBe(18);
  });

  it('applies temporary max HP condition effects without changing base max HP', () => {
    const hero = character({
      maxHp: 50,
      currentHp: 45,
      effects: [
        { name: 'Max HP Increased', level: 10 },
        { name: 'Max HP Reduced', level: 5 }
      ]
    });

    expect(hero.maxHp).toBe(50);
    expect(effectiveMaxHp(hero)).toBe(55);
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
    encounters: [],
    encounterGroups: [],
    activeEncounterId: null,
    encounterDifficulty: {
      easyMax: 8,
      mediumMax: 12,
      hardMin: 13,
      barMaximum: 20,
      hpPerPoint: 150,
      dprPerPointMin: 80,
      dprPerPointMax: 100
    },
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
    maxReactions: 1,
    currentReactions: 1,
    effects: [],
    activeInCombat: true,
    revealedToPlayers: true,
    spellcasterLevel: 1,
    spellSlots: {},
    customFeatures: [],
    characterAbilities: [],
    characterActions: [],
    hitDice: { max: 1, current: 1 },
    proficiencyBonus: 2,
    abilityScores: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 },
    savingThrowProficiencies: [],
    skillProficiencies: [],
    skillExpertise: [],
    skillAbilityOverrides: {},
    sheetBonuses: [],
    sheetGeneral: { spellcastingAbility: 'charisma', speeds: { walk: 30, fly: 0, hover: 0, swim: 0, climb: 0, burrow: 0 } },
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
