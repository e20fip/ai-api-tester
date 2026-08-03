import { useState, useCallback } from 'react'
import { Code, WrapText } from 'lucide-react'

export default function JsonEditor({ value = '', onChange, placeholder = '{}', label = '', minHeight = '120px', readOnly = false }) {
  const [error, setError] = useState(null)

  const handleChange = useCallback((e) => {
    const raw = e.target.value
    onChange?.(raw)

    if (!raw.trim()) {
      setError(null)
      return
    }

    try {
      JSON.parse(raw)
      setError(null)
    } catch (err) {
      setError(err.message)
    }
  }, [onChange])

  const handleFormat = () => {
    if (!value?.trim()) return
    try {
      const pretty = JSON.stringify(JSON.parse(value), null, 2)
      onChange?.(pretty)
      setError(null)
    } catch {}
  }

  return (
    <div className="json-editor">
      {label && (
        <div className="json-editor-header">
          <label className="label">{label}</label>
          {!readOnly && (
            <button
              className="btn btn-ghost btn-sm btn-icon"
              onClick={handleFormat}
              data-tooltip="Format JSON"
              type="button"
              id={`format-json-${label?.replace(/\s/g, '-')}`}
            >
              <WrapText size={13} />
            </button>
          )}
        </div>
      )}
      <div className="json-editor-body">
        <Code size={12} className="json-editor-icon" />
        <textarea
          className={`textarea input-mono json-editor-textarea${error ? ' input-error' : ''}`}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          style={{ minHeight, paddingLeft: '28px' }}
          readOnly={readOnly}
          spellCheck={false}
          id={`json-editor-${label?.replace(/\s/g, '-') ?? 'default'}`}
        />
      </div>
      {error && (
        <div className="json-editor-error">
          <span>⚠ {error}</span>
        </div>
      )}
      <style>{`
        .json-editor { display: flex; flex-direction: column; gap: var(--space-2); }
        .json-editor-header { display: flex; align-items: center; justify-content: space-between; }
        .json-editor-body { position: relative; }
        .json-editor-icon {
          position: absolute;
          top: 10px;
          left: 10px;
          color: var(--color-text-muted);
          pointer-events: none;
          z-index: 1;
        }
        .json-editor-textarea { padding-left: 28px !important; }
        .json-editor-error {
          font-size: var(--text-xs);
          color: var(--color-accent-danger);
          padding: var(--space-1) var(--space-2);
          background: rgba(255, 77, 109, 0.08);
          border-radius: var(--radius-sm);
          border: 1px solid rgba(255, 77, 109, 0.2);
        }
      `}</style>
    </div>
  )
}
