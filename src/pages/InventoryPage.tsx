import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { Character, ClientRole, GameAction, GameState } from '../shared/types';
import { CollapsiblePanelGroup } from '../components/CollapsiblePanel';
import { MarkdownEditor, MarkdownRenderer } from '../components/Markdown';
import { Modal } from '../components/Modal';
import { SearchPicker } from '../components/SearchPicker';

interface Props {
  state: GameState;
  role: ClientRole;
  submitAction: (action: GameAction) => Promise<unknown>;
  selectedCharacterId?: string | null;
  onSelectCharacter: (characterId: string) => void;
  onBackToCombat: () => void;
}

type ItemKind = 'general' | 'component' | 'potion' | 'scroll' | 'magic';

export function InventoryPage({ state, submitAction, selectedCharacterId, onSelectCharacter, onBackToCombat }: Props) {
  const players = state.characters.filter(character => character.type === 'player');
  const [selectedId, setSelectedId] = useState(selectedCharacterId || players[0]?.id || '');
  const selected = useMemo(
    () => players.find(character => String(character.id) === String(selectedId)) || players[0],
    [players, selectedId]
  );

  useEffect(() => {
    if (selectedCharacterId && players.some(character => String(character.id) === String(selectedCharacterId))) {
      setSelectedId(String(selectedCharacterId));
    }
  }, [selectedCharacterId]);

  useEffect(() => {
    if (!selectedId && players[0]) {
      const fallback = String(players[0].id);
      setSelectedId(fallback);
      onSelectCharacter(fallback);
    } else if (selectedId && players.length > 0 && !players.some(character => String(character.id) === String(selectedId))) {
      const fallback = String(players[0].id);
      setSelectedId(fallback);
      onSelectCharacter(fallback);
    }
  }, [players, selectedId, onSelectCharacter]);

  function selectCharacter(characterId: string) {
    setSelectedId(characterId);
    onSelectCharacter(characterId);
  }

  if (!selected) {
    return (
      <section className="section page-sticky-section">
        <div className="section-title-row">
          <div>
            <h2>Inventory</h2>
            <p>No player characters.</p>
          </div>
          <button className="btn" onClick={onBackToCombat}>Back to Combat</button>
        </div>
      </section>
    );
  }

  return (
    <div className="stack">
      <section className="section page-sticky-section">
        <div className="section-title-row">
          <div>
            <h2>Inventory</h2>
            <p>Draft fields are local until submitted.</p>
          </div>
          <div className="button-row">
            <select data-testid="inventory-character-select" value={String(selected.id)} onChange={event => selectCharacter(event.target.value)}>
              {players.map(character => <option key={character.id} value={String(character.id)}>{character.name}</option>)}
            </select>
            <button className="btn" onClick={onBackToCombat}>Back to Combat</button>
          </div>
        </div>
      </section>
      <InventoryDetail
        character={selected}
        players={players}
        magicItemDatabase={state.magicItemDatabase || []}
        potionDatabase={state.potionDatabase || []}
        spellDatabase={state.spellDatabase || []}
        submitAction={submitAction}
      />
    </div>
  );
}

function InventoryDetail({
  character,
  players,
  magicItemDatabase,
  potionDatabase,
  spellDatabase,
  submitAction
}: {
  character: Character;
  players: Character[];
  magicItemDatabase: Array<Record<string, unknown>>;
  potionDatabase: Array<Record<string, unknown>>;
  spellDatabase: Array<Record<string, unknown>>;
  submitAction: Props['submitAction'];
}) {
  const inventory = character.inventory;
  const [currencyDrafts, setCurrencyDrafts] = useState<Record<string, string>>({});

  function currencyValue(key: keyof Character['inventory']['currency']) {
    return currencyDrafts[key] ?? String(inventory.currency[key] || 0);
  }

  function commitCurrency(key: keyof Character['inventory']['currency']) {
    submitAction({
      type: 'inventory.currency.set',
      payload: { characterId: character.id, currency: key, value: Number(currencyValue(key)) || 0 }
    }).then(() => setCurrencyDrafts(current => ({ ...current, [key]: '' })));
  }

  return (
    <>
      <CollapsiblePanelGroup
        panels={[
          {
            id: 'currency',
            title: `${character.name} currency`,
            summary: 'Coins and loose resources.',
            content: (
              <div className="currency-grid">
                {(['manaCoins', 'platinum', 'gold', 'silver', 'copper'] as const).map(key => (
                  <label key={key} className="field-card">
                    <span>{key}</span>
                    <input
                      value={currencyValue(key)}
                      type="number"
                      onChange={event => setCurrencyDrafts(current => ({ ...current, [key]: event.target.value }))}
                      onBlur={() => commitCurrency(key)}
                    />
                  </label>
                ))}
              </div>
            )
          },
          {
            id: 'add-item',
            title: 'Add item',
            summary: 'Create notes or use databases.',
            content: <AddItemForm characterId={character.id} magicItemDatabase={magicItemDatabase} potionDatabase={potionDatabase} spellDatabase={spellDatabase} submitAction={submitAction} />
          }
        ]}
      />

      <section className="section">
        <h2>{character.name}</h2>
        <p>Click an item to open details, notes and actions.</p>
      </section>

      <section className="inventory-grid">
        <InventoryList title="Spell Components" collection="spellComponents" items={inventory.spellComponents} character={character} players={players} submitAction={submitAction} />
        <InventoryList title="Potions" collection="potions" items={inventory.potions} character={character} players={players} submitAction={submitAction} />
        <InventoryList title="Scrolls" collection="scrolls" items={inventory.scrolls} character={character} players={players} submitAction={submitAction} />
        <InventoryList title="General" collection="generalItems" items={inventory.generalItems} character={character} players={players} submitAction={submitAction} />
        <InventoryList title="Magic Items" collection="magicItems" items={inventory.magicItems} character={character} players={players} submitAction={submitAction} />
      </section>
    </>
  );
}

