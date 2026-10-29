import type { ActionLogEntry, PageScope } from '../shared/types';

interface Props {
  currentPage: PageScope;
  entries: ActionLogEntry[];
  onUndo: () => void;
  onRedo: () => void;
  onClear?: () => void;
  onCollapse: () => void;
}

export function HistoryPanel({ currentPage, entries, onUndo, onRedo, onClear, onCollapse }: Props) {
  const currentEntries = entries.filter(entry => entry.page === currentPage);
  const latest = [...entries].reverse().slice(0, 80);

  return (
    <aside id="history-panel" className="history-panel" aria-label="History">
      <div className="section-title-row">
        <h2>History</h2>
        <button className="btn small" onClick={onCollapse}>Collapse history</button>
      </div>
      <div className="history-actions">
        <button className="btn warning" onClick={onUndo}>Undo page</button>
        <button className="btn success" onClick={onRedo}>Redo page</button>
        {onClear && <button className="btn danger" onClick={() => {
          if (window.confirm('Clear all history and undo/redo? Campaign data will stay as it is.')) onClear();
        }}>Clear history</button>}
      </div>

      <div className="history-section">
        <h3>This page</h3>
        {currentEntries.length === 0 && <p className="empty">No actions on this page yet.</p>}
        {currentEntries.slice(-20).reverse().map(entry => <HistoryRow key={entry.id} entry={entry} />)}
      </div>

      <div className="history-section">
        <h3>Global log</h3>
        {latest.length === 0 && <p className="empty">No actions yet.</p>}
        {latest.map(entry => <HistoryRow key={entry.id} entry={entry} />)}
      </div>
    </aside>
  );
}

function HistoryRow({ entry }: { entry: ActionLogEntry }) {
  return (
    <div className={`history-row ${entry.undone ? 'undone' : ''}`}>
      <div className="history-line">
        <strong>#{entry.sequence}</strong>
        <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
        <span>{entry.actorName}</span>
      </div>
      <div className="history-label">{entry.label}</div>
      <div className="history-meta">
        {entry.page}
        {!entry.reversible && ' / info'}
        {entry.undone && ' / undone'}
      </div>
    </div>
  );
}
