import { ReactNode, useRef, useState } from 'react';
import { Modal } from './Modal';
import { DatabaseReference, useDatabaseReferences, useDiceReferenceClick } from './DatabaseReferences';
import { parseDiceExpression } from '../shared/dice';

interface RendererProps {
  text?: string;
  emptyLabel?: string;
}

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  /** Optional: parse the value into named items for the inline indicator */
  parseItems?: (value: string) => Array<{ name: string }>;
}

export function MarkdownRenderer({ text, emptyLabel = 'No notes.' }: RendererProps) {
  const source = text || '';
  const references = useDatabaseReferences();
  const onOpenDiceRoller = useDiceReferenceClick();
  const [detail, setDetail] = useState<DatabaseReference | null>(null);
  if (!source.trim()) return <p className="empty">{emptyLabel}</p>;

  function handleDiceClick(expression: string) {
    const cleaned = expression.replace(/\s+/g, '').replace(/[×⋅]/g, '*').replace(/[−–—]/g, '-');
    if (onOpenDiceRoller) {
      onOpenDiceRoller(cleaned);
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dnd:open-dice-roller', { detail: { expression: cleaned } }));
    }
  }

  return (
    <>
      <div className="markdown-render">
        {source.split(/\n{2,}/).map((block, blockIndex) => renderBlock(block, blockIndex, references, setDetail, handleDiceClick))}
      </div>
      {detail && <DatabaseReferenceModal reference={detail} onClose={() => setDetail(null)} />}
    </>
  );
}

