import { useState } from 'react'
import { Settings, Server, MessageSquare, SlidersHorizontal, Wrench, Hash, Plus, Trash2, X } from 'lucide-react'
import { useApp } from '../../context/AppContext.jsx'
import JsonEditor from '../Common/JsonEditor.jsx'
import { REQUEST_FORMATS } from '../../utils/presets.js'
import { buildEndpointUrl } from '../../utils/requestBuilder.js'

const TABS = [
  { id: 'endpoint', label: 'Endpoint', Icon: Server },
  { id: 'system',   label: 'System',   Icon: MessageSquare },
  { id: 'params',   label: 'Params',   Icon: SlidersHorizontal },
  { id: 'tools',    label: 'Tools',    Icon: Wrench },
  { id: 'headers',  label: 'Headers',  Icon: Hash },
]

function SliderRow({ label, id, min, max, step, value, onChange, format = (v) => v }) {
  return (
    <div className="slider-row">
      <div className="slider-labels">
        <span className="label">{label}</span>
        <span className="slider-value">{format(value)}</span>
      </div>
      <input
        type="range"
        id={id}
        className="slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
      />
    </div>
  )
}

export default function AgentConfigPanel({ compact = false }) {
  const { state, currentPreset, dispatch } = useApp()
  const { configOpen } = state
  const [activeTab, setActiveTab] = useState('endpoint')
  const [customHeaders, setCustomHeaders] = useState(
    () => Object.entries(currentPreset?.customHeaders ?? {}).map(([k, v]) => ({ k, v, id: Math.random() }))
  )

  if (!currentPreset) return null

  const update = (field, value) => {
    dispatch({ type: 'UPDATE_PRESET', payload: { id: currentPreset.id, [field]: value } })
  }

  const updateHeaders = (headers) => {
    setCustomHeaders(headers)
    const obj = {}
    headers.forEach(({ k, v }) => { if (k?.trim()) obj[k.trim()] = v })
    update('customHeaders', obj)
  }

  const addHeader = () => updateHeaders([...customHeaders, { k: '', v: '', id: Math.random() }])
  const removeHeader = (id) => updateHeaders(customHeaders.filter(h => h.id !== id))
  const editHeader = (id, field, value) => updateHeaders(
    customHeaders.map(h => h.id === id ? { ...h, [field]: value } : h)
  )

  return (
    <>
      <aside className={`config-panel glass-card${configOpen ? ' open' : ''}`}>
        <div className="config-panel-header">
          <Settings size={15} />
          <span className="config-panel-title">Config</span>
          <div style={{ flex: 1 }} />
          <button
            className="btn btn-ghost btn-icon config-mobile-close"
            onClick={() => dispatch({ type: 'SET_CONFIG_OPEN', payload: false })}
            aria-label="Close configuration"
          >
            <X size={15} />
          </button>
        </div>

        {/* Tabs */}
        <div className="config-tabs">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`config-tab${activeTab === id ? ' active' : ''}`}
              onClick={() => setActiveTab(id)}
              data-tooltip={label}
              data-tooltip-pos="bottom"
              id={`config-tab-${id}`}
            >
              <Icon size={14} />
              <span className="config-tab-label">{label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="config-content">

          {/* Endpoint Tab */}
          {activeTab === 'endpoint' && (
            <div className="config-section animate-fade-slide">
              <div className="form-group">
                <label className="label" htmlFor="cfg-endpoint">API Endpoint URL</label>
                <input
                  id="cfg-endpoint"
                  className="input input-mono"
                  value={currentPreset.endpoint}
                  onChange={e => update('endpoint', e.target.value)}
                  placeholder="https://api.example.com/v1/chat"
                />
              </div>

              <div className="form-group">
                <label className="label" htmlFor="cfg-format">Request Format</label>
                <select
                  id="cfg-format"
                  className="input select"
                  value={currentPreset.requestFormat}
                  onChange={e => update('requestFormat', e.target.value)}
                >
                  {Object.entries(REQUEST_FORMATS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="label" htmlFor="cfg-model">Model</label>
                <input
                  id="cfg-model"
                  className="input input-mono"
                  value={currentPreset.model}
                  onChange={e => update('model', e.target.value)}
                  placeholder="gpt-4o"
                />
              </div>

              <div className="form-group">
                <label className="label" htmlFor="cfg-apikey">API Key</label>
                <input
                  id="cfg-apikey"
                  className="input input-mono"
                  type="password"
                  value={currentPreset.apiKey}
                  onChange={e => update('apiKey', e.target.value)}
                  placeholder="sk-..."
                  autoComplete="off"
                />
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label className="label" htmlFor="cfg-key-header">Key Header</label>
                  <input
                    id="cfg-key-header"
                    className="input input-mono"
                    value={currentPreset.apiKeyHeader}
                    onChange={e => update('apiKeyHeader', e.target.value)}
                    placeholder="Authorization"
                  />
                </div>
                <div className="form-group" style={{ width: '80px' }}>
                  <label className="label" htmlFor="cfg-key-prefix">Prefix</label>
                  <input
                    id="cfg-key-prefix"
                    className="input input-mono"
                    value={currentPreset.apiKeyPrefix}
                    onChange={e => update('apiKeyPrefix', e.target.value)}
                    placeholder="Bearer"
                  />
                </div>
              </div>

              <div className="form-group">
                <div className="flex items-center justify-between">
                  <label className="label" htmlFor="cfg-stream-toggle">Stream Response</label>
                  <label className="toggle" htmlFor="cfg-stream-toggle">
                    <input
                      id="cfg-stream-toggle"
                      type="checkbox"
                      checked={currentPreset.stream}
                      onChange={e => update('stream', e.target.checked)}
                    />
                    <div className="toggle-track">
                      <div className="toggle-thumb" />
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* System Tab */}
          {activeTab === 'system' && (
            <div className="config-section animate-fade-slide">
              <div className="form-group">
                <label className="label" htmlFor="cfg-system-prompt">System Prompt</label>
                <textarea
                  id="cfg-system-prompt"
                  className="textarea"
                  style={{ minHeight: '220px' }}
                  value={currentPreset.systemPrompt}
                  onChange={e => update('systemPrompt', e.target.value)}
                  placeholder="You are a helpful AI assistant..."
                />
              </div>
            </div>
          )}

          {/* Params Tab */}
          {activeTab === 'params' && (
            <div className="config-section animate-fade-slide">
              <SliderRow
                label="Temperature"
                id="cfg-temperature"
                min={0} max={2} step={0.01}
                value={currentPreset.temperature}
                onChange={v => update('temperature', v)}
                format={v => v.toFixed(2)}
              />
              <SliderRow
                label="Top P"
                id="cfg-topp"
                min={0} max={1} step={0.01}
                value={currentPreset.topP}
                onChange={v => update('topP', v)}
                format={v => v.toFixed(2)}
              />
              <div className="form-group">
                <label className="label" htmlFor="cfg-maxtokens">Max Tokens</label>
                <input
                  id="cfg-maxtokens"
                  type="number"
                  className="input"
                  min={1} max={128000}
                  value={currentPreset.maxTokens}
                  onChange={e => update('maxTokens', parseInt(e.target.value) || 2048)}
                />
              </div>
            </div>
          )}

          {/* Tools Tab */}
          {activeTab === 'tools' && (
            <div className="config-section animate-fade-slide">
              <JsonEditor
                label="Tool Definitions (JSON Array)"
                value={typeof currentPreset.tools === 'string'
                  ? currentPreset.tools
                  : JSON.stringify(currentPreset.tools, null, 2)}
                onChange={v => update('tools', v)}
                placeholder={`[\n  {\n    "type": "function",\n    "function": {\n      "name": "my_tool",\n      "description": "...",\n      "parameters": {}\n    }\n  }\n]`}
                minHeight="260px"
              />
            </div>
          )}

          {/* Headers Tab */}
          {activeTab === 'headers' && (
            <div className="config-section animate-fade-slide">
              <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-3)' }}>
                <span className="label">Custom Headers</span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={addHeader}
                  id="add-header-btn"
                >
                  <Plus size={12} /> Add
                </button>
              </div>
              <div className="headers-list">
                {customHeaders.length === 0 && (
                  <div className="empty-hint">No custom headers. Click Add to add one.</div>
                )}
                {customHeaders.map(h => (
                  <div key={h.id} className="header-row">
                    <input
                      className="input input-mono"
                      value={h.k}
                      onChange={e => editHeader(h.id, 'k', e.target.value)}
                      placeholder="Header-Name"
                      id={`header-key-${h.id}`}
                    />
                    <input
                      className="input input-mono"
                      value={h.v}
                      onChange={e => editHeader(h.id, 'v', e.target.value)}
                      placeholder="value"
                      id={`header-val-${h.id}`}
                    />
                    <button
                      className="btn btn-ghost btn-icon btn-danger"
                      onClick={() => removeHeader(h.id)}
                      id={`remove-header-${h.id}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </aside>

      <style>{`
        .config-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: var(--config-width);
          flex-shrink: 0;
          border-radius: 0;
          border-top: none;
          border-bottom: none;
          border-left: none;
        }

        .config-mobile-close {
          display: none;
        }
        @media (max-width: 768px) {
          .config-mobile-close {
            display: inline-flex;
          }
        }

        .config-panel-header {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          height: 48px;
          padding: 0 var(--space-4);
          border-bottom: var(--glass-border);
          flex-shrink: 0;
        }

        .config-panel-title {
          font-size: var(--text-sm);
          font-weight: 700;
          color: var(--color-text-primary);
        }

        .config-tabs {
          display: flex;
          gap: 2px;
          padding: var(--space-2) var(--space-2);
          border-bottom: var(--glass-border);
          flex-shrink: 0;
        }

        .config-tab {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          padding: var(--space-2) var(--space-1);
          font-size: 10px;
          font-weight: 600;
          border-radius: var(--radius-sm);
          cursor: pointer;
          color: var(--color-text-muted);
          background: transparent;
          border: 1px solid transparent;
          transition: all var(--transition-fast);
        }

        .config-tab:hover { color: var(--color-text-primary); background: var(--color-bg-glass); }
        .config-tab.active {
          color: var(--color-accent-primary);
          background: var(--color-accent-primary-dim);
          border-color: rgba(108, 99, 255, 0.3);
        }

        .config-tab-label { font-size: 9px; }

        .config-content {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: var(--space-4);
        }

        .config-section { display: flex; flex-direction: column; gap: var(--space-4); }

        .form-row { display: flex; gap: var(--space-3); }

        .slider-row { display: flex; flex-direction: column; gap: var(--space-2); }
        .slider-labels { display: flex; justify-content: space-between; align-items: center; }
        .slider-value {
          font-family: var(--font-mono);
          font-size: var(--text-xs);
          color: var(--color-accent-primary);
          background: var(--color-accent-primary-dim);
          padding: 1px 6px;
          border-radius: var(--radius-sm);
        }

        .headers-list { display: flex; flex-direction: column; gap: var(--space-2); }
        .header-row { display: flex; gap: var(--space-2); align-items: center; }
        .empty-hint { font-size: var(--text-xs); color: var(--color-text-muted); text-align: center; padding: var(--space-4); }
      `}</style>
    </>
  )
}
