import { ReactNode, useRef, useState } from 'react';
import { Modal } from './Modal';
import { DatabaseReference, useDatabaseReferences } from './DatabaseReferences';

interface RendererProps {
  text?: string;
  emptyLabel?: string;
}

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

export function MarkdownRenderer({ text, emptyLabel = 'No notes.' }: RendererProps) {
  const source = text || '';
  const references = useDatabaseReferences();
  const [detail, setDetail] = useState<DatabaseReference | null>(null);
  if (!source.trim()) return <p className="empty">{emptyLabel}</p>;

  return (
    <>
      <div className="markdown-render">
        {source.split(/\n{2,}/).map((block, blockIndex) => renderBlock(block, blockIndex, references, setDetail))}
      </div>
      {detail && <DatabaseReferenceModal reference={detail} onClose={() => setDetail(null)} />}
    </>
  );
}

export function MarkdownEditor({ value, onChange, placeholder, label = 'Markdown text' }: EditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [preview, setPreview] = useState(false);
  const [expanded, setExpanded] = useState(false);

  function applyWrap(before: string, after = before) {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(`${value}${before}${after}`);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end);
    const next = `${value.slice(0, start)}${before}${selected || label}${after}${value.slice(end)}`;
    onChange(next);
    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + (selected || label).length);
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

  const toolbar = (
    <div className="markdown-toolbar" aria-label={`${label} formatting`}>
      <div className="markdown-toolbar-group">
        <button type="button" className="btn small markdown-tool" onClick={() => applyWrap('**')}>Bold</button>
        <button type="button" className="btn small markdown-tool" onClick={() => applyWrap('*')}>Italic</button>
        <button type="button" className="btn small markdown-tool" onClick={() => insertPrefix('## ')}>Header</button>
        <button type="button" className="btn small markdown-tool" onClick={() => insertPrefix('- ')}>List</button>
        <button type="button" className="btn small markdown-tool" onClick={() => applyWrap('[', '](https://)')}>Link</button>
        <button type="button" className="btn small markdown-tool" onClick={() => applyWrap('@[', ']')}>Reference</button>
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
        <textarea ref={textareaRef} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} aria-label={label} />
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
  onReferenceClick: (reference: DatabaseReference) => void
) {
  const trimmed = block.trim();
  const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
  if (heading) {
    const level = heading[1].length;
    const content = renderInline(heading[2], `${key}-h`, references, onReferenceClick);
    if (level === 1) return <h3 key={key}>{content}</h3>;
    return <h4 key={key}>{content}</h4>;
  }

  const lines = trimmed.split('\n');
  if (lines.every(line => /^-\s+/.test(line.trim()))) {
    return (
      <ul key={key}>
        {lines.map((line, index) => <li key={index}>{renderInline(line.replace(/^-\s+/, ''), `${key}-${index}`, references, onReferenceClick)}</li>)}
      </ul>
    );
  }

  return <p key={key}>{lines.map((line, index) => <span key={index}>{renderInline(line, `${key}-${index}`, references, onReferenceClick)}{index < lines.length - 1 && <br />}</span>)}</p>;
}

function renderInline(
  text: string,
  keyPrefix: string,
  references: DatabaseReference[],
  onReferenceClick: (reference: DatabaseReference) => void
): ReactNode[] {
  const parts: ReactNode[] = [];
  let index = 0;

  while (index < text.length) {
    const key = `${keyPrefix}-${index}`;
    const remaining = text.slice(index);
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
      parts.push(<strong key={key}>{bold[1]}</strong>);
      index += bold[0].length;
      continue;
    }

    const italic = remaining.match(/^\*([^*]+)\*/);
    if (italic) {
      parts.push(<em key={key}>{italic[1]}</em>);
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
    }

    parts.push(text[index]);
    index += 1;
  }

  return parts;
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

function DatabaseReferenceModal({ reference, onClose }: { reference: DatabaseReference; onClose: () => void }) {
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