export function MarkdownEditor({ value, onChange, placeholder, label = 'Markdown text', parseItems }: EditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [preview, setPreview] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Parse items for the indicator (only when parseItems prop is provided)
  const parsedItems = parseItems ? parseItems(value) : null;

  function applyWrap(before: string, after = before, defaultText = label) {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(`${value}${before}${after}`);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end);
    const next = `${value.slice(0, start)}${before}${selected || defaultText}${after}${value.slice(end)}`;
    onChange(next);
    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + (selected || defaultText).length);
    });
  }

  function insertPrefix(prefix: string) {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(`${value}\n${prefix}`);
      return;
    }
    const start = textarea.selectionStart;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const next = `${value.slice(0, lineStart)}${prefix}${value.slice(lineStart)}`;
    onChange(next);
    window.requestAnimationFrame(() => textarea.focus());
  }

  function insertBlock(block: string) {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(value ? `${value}\n\n${block}` : block);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const prefix = before && !before.endsWith('\n\n') ? before.endsWith('\n') ? '\n' : '\n\n' : '';
    const suffix = after && !after.startsWith('\n\n') ? after.startsWith('\n') ? '\n' : '\n\n' : '';
    const next = `${before}${prefix}${block}${suffix}${after}`;
    onChange(next);
    window.requestAnimationFrame(() => {
      textarea.focus();
      const cursor = before.length + prefix.length;
      textarea.setSelectionRange(cursor, cursor + block.length);
    });
  }

  // Compact indicator shown below the textarea
  const parsedIndicator = parsedItems && parsedItems.length > 0 ? (
    <div className="md-parsed-indicator">
      <span className="md-parsed-chip">{parsedItems.length} item{parsedItems.length !== 1 ? 's' : ''} parsed</span>
      {parsedItems.map((item, i) => (
        <span key={i} className="md-parsed-name">{item.name}</span>
      ))}
    </div>
  ) : parsedItems !== null ? (
    <div className="md-parsed-indicator md-parsed-empty">
      <span className="md-parsed-chip md-parsed-chip-empty">0 items — use <strong>1 Item</strong> button or <code>**Name.**</code> pattern</span>
    </div>
  ) : null;

  const toolbar = (
    <div className="markdown-toolbar" aria-label={`${label} formatting`}>
      <div className="markdown-toolbar-group">
        <button type="button" className="btn small markdown-tool" onClick={() => applyWrap('**', '.** ', 'Item Name')}>1 Item</button>
        <button type="button" className="btn small markdown-tool" onClick={() => applyWrap('**')}>Bold</button>
        <button type="button" className="btn small markdown-tool" onClick={() => applyWrap('*')}>Italic</button>
        <button type="button" className="btn small markdown-tool" onClick={() => insertPrefix('## ')}>Header</button>
        <button type="button" className="btn small markdown-tool" onClick={() => insertPrefix('- ')}>List</button>
        <button type="button" className="btn small markdown-tool" onClick={() => insertBlock('| Column 1 | Column 2 | Column 3 |\n| --- | --- | --- |\n| Value | Value | Value |')}>Table</button>
        <button type="button" className="btn small markdown-tool" onClick={() => applyWrap('[', '](https://)') }>Link</button>
        <button type="button" className="btn small markdown-tool" onClick={() => applyWrap('@[', ']')}>Reference</button>
        <button type="button" className="btn small markdown-tool" onClick={() => applyWrap('[br]', '', '')}>Line Break</button>
      </div>
      <div className="markdown-toolbar-group markdown-view-group">
        <button type="button" className="btn small markdown-preview-toggle" onClick={() => setPreview(value => !value)}>{preview ? 'Edit text' : 'Preview'}</button>
        <button type="button" className="btn small purple markdown-popout" onClick={() => setExpanded(true)}>Pop out</button>
      </div>
    </div>
  );

  return (
    <div className="markdown-editor">
      {toolbar}
      {preview ? (
        <div className="markdown-preview">
          <MarkdownRenderer text={value} />
        </div>
      ) : (
        <>
          <textarea ref={textareaRef} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} aria-label={label} />
          {parsedIndicator}
        </>
      )}
      {expanded && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card markdown-modal">
            <div className="section-title-row">
              <div>
                <h2>{label}</h2>
                <p>Write notes with lightweight Markdown formatting.</p>
              </div>
              <button type="button" className="btn" onClick={() => setExpanded(false)}>Close</button>
            </div>
            {toolbar}
            <textarea
              ref={textareaRef}
              className="markdown-expanded-input"
              value={value}
              onChange={event => onChange(event.target.value)}
              placeholder={placeholder}
              aria-label={label}
            />
            {parsedIndicator}
            <div className="markdown-preview">
              <MarkdownRenderer text={value} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function renderBlock(
  block: string,
  key: number,
  references: DatabaseReference[],
  onReferenceClick: (reference: DatabaseReference) => void,
  onDiceClick: (expression: string) => void
) {
  const trimmed = block.trim();
  const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
  if (heading) {
    const level = heading[1].length;
    const content = renderInline(heading[2], `${key}-h`, references, onReferenceClick, onDiceClick);
    if (level === 1) return <h3 key={key}>{content}</h3>;
    return <h4 key={key}>{content}</h4>;
  }

  const lines = trimmed.split('\n');
  const leadingBreakCount = countLeadingBreakLines(lines);
  const table = parseTable(lines.slice(leadingBreakCount));
  if (table) {
    return (
      <>
        {Array.from({ length: leadingBreakCount }, (_, index) => <br key={`${key}-br-${index}`} />)}
        <div key={key} className="markdown-table-wrap">
          <table className="markdown-table">
            <thead>
              <tr>
                {table.headers.map((header, index) => (
                  <th key={index}>{renderInline(header, `${key}-th-${index}`, references, onReferenceClick, onDiceClick)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {table.headers.map((_, cellIndex) => (
                    <td key={cellIndex}>{renderInline(row[cellIndex] || '', `${key}-td-${rowIndex}-${cellIndex}`, references, onReferenceClick, onDiceClick)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  if (lines.every(line => /^-\s+/.test(line.trim()))) {
    return (
      <ul key={key}>
        {lines.map((line, index) => <li key={index}>{renderInline(line.replace(/^-\s+/, ''), `${key}-${index}`, references, onReferenceClick, onDiceClick)}</li>)}
      </ul>
    );
  }

  return <p key={key}>{lines.map((line, index) => <span key={index}>{renderInline(line, `${key}-${index}`, references, onReferenceClick, onDiceClick)}{index < lines.length - 1 && <br />}</span>)}</p>;
}

function countLeadingBreakLines(lines: string[]) {
  let count = 0;
  while (count < lines.length && /^\s*(?:\[br\]|<br\s*\/?>)\s*$/i.test(lines[count])) {
    count += 1;
  }
  return count;
}

function parseTable(lines: string[]) {
  if (lines.length < 2 || !lines[0].includes('|') || !lines[1].includes('|')) return null;
  const separator = splitTableRow(lines[1]);
  if (separator.length === 0 || !separator.every(cell => /^:?-{3,}:?$/.test(cell))) return null;
  const headers = splitTableRow(lines[0]);
  if (headers.length === 0) return null;
  const rows = lines.slice(2)
    .filter(line => line.includes('|'))
    .map(splitTableRow)
    .filter(row => row.length > 0);
  return { headers, rows };
}

function splitTableRow(line: string) {
  let trimmed = line.trim();
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
  if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1);
  return trimmed.split('|').map(cell => cell.trim());
}

function renderInline(
  text: string,
  keyPrefix: string,
  references: DatabaseReference[],
  onReferenceClick: (reference: DatabaseReference) => void,
  onDiceClick: (expression: string) => void
): ReactNode[] {
  const parts: ReactNode[] = [];
  let index = 0;

  while (index < text.length) {
    const key = `${keyPrefix}-${index}`;
    const remaining = text.slice(index);

    const brMatch = remaining.match(/^\[br\]/i) || remaining.match(/^<br\s*\/?>/i);
    if (brMatch) {
      parts.push(<br key={key} />);
      index += brMatch[0].length;
      continue;
    }

    const link = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (link) {
      const href = link[2] || '';
      const safeHref = /^(https?:|mailto:)/i.test(href) ? href : undefined;
      parts.push(safeHref ? <a key={key} href={safeHref} target="_blank" rel="noreferrer">{link[1]}</a> : <span key={key}>{link[1]}</span>);
      index += link[0].length;
      continue;
    }

    const bold = remaining.match(/^\*\*([^*]+)\*\*/);
    if (bold) {
      parts.push(<strong key={key}>{renderInline(bold[1], `${key}-b`, references, onReferenceClick, onDiceClick)}</strong>);
      index += bold[0].length;
      continue;
    }

    const italic = remaining.match(/^\*([^*]+)\*/);
    if (italic) {
      parts.push(<em key={key}>{renderInline(italic[1], `${key}-i`, references, onReferenceClick, onDiceClick)}</em>);
      index += italic[0].length;
      continue;
    }

    if (text[index] === '@') {
      const bracket = remaining.match(/^@\[([^\]]+)\]/);
      const match = bracket
        ? referenceByName(bracket[1], references)
        : referenceAtTextStart(remaining.slice(1), references);
      if (match) {
        parts.push(
          <button
            key={key}
            type="button"
            className={`markdown-reference markdown-reference-${match.reference.kind}`}
            onClick={() => onReferenceClick(match.reference)}
          >
            {match.reference.name}
          </button>
        );
        index += bracket ? bracket[0].length : match.length + 1;
        continue;
      }
      if (bracket) {
        const diceCandidate = bracket[1].trim();
        if (isValidDiceCandidate(diceCandidate)) {
          parts.push(
            <button
              key={key}
              type="button"
              className="markdown-reference markdown-reference-dice"
              onClick={() => onDiceClick(diceCandidate)}
            >
              {diceCandidate}
            </button>
          );
          index += bracket[0].length;
          continue;
        }
      }
    }

    const prevChar = index > 0 ? text[index - 1] : '';
    if (!/[A-Za-z0-9_]/.test(prevChar)) {
      const diceMatch = matchDiceAtTextStart(remaining);
      if (diceMatch) {
        parts.push(
          <button
            key={key}
            type="button"
            className="markdown-reference markdown-reference-dice"
            onClick={() => onDiceClick(diceMatch)}
          >
            {diceMatch}
          </button>
        );
        index += diceMatch.length;
        continue;
      }
    }

    parts.push(text[index]);
    index += 1;
  }

  return parts;
}

function isValidDiceCandidate(candidate: string): boolean {
  if (!/\d*d\d+/i.test(candidate)) return false;
  try {
    const terms = parseDiceExpression(candidate);
    return termsContainDice(terms);
  } catch {
    return false;
  }
}

function termsContainDice(terms: ReturnType<typeof parseDiceExpression>): boolean {
  return terms.some(term => typeof term.sides === 'number' || (term.innerTerms ? termsContainDice(term.innerTerms) : false));
}

function matchDiceAtTextStart(text: string): string | null {
  const firstChar = text[0];
  if (!firstChar || (!/[0-9(dD]/.test(firstChar))) return null;
  if ((firstChar === 'd' || firstChar === 'D') && !/^d\d+/i.test(text)) return null;

  let maxEnd = 0;
  while (maxEnd < text.length && /[0-9dD+\-*×⋅−–—()\s]/.test(text[maxEnd])) {
    maxEnd += 1;
  }

  const rawSlice = text.slice(0, maxEnd);
  if (!/\d*d\d+/i.test(rawSlice)) return null;

  for (let len = maxEnd; len >= 2; len--) {
    const endChar = text[len - 1];
    if (!/[0-9)]/.test(endChar)) continue;
    const nextChar = text[len] || '';
    if (/[A-Za-z0-9_]/.test(nextChar)) continue;
    const candidate = text.slice(0, len);
    if (!/\d*d\d+/i.test(candidate)) continue;
    if (!hasBalancedParentheses(candidate)) continue;
    if (isWrappedInRedundantParentheses(candidate)) continue;
    if (isValidDiceCandidate(candidate)) {
      return candidate;
    }
  }

  return null;
}

function isWrappedInRedundantParentheses(value: string): boolean {
  if (!value.startsWith('(') || !value.endsWith(')')) return false;
  let depth = 0;
  for (let i = 0; i < value.length - 1; i++) {
    const ch = value[i];
    if (ch === '(') depth += 1;
    else if (ch === ')') {
      depth -= 1;
      if (depth === 0) return false;
    }
  }
  return true;
}

function hasBalancedParentheses(value: string): boolean {
  let depth = 0;
  for (const ch of value) {
    if (ch === '(') depth += 1;
    else if (ch === ')') {
      depth -= 1;
      if (depth < 0) return false;
    }
  }
  return depth === 0;
}

function referenceByName(name: string, references: DatabaseReference[]) {
  const normalized = normalizeReferenceName(name);
  const reference = references.find(item => normalizeReferenceName(item.name) === normalized);
  return reference ? { reference, length: name.length } : null;
}

function referenceAtTextStart(text: string, references: DatabaseReference[]) {
  for (const reference of references) {
    if (!startsWithReferenceName(text, reference.name)) continue;
    return { reference, length: reference.name.length };
  }
  return null;
}

function startsWithReferenceName(text: string, name: string) {
  if (text.slice(0, name.length).toLowerCase() !== name.toLowerCase()) return false;
  const next = text[name.length];
  return !next || !/[A-Za-z0-9_'-]/.test(next);
}

function normalizeReferenceName(name: string) {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function DatabaseReferenceModal({ reference, onClose }: { reference: DatabaseReference; onClose: () => void }) {
  const item = reference.item;
  return (
    <Modal className="item-modal-backdrop">
      <div className="modal-card item-modal-card database-reference-modal">
        <div className="section-title-row">
          <div>
            <h2>{reference.name}</h2>
            <p>{referenceLabel(reference)}</p>
          </div>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
        {reference.kind === 'spell' && <SpellReferenceDetails item={item} />}
        {reference.kind === 'condition' && <ConditionReferenceDetails item={item} />}
        {reference.kind === 'monster' && <MonsterReferenceDetails item={item} />}
      </div>
    </Modal>
  );
}

function referenceLabel(reference: DatabaseReference) {
  if (reference.kind === 'spell') {
    return `${reference.item.levelLabel || 'Spell'} · ${reference.item.school || 'Unknown school'} · ${reference.item.source || 'Unknown source'}`;
  }
  if (reference.kind === 'condition') {
    return `${reference.item.kind || 'neutral'} condition${reference.item.source ? ` · ${reference.item.source}` : ''}`;
  }
  return `Monster${reference.item.source ? ` · ${reference.item.source}` : ''}`;
}

function SpellReferenceDetails({ item }: { item: Record<string, unknown> }) {
  return (
    <>
      <div className="stats-grid">
        <div className="stat"><span>Casting</span><strong>{String(item.castingTime || '-')}</strong></div>
        <div className="stat"><span>Range</span><strong>{String(item.range || '-')}</strong></div>
        <div className="stat"><span>Duration</span><strong>{String(item.duration || '-')}</strong></div>
        <div className="stat"><span>Components</span><strong>{String(item.components || '-')}</strong></div>
      </div>
      <div className="item-detail-body">
        <MarkdownRenderer text={String(item.description || '')} emptyLabel="No spell description." />
        {item.atHigherLevels && (
          <>
            <h3>At Higher Levels</h3>
            <MarkdownRenderer text={String(item.atHigherLevels)} />
          </>
        )}
      </div>
    </>
  );
}

function ConditionReferenceDetails({ item }: { item: Record<string, unknown> }) {
  const dice = item.hasDice || item.defaultDiceCount || item.defaultDiceSides || item.defaultDamageType
    ? `${item.defaultDiceCount || 1}d${item.defaultDiceSides || 4}${item.defaultDamageType ? ` ${item.defaultDamageType}` : ''}`
    : '';
  return (
    <>
      <div className="stats-grid">
        <div className="stat"><span>Kind</span><strong>{String(item.kind || 'neutral')}</strong></div>
        <div className="stat"><span>Levels</span><strong>{item.hasLevels ? `1-${item.maxLevel || 6}` : '-'}</strong></div>
        <div className="stat"><span>Dice</span><strong>{dice || '-'}</strong></div>
        <div className="stat"><span>Source</span><strong>{String(item.source || '-')}</strong></div>
      </div>
      <div className="item-detail-body">
        <MarkdownRenderer text={String(item.description || item.effect || '')} emptyLabel="No condition details." />
      </div>
    </>
  );
}

function MonsterReferenceDetails({ item }: { item: Record<string, unknown> }) {
  return (
    <>
      <div className="stats-grid">
        <div className="stat"><span>HP</span><strong>{String(item.hp || item.maxHp || '-')}</strong></div>
        <div className="stat"><span>AC</span><strong>{String(item.ac || '-')}</strong></div>
        <div className="stat"><span>Initiative</span><strong>{String(item.initBonus || 0)}</strong></div>
        <div className="stat"><span>Power</span><strong>{String(item.maxPower || 0)} {String(item.powerName || '')}</strong></div>
      </div>
      <div className="item-detail-body">
        <MarkdownRenderer text={String(item.description || item.statblock || '')} emptyLabel="No monster statblock." />
      </div>
    </>
  );
}
