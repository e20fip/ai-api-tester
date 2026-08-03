import { useState } from 'react'
import { X, FileJson, ArrowUpDown, BarChart2, Terminal, Clock, Zap, DollarSign } from 'lucide-react'
import { useApp } from '../../context/AppContext.jsx'
import CodeBlock from '../Common/CodeBlock.jsx'
import { buildCurlCommand, estimateCost, formatLatency } from '../../utils/curlBuilder.js'
import { buildPayload, buildHeaders, buildEndpointUrl } from '../../utils/requestBuilder.js'

const TABS = [
  { id: 'request',  label: 'Request',  Icon: FileJson },
  { id: 'response', label: 'Response', Icon: ArrowUpDown },
  { id: 'metrics',  label: 'Metrics',  Icon: BarChart2 },
  { id: 'curl',     label: 'cURL',     Icon: Terminal },
]

function MetricCard({ label, value, sub, Icon, color = 'var(--color-accent-primary)' }) {
  return (
    <div className="metric-card" style={{ '--mc': color }}>
      <div className="metric-icon"><Icon size={16} /></div>
      <div className="metric-info">
        <div className="metric-value">{value ?? '—'}</div>
        <div className="metric-label">{label}</div>
        {sub && <div className="metric-sub">{sub}</div>}
      </div>
    </div>
  )
}

