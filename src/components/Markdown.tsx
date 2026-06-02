import { ReactNode, useRef, useState } from 'react';

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
  if (!source.trim()) return <p className="empty">{emptyLabel}</p>;

  return (
    <div className="markdown-render">
      {source.split(/\n{2,}/).map((block, blockIndex) => renderBlock(block, blockIndex))}
    </div>
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
        <textarea ref={textareaRef} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} />
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

function renderBlock(block: string, key: number) {
  const trimmed = block.trim();
  const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
  if (heading) {
    const level = heading[1].length;
    const content = renderInline(heading[2], `${key}-h`);
    if (level === 1) return <h3 key={key}>{content}</h3>;
    return <h4 key={key}>{content}</h4>;
  }

  const lines = trimmed.split('\n');
  if (lines.every(line => /^-\s+/.test(line.trim()))) {
    return (
      <ul key={key}>
        {lines.map((line, index) => <li key={index}>{renderInline(line.replace(/^-\s+/, ''), `${key}-${index}`)}</li>)}
      </ul>
    );
  }

  return <p key={key}>{lines.map((line, index) => <span key={index}>{renderInline(line, `${key}-${index}`)}{index < lines.length - 1 && <br />}</span>)}</p>;
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${match.index}`;
    if (token.startsWith('**')) {
      parts.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('*')) {
      parts.push(<em key={key}>{token.slice(1, -1)}</em>);
    } else {
      const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      const href = link?.[2] || '';
      const safeHref = /^(https?:|mailto:)/i.test(href) ? href : undefined;
      parts.push(safeHref ? <a key={key} href={safeHref} target="_blank" rel="noreferrer">{link?.[1]}</a> : <span key={key}>{link?.[1]}</span>);
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}