function AddItemForm({
  characterId,
  magicItemDatabase,
  potionDatabase,
  spellDatabase,
  submitAction
}: {
  characterId: string;
  magicItemDatabase: Array<Record<string, unknown>>;
  potionDatabase: Array<Record<string, unknown>>;
  spellDatabase: Array<Record<string, unknown>>;
  submitAction: Props['submitAction'];
}) {
  const [kind, setKind] = useState<ItemKind>('general');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [trackingType, setTrackingType] = useState<'count' | 'value'>('count');
  const [goldValue, setGoldValue] = useState('0');
  const [description, setDescription] = useState('');
  const [databaseItem, setDatabaseItem] = useState<Record<string, unknown> | null>(null);
  const [databaseSearch, setDatabaseSearch] = useState('');
  const databaseItems = kind === 'potion'
    ? potionDatabase
    : kind === 'magic'
      ? magicItemDatabase
      : kind === 'scroll'
        ? spellDatabase
      : [];
  const matchingDatabaseItems = matchingItems(databaseItems, databaseSearch);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    const item = kind === 'scroll'
      ? { spellName: name.trim(), quantity: Number(quantity) || 1 }
      : kind === 'component'
        ? { name: name.trim(), trackingType, count: Number(quantity) || 0, goldValue: Number(goldValue) || 0, description }
        : { name: name.trim(), quantity: Number(quantity) || 1, description };
    await submitAction({ type: 'inventory.item.add', payload: { characterId, itemType: kind, item } });
    setName('');
    setQuantity('1');
    setGoldValue('0');
    setDescription('');
  }

  return (
    <div className="stack compact-stack">
      <form className="form-grid" onSubmit={submit} data-testid="add-item-form">
        <select value={kind} onChange={event => setKind(event.target.value as ItemKind)}>
          <option value="general">General</option>
          <option value="component">Spell Component</option>
          <option value="potion">Potion</option>
          <option value="scroll">Scroll</option>
          <option value="magic">Magic</option>
        </select>
        <input value={name} onChange={event => setName(event.target.value)} placeholder="Item name" data-testid="item-name" />
        {kind === 'component' && (
          <select value={trackingType} onChange={event => setTrackingType(event.target.value as 'count' | 'value')}>
            <option value="count">Track count</option>
            <option value="value">Track gold value</option>
          </select>
        )}
        {(kind !== 'component' || trackingType === 'count') && <input value={quantity} onChange={event => setQuantity(event.target.value)} type="number" placeholder="Quantity" />}
        {kind === 'component' && trackingType === 'value' && <input value={goldValue} onChange={event => setGoldValue(event.target.value)} type="number" placeholder="Gold value" />}
        <div className="form-wide">
          <MarkdownEditor value={description} onChange={setDescription} placeholder="Description / notes" label="Item notes" />
        </div>
        <button className="btn success">Add custom item</button>
      </form>
      {databaseItems.length > 0 && (
        <div className="stack compact-stack">
          <SearchPicker
            items={databaseItems}
            query={databaseSearch}
            onQueryChange={setDatabaseSearch}
            selectedId={String((databaseItem || databaseItems[0])?.id || '')}
            onSelect={setDatabaseItem}
            placeholder={`Search ${kind === 'potion' ? 'potions' : kind === 'scroll' ? 'spells for scrolls' : 'magic items'}`}
            getId={item => String(item.id)}
            getLabel={item => String(item.name || 'Item')}
            getMeta={item => kind === 'potion' ? String(item.rarity || 'Potion') : kind === 'scroll' ? `${item.levelLabel || 'Spell'} · ${item.school || ''}` : `${item.itemType || 'Magic item'} · ${item.rarity || 'Unknown rarity'}`}
            getDescription={item => String(item.description || item.effect || '').slice(0, 140)}
          />
          <button
            className="btn purple"
            onClick={() => {
              const item = databaseItem && matchingDatabaseItems.includes(databaseItem) ? databaseItem : matchingDatabaseItems[0] || databaseItems[0];
              if (!item) return;
              const itemType = kind === 'potion' ? 'potion' : kind === 'scroll' ? 'scroll' : 'magic';
              submitAction({
                type: 'inventory.item.add',
                payload: {
                  characterId,
                  itemType,
                  item: {
                    name: String(item.name || 'Item'),
                    spellName: String(item.name || 'Scroll'),
                    itemType: String(item.itemType || item.type || 'Wondrous item'),
                    rarity: String(item.rarity || ''),
                    description: String(item.description || item.effect || ''),
                    quantity: 1
                  }
                }
              });
            }}
          >
            Add from database
          </button>
        </div>
      )}
    </div>
  );
}