export default function PayloadInspector() {
  const { state, dispatch, currentPreset } = useApp()
  const { inspectorOpen, inspectorData, lastMetrics, messages } = state
  const [activeTab, setActiveTab] = useState('request')

  if (!inspectorOpen) return null

  const close = () => dispatch({ type: 'SET_INSPECTOR', payload: { open: false } })

  const data = inspectorData ?? lastMetrics ?? {}
  const requestPayload = data.requestPayload ?? buildPayload(currentPreset, messages.map(m => ({ role: m.role, content: m.content })))
  const requestHeaders = data.requestHeaders ?? buildHeaders(currentPreset)
  const requestUrl = data.requestUrl ?? buildEndpointUrl(currentPreset)

  const curlCmd = buildCurlCommand(
    currentPreset,
    messages.map(m => ({ role: m.role, content: m.content }))
  )

  const usage = data.usage ?? lastMetrics?.usage
  const cost = usage ? estimateCost(currentPreset.provider, currentPreset.model, usage.prompt_tokens, usage.completion_tokens) : null

  const statusOk = data.status >= 200 && data.status < 300
  const statusColor = !data.status
    ? 'var(--color-text-muted)'
    : statusOk
      ? 'var(--color-accent-success)'
      : 'var(--color-accent-danger)'

  return (
    <>
      <div className="inspector-overlay animate-fade" onClick={close} />
      <div className="inspector-panel glass-card animate-scale" role="dialog" aria-modal="true" aria-label="Payload Inspector">
        {/* Header */}
        <div className="inspector-header">
          <span className="inspector-title">Payload Inspector</span>
          {data.status && (
            <span className="inspector-status" style={{ color: statusColor }}>
              {data.status} {data.statusText}
            </span>
          )}
          <div style={{ flex: 1 }} />
          <button
            className="btn btn-ghost btn-icon"
            onClick={close}
            id="close-inspector-btn"
            aria-label="Close inspector"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="inspector-tabs">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`tab${activeTab === id ? ' active' : ''}`}
              onClick={() => setActiveTab(id)}
              id={`inspector-tab-${id}`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="inspector-content">

          {/* Request Tab */}
          {activeTab === 'request' && (
            <div className="inspector-section animate-fade-slide">
              <div className="inspector-url-bar">
                <span className="inspector-method">{currentPreset.method ?? 'POST'}</span>
                <span className="inspector-url">{requestUrl}</span>
              </div>
              <div className="form-group">
                <span className="label">Request Headers</span>
                <CodeBlock
                  code={JSON.stringify(requestHeaders, null, 2)}
                  language="json"
                  label="headers"
                  maxHeight="120px"
                />
              </div>
              <div className="form-group">
                <span className="label">Request Body (JSON)</span>
                <CodeBlock
                  code={JSON.stringify(requestPayload, null, 2)}
                  language="json"
                  label="payload"
                  maxHeight="240px"
                />
              </div>
            </div>
          )}

          {/* Response Tab */}
          {activeTab === 'response' && (
            <div className="inspector-section animate-fade-slide">
              {data.headers ? (
                <div className="form-group">
                  <span className="label">Response Headers</span>
                  <CodeBlock
                    code={JSON.stringify(data.headers, null, 2)}
                    language="json"
                    label="headers"
                    maxHeight="140px"
                  />
                </div>
              ) : (
                <div className="inspector-empty">Send a request to see the response</div>
              )}
              {data.responseBody && (
                <div className="form-group">
                  <span className="label">Response Body</span>
                  <CodeBlock
                    code={JSON.stringify(data.responseBody, null, 2)}
                    language="json"
                    label="body"
                    maxHeight="240px"
                  />
                </div>
              )}
            </div>
          )}

          {/* Metrics Tab */}
          {activeTab === 'metrics' && (
            <div className="inspector-section animate-fade-slide">
              <div className="metrics-grid">
                <MetricCard
                  label="Latency"
                  value={data.latency ? formatLatency(data.latency) : '—'}
                  Icon={Clock}
                  color="var(--color-accent-secondary)"
                />
                <MetricCard
                  label="Prompt Tokens"
                  value={usage?.prompt_tokens?.toLocaleString() ?? '—'}
                  Icon={Zap}
                  color="var(--color-accent-warning)"
                />
                <MetricCard
                  label="Completion Tokens"
                  value={usage?.completion_tokens?.toLocaleString() ?? '—'}
                  Icon={Zap}
                  color="var(--color-accent-success)"
                />
                <MetricCard
                  label="Total Tokens"
                  value={usage?.total_tokens?.toLocaleString() ?? '—'}
                  Icon={BarChart2}
                  color="var(--color-accent-primary)"
                />
                {cost && (
                  <MetricCard
                    label="Est. Cost"
                    value={`$${cost.totalCost}`}
                    sub={`in: $${cost.inputCost} / out: $${cost.outputCost}`}
                    Icon={DollarSign}
                    color="var(--color-accent-orange)"
                  />
                )}
              </div>
            </div>
          )}

          {/* cURL Tab */}
          {activeTab === 'curl' && (
            <div className="inspector-section animate-fade-slide">
              <CodeBlock
                code={curlCmd}
                language="bash"
                label="cURL command"
                maxHeight="360px"
              />
            </div>
          )}

        </div>
      </div>

      <style>{`
        .inspector-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: 100;
          backdrop-filter: blur(4px);
        }

        .inspector-panel {
          position: fixed;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: min(96vw, 800px);
          max-height: 80vh;
          z-index: 101;
          display: flex;
          flex-direction: column;
          border-radius: var(--radius-xl) var(--radius-xl) 0 0;
          overflow: hidden;
          border-bottom: none;
        }

        .inspector-header {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-4) var(--space-5);
          border-bottom: var(--glass-border);
          flex-shrink: 0;
        }

        .inspector-title {
          font-size: var(--text-md);
          font-weight: 700;
        }

        .inspector-status {
          font-family: var(--font-mono);
          font-size: var(--text-sm);
          font-weight: 700;
        }

        .inspector-tabs {
          display: flex;
          gap: var(--space-1);
          padding: var(--space-2) var(--space-4);
          border-bottom: var(--glass-border);
          flex-shrink: 0;
          background: var(--color-bg-glass);
        }

        .inspector-content {
          flex: 1;
          overflow-y: auto;
          padding: var(--space-5);
        }

        .inspector-section { display: flex; flex-direction: column; gap: var(--space-4); }

        .inspector-url-bar {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          background: rgba(0,0,0,0.3);
          border: var(--glass-border);
          border-radius: var(--radius-md);
          padding: var(--space-2) var(--space-4);
          overflow: hidden;
        }

        .inspector-method {
          font-family: var(--font-mono);
          font-size: var(--text-xs);
          font-weight: 700;
          color: var(--color-accent-success);
          background: rgba(0, 255, 157, 0.1);
          padding: 2px 8px;
          border-radius: var(--radius-sm);
          white-space: nowrap;
        }

        .inspector-url {
          font-family: var(--font-mono);
          font-size: var(--text-xs);
          color: var(--color-text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .inspector-empty {
          text-align: center;
          color: var(--color-text-muted);
          font-size: var(--text-sm);
          padding: var(--space-8);
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: var(--space-3);
        }

        .metric-card {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-4);
          background: var(--color-bg-glass);
          border: var(--glass-border);
          border-radius: var(--radius-lg);
          transition: border-color var(--transition-fast);
        }

        .metric-card:hover { border-color: var(--mc); }

        .metric-icon {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-md);
          background: color-mix(in srgb, var(--mc) 15%, transparent);
          border: 1px solid color-mix(in srgb, var(--mc) 30%, transparent);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--mc);
          flex-shrink: 0;
        }

        .metric-info { display: flex; flex-direction: column; min-width: 0; }
        .metric-value { font-size: var(--text-lg); font-weight: 700; font-family: var(--font-mono); }
        .metric-label { font-size: var(--text-xs); color: var(--color-text-muted); }
        .metric-sub { font-size: 10px; color: var(--color-text-muted); font-family: var(--font-mono); }
      `}</style>
    </>
  )
}
