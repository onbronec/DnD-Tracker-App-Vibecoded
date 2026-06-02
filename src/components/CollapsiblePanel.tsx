import { ReactNode, useState } from 'react';

interface Props {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  actions?: ReactNode;
}

export function CollapsiblePanel({ title, summary, defaultOpen = false, children, actions }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={`section collapsible-panel ${open ? 'open' : 'closed'}`}>
      <div className="section-title-row">
        <button
          className="collapse-heading"
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(value => !value)}
        >
          <span className="collapse-icon">{open ? '-' : '+'}</span>
          <span>
            <strong>{title}</strong>
            {summary && <small>{summary}</small>}
          </span>
        </button>
        {actions}
      </div>
      {open && <div className="collapsible-body">{children}</div>}
    </section>
  );
}

interface PanelGroupItem {
  id: string;
  title: string;
  summary?: string;
  content: ReactNode;
}

interface GroupProps {
  panels: PanelGroupItem[];
  defaultActiveId?: string | null;
}

export function CollapsiblePanelGroup({ panels, defaultActiveId = null }: GroupProps) {
  const [activeId, setActiveId] = useState<string | null>(defaultActiveId);
  const activePanel = panels.find(panel => panel.id === activeId) || null;

  if (panels.length === 0) return null;

  return (
    <section className={`section collapse-panel-group ${activePanel ? 'open' : 'closed'}`}>
      <div className="collapse-tab-row">
        {panels.map(panel => {
          const active = panel.id === activeId;
          return (
            <button
              key={panel.id}
              className={`collapse-tab ${active ? 'active' : ''}`}
              type="button"
              aria-expanded={active}
              onClick={() => setActiveId(current => current === panel.id ? null : panel.id)}
            >
              <span className="collapse-icon">{active ? '-' : '+'}</span>
              <span>
                <strong>{panel.title}</strong>
                {panel.summary && <small>{panel.summary}</small>}
              </span>
            </button>
          );
        })}
      </div>
      {activePanel && <div className="collapsible-body">{activePanel.content}</div>}
    </section>
  );
}