function InventoryList({
  title,
  collection,
  items,
  character,
  players,
  submitAction
}: {
  title: string;
  collection: 'spellComponents' | 'potions' | 'scrolls' | 'generalItems' | 'magicItems';
  items: unknown[];
  character: Character;
  players: Character[];
  submitAction: Props['submitAction'];
}) {
  return (
    <section className="section">
      <h2>{title}</h2>
      {items.length === 0 && <p className="empty">Empty.</p>}
      <div className="item-list">
        {items.map((item, index) => (
          <InventoryRow
            key={`${collection}-${index}`}
            item={item}
            index={index}
            collection={collection}
            character={character}
            players={players}
            submitAction={submitAction}
          />
        ))}
      </div>
    </section>
  );
}

function InventoryRow({
  item,
  index,
  collection,
  character,
  players,
  submitAction
}: {
  item: any;
  index: number;
  collection: string;
  character: Character;
  players: Character[];
  submitAction: Props['submitAction'];
}) {
  const [quantity, setQuantity] = useState(String(item.trackingType === 'value' ? item.goldValue ?? 0 : item.count ?? item.quantity ?? 1));
  const [target, setTarget] = useState(players.find(player => player.id !== character.id)?.id || '');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const name = typeof item === 'string' ? item : (item.name || item.spellName || 'Item');
  const description = itemDescription(item);
  const [draftName, setDraftName] = useState(String(name));
  const [draftDescription, setDraftDescription] = useState(description);
  const [draftQuantity, setDraftQuantity] = useState(String(item.trackingType === 'value' ? item.goldValue ?? 0 : item.count ?? item.quantity ?? 1));
  const [draftTrackingType, setDraftTrackingType] = useState<'count' | 'value'>(item.trackingType === 'value' ? 'value' : 'count');
  const collectionLabel = collection === 'spellComponents' ? 'Spell component' : collection === 'generalItems' ? 'General note' : collection === 'magicItems' ? 'Magic item' : collection === 'potions' ? 'Potion' : 'Scroll';
  const amountLabel = amountLabelForItem(collection, item);

  function openModal() {
    setDraftName(String(name));
    setDraftDescription(description);
    setDraftQuantity(String(item.trackingType === 'value' ? item.goldValue ?? 0 : item.count ?? item.quantity ?? 1));
    setDraftTrackingType(item.trackingType === 'value' ? 'value' : 'count');
    setEditing(false);
    setOpen(true);
  }

  async function saveEdit() {
    const updated = {
      ...(typeof item === 'string' ? {} : item),
      name: draftName.trim() || String(name),
      spellName: draftName.trim() || String(name),
      quantity: collection === 'spellComponents' ? undefined : Number(draftQuantity) || 0,
      trackingType: collection === 'spellComponents' ? draftTrackingType : undefined,
      count: collection === 'spellComponents' && draftTrackingType === 'count' ? Number(draftQuantity) || 0 : undefined,
      goldValue: collection === 'spellComponents' && draftTrackingType === 'value' ? Number(draftQuantity) || 0 : undefined,
      description: draftDescription
    };
    await submitAction({ type: 'inventory.item.update', payload: { characterId: character.id, collection, index, item: updated } });
    setQuantity(String(updated.quantity));
    setEditing(false);
  }

  return (
    <>
      <button className="item-row item-summary-row" type="button" onClick={openModal} data-testid={`inventory-item-${name}`}>
        <div className="item-summary-main">
          <strong>{name}</strong>
          {description && <p>{plainPreview(description)}</p>}
        </div>
        {amountLabel && <span className="item-quantity">{amountLabel}</span>}
      </button>
      {open && (
        <Modal className="item-modal-backdrop">
          <div className="modal-card item-modal-card">
            <div className="section-title-row">
              <div>
                <h2>{name}</h2>
                <p>{collectionLabel}</p>
              </div>
              <div className="button-row">
                {!editing && <button className="btn" onClick={() => setEditing(true)}>Edit</button>}
                <button className="btn" onClick={() => setOpen(false)}>Close</button>
              </div>
            </div>
            {editing ? (
              <div className="item-edit-form">
                <div className="form-grid">
                  <input value={draftName} onChange={event => setDraftName(event.target.value)} placeholder="Item name" />
                  {collection === 'spellComponents' && (
                    <select value={draftTrackingType} onChange={event => setDraftTrackingType(event.target.value as 'count' | 'value')}>
                      <option value="count">Track count</option>
                      <option value="value">Track gold value</option>
                    </select>
                  )}
                  {(collection === 'spellComponents' || 'quantity' in Object(item)) && (
                    <input value={draftQuantity} onChange={event => setDraftQuantity(event.target.value)} type="number" min={0} placeholder={collection === 'spellComponents' && draftTrackingType === 'value' ? 'Gold value' : 'Quantity'} />
                  )}
                  <div className="form-wide">
                    <MarkdownEditor value={draftDescription} onChange={setDraftDescription} placeholder="Description / notes" label={`${name} notes`} />
                  </div>
                </div>
                <div className="button-row rest-row">
                  <button className="btn success" onClick={saveEdit}>Save edits</button>
                  <button className="btn" onClick={() => setEditing(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="item-detail-body">
                <MarkdownRenderer text={description} emptyLabel={collection === 'generalItems' ? 'No notes yet.' : 'No item description.'} />
              </div>
            )}
            <div className="form-grid">
              {(collection === 'spellComponents' || 'quantity' in Object(item)) && (
                <label className="field-card">
                  <span>{collection === 'spellComponents' && item.trackingType === 'value' ? 'Gold value' : 'Quantity'}</span>
                  <input
                    value={quantity}
                    type="number"
                    onChange={event => setQuantity(event.target.value)}
                    onBlur={() => {
                      if (collection === 'spellComponents') {
                        const updated = {
                          ...(typeof item === 'string' ? {} : item),
                          [item.trackingType === 'value' ? 'goldValue' : 'count']: Number(quantity) || 0
                        };
                        submitAction({ type: 'inventory.item.update', payload: { characterId: character.id, collection, index, item: updated } });
                      } else {
                        submitAction({ type: 'inventory.item.quantity', payload: { characterId: character.id, collection, index, quantity: Number(quantity) || 0 } });
                      }
                    }}
                  />
                </label>
              )}
              {collection === 'magicItems' && (
                <label className="inline-check modal-check">
                  <input
                    type="checkbox"
                    checked={Boolean(item.attuned)}
                    onChange={event => submitAction({ type: 'inventory.magic.attune', payload: { characterId: character.id, index, attuned: event.target.checked } })}
                  />
                  Attuned
                </label>
              )}
              <select value={target} onChange={event => setTarget(event.target.value)}>
                <option value="">Transfer...</option>
                {players.filter(player => player.id !== character.id).map(player => <option key={player.id} value={player.id}>{player.name}</option>)}
              </select>
            </div>
            <div className="button-row rest-row">
              <button
                className="btn warning"
                disabled={!target}
                onClick={() => submitAction({ type: 'inventory.item.transfer', payload: { sourceCharacterId: character.id, targetCharacterId: target, collection, index } }).then(() => setOpen(false))}
              >
                Transfer
              </button>
              <button className="btn danger" onClick={() => submitAction({ type: 'inventory.item.remove', payload: { characterId: character.id, collection, index } }).then(() => setOpen(false))}>
                Remove
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function itemDescription(item: any) {
  if (typeof item === 'string') return '';
  return String(item.description || item.notes || item.effect || '');
}

function componentAmountLabel(item: any) {
  if (item.trackingType === 'value') return `${item.goldValue ?? 0} gp`;
  return `x${item.count ?? item.quantity ?? 0}`;
}

function amountLabelForItem(collection: string, item: any) {
  if (collection === 'spellComponents') return componentAmountLabel(item);
  const quantity = Number(item?.quantity ?? 1);
  if (collection === 'potions' || collection === 'scrolls') return `x${quantity}`;
  return quantity > 1 ? `x${quantity}` : '';
}

function plainPreview(text: string) {
  return text.replace(/[#*_`[\]()]/g, '').replace(/\s+/g, ' ').trim().slice(0, 120);
}

function matchingItems<T extends Record<string, unknown>>(items: T[], query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return items;
  return items.filter(item => Object.values(item).join(' ').toLowerCase().includes(needle));
}
