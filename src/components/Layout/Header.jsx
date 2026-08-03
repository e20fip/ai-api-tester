import { MessageSquare, Beaker, FileCode2, Activity, Info } from 'lucide-react'
import { useApp } from '../../context/AppContext.jsx'

const VIEWS = [
  { id: 'chat',       label: 'Chat',       Icon: MessageSquare },
  { id: 'playground', label: 'Playground', Icon: Beaker },
  { id: 'raw',        label: 'Raw Request', Icon: FileCode2 },
]

const PROVIDER_COLORS = {
  mock:      '#6c63ff',
  openai:    '#00d2ff',
  anthropic: '#ff7b2f',
  gemini:    '#00ff9d',
  ollama:    '#ffb700',
  custom:    '#ff4d6d',
}

export default function Header() {
  const { state, dispatch, currentPreset } = useApp()
  const { activeView, isStreaming, lastMetrics } = state

  const providerColor = PROVIDER_COLORS[currentPreset?.provider] ?? '#6c63ff'
  const tokenTotal = lastMetrics?.usage?.total_tokens

  return (
    <>
      <header className="header">
        {/* View Tabs */}
        <nav className="header-tabs" role="tablist" aria-label="View mode">
          {VIEWS.map(({ id, label, Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={activeView === id}
              className={`header-tab${activeView === id ? ' active' : ''}`}
              onClick={() => dispatch({ type: 'SET_VIEW', payload: id })}
              id={`tab-${id}`}
            >
              <Icon size={14} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {/* Status & Info */}
        <div className="header-right">
          {/* Streaming indicator */}
          {isStreaming && (
            <div className="streaming-badge">
              <div className="streaming-dot" />
              <span>Streaming...</span>
            </div>
          )}

          {/* Token counter */}
          {tokenTotal != null && !isStreaming && (
            <div className="token-badge" data-tooltip="Last response token usage" data-tooltip-pos="bottom">
              <Activity size={12} />
              <span>{tokenTotal.toLocaleString()} tokens</span>
            </div>
          )}

          {/* Current preset indicator */}
          <div className="preset-badge" style={{ '--pc': providerColor }}>
            <span className="preset-dot" />
            <span>{currentPreset?.name ?? '—'}</span>
            <span className="preset-model">{currentPreset?.model}</span>
          </div>
        </div>
      </header>

      <style>{`
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: var(--header-height);
          padding: 0 var(--space-4);
          border-bottom: var(--glass-border);
          background: rgba(10, 13, 28, 0.7);
          backdrop-filter: var(--glass-blur);
          flex-shrink: 0;
          gap: var(--space-4);
        }

        .header-tabs {
          display: flex;
          gap: 2px;
          background: var(--color-bg-glass);
          border-radius: var(--radius-md);
          padding: 3px;
          border: var(--glass-border);
        }

        .header-tab {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: 5px var(--space-3);
          font-size: var(--text-xs);
          font-weight: 600;
          border-radius: calc(var(--radius-md) - 2px);
          cursor: pointer;
          color: var(--color-text-secondary);
          background: transparent;
          border: none;
          transition: all var(--transition-fast);
          white-space: nowrap;
        }

        .header-tab:hover { color: var(--color-text-primary); background: var(--color-bg-glass); }
        .header-tab.active {
          background: var(--color-accent-primary);
          color: white;
          box-shadow: var(--glow-primary);
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }

        .streaming-badge {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: 4px var(--space-3);
          background: rgba(108, 99, 255, 0.12);
          border: 1px solid rgba(108, 99, 255, 0.3);
          border-radius: var(--radius-full);
          font-size: var(--text-xs);
          font-weight: 600;
          color: var(--color-accent-primary);
          animation: pulse-glow 2s infinite;
        }

        .streaming-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--color-accent-primary);
          animation: typing-dots 1.2s infinite;
        }

        .token-badge {
          display: flex;
          align-items: center;
          gap: var(--space-1);
          padding: 4px var(--space-3);
          background: var(--color-bg-glass);
          border: var(--glass-border);
          border-radius: var(--radius-full);
          font-size: var(--text-xs);
          color: var(--color-text-secondary);
          cursor: default;
        }

        .preset-badge {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: 4px var(--space-3);
          background: rgba(var(--pc, 108, 99, 255), 0.08);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: var(--radius-full);
          max-width: 220px;
        }

        .preset-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--pc, var(--color-accent-primary));
          flex-shrink: 0;
        }

        .preset-badge span:not(.preset-dot):not(.preset-model) {
          font-size: var(--text-xs);
          font-weight: 600;
          color: var(--color-text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .preset-model {
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--color-text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `}</style>
    </>
  )
}
