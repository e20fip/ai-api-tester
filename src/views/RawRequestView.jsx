import { useState, useCallback } from 'react'
import { Send, Square, Copy, Check } from 'lucide-react'
import CodeBlock from '../components/Common/CodeBlock.jsx'
import JsonEditor from '../components/Common/JsonEditor.jsx'
import { useApp } from '../context/AppContext.jsx'
import { fetchCompletion } from '../services/apiService.js'
import { buildPayload, buildHeaders, buildEndpointUrl } from '../utils/requestBuilder.js'
import { formatLatency } from '../utils/curlBuilder.js'

export default function RawRequestView() {
  const { currentPreset, dispatch } = useApp()
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [copiedCurl, setCopiedCurl] = useState(false)

  const defaultPayload = JSON.stringify(
    buildPayload(currentPreset, [{ role: 'user', content: 'Hello!' }]),
    null, 2
  )

  const [rawPayload, setRawPayload] = useState(defaultPayload)

  const handleSend = useCallback(async () => {
    let payload
    try {
      payload = JSON.parse(rawPayload)
    } catch {
      setError('Invalid JSON payload')
      return
    }

    setIsLoading(true)
    setResult(null)
    setError(null)

    try {
      const url = buildEndpointUrl(currentPreset)
      const headers = buildHeaders(currentPreset)
      const startTime = Date.now()

      const response = await fetch(url, {
        method: currentPreset.method || 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(60000),
      })

      const latency = Date.now() - startTime
      const responseHeaders = {}
      response.headers.forEach((v, k) => { responseHeaders[k] = v })

      const rawBody = await response.text()
      let body
      try { body = JSON.parse(rawBody) } catch { body = rawBody }

      const res = { status: response.status, statusText: response.statusText, headers: responseHeaders, body, latency }
      setResult(res)
      dispatch({ type: 'SET_METRICS', payload: res })
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [rawPayload, currentPreset, dispatch])

  const statusOk = result?.status >= 200 && result?.status < 300

  return (
    <>
      <div className="raw-view">
        {/* Left: Request Editor */}
        <div className="raw-panel glass-card">
          <div className="raw-panel-header">
            <div className="raw-method-url">
              <span className="raw-method">{currentPreset?.method ?? 'POST'}</span>
              <span className="raw-url truncate">{buildEndpointUrl(currentPreset)}</span>
            </div>
          </div>
          <div className="raw-panel-body">
            <div className="raw-section">
              <span className="label">Request Headers (auto-generated)</span>
              <CodeBlock
                code={JSON.stringify(buildHeaders(currentPreset), null, 2)}
                language="json"
                maxHeight="150px"
              />
            </div>
            <div className="raw-section">
              <JsonEditor
                label="Request Body (editable)"
                value={rawPayload}
                onChange={setRawPayload}
                minHeight="240px"
              />
            </div>
          </div>
          <div className="raw-panel-footer">
            <button
              className="btn btn-primary"
              onClick={handleSend}
              disabled={isLoading}
              id="raw-send-btn"
            >
              {isLoading
                ? <><span className="spinner" />Sending...</>
                : <><Send size={14} />Send Request</>
              }
            </button>
          </div>
        </div>

        {/* Right: Response */}
        <div className="raw-panel glass-card">
          <div className="raw-panel-header">
            {result ? (
              <div className="raw-response-meta">
                <span
                  className="raw-status"
                  style={{ color: statusOk ? 'var(--color-accent-success)' : 'var(--color-accent-danger)' }}
                >
                  {result.status} {result.statusText}
                </span>
                <span className="raw-latency">{formatLatency(result.latency)}</span>
              </div>
            ) : (
              <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>Response</span>
            )}
          </div>

          {error && (
            <div className="raw-error">{error}</div>
          )}

          {result && (
            <div className="raw-panel-body">
              <div className="raw-section">
                <span className="label">Response Headers</span>
                <CodeBlock
                  code={JSON.stringify(result.headers, null, 2)}
                  language="json"
                  maxHeight="140px"
                />
              </div>
              <div className="raw-section">
                <span className="label">Response Body</span>
                <CodeBlock
                  code={typeof result.body === 'string' ? result.body : JSON.stringify(result.body, null, 2)}
                  language="json"
                  maxHeight="320px"
                />
              </div>
            </div>
          )}

          {!result && !error && (
            <div className="raw-empty">
              <p>Response will appear here after sending a request</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .raw-view {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-4);
          padding: var(--space-4);
          flex: 1;
          overflow: hidden;
          min-width: 0;
        }

        .raw-panel {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border-radius: var(--radius-lg);
        }

        .raw-panel-header {
          padding: var(--space-3) var(--space-4);
          border-bottom: var(--glass-border);
          flex-shrink: 0;
        }

        .raw-method-url {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          overflow: hidden;
        }

        .raw-method {
          font-family: var(--font-mono);
          font-size: var(--text-xs);
          font-weight: 700;
          color: var(--color-accent-success);
          background: rgba(0,255,157,0.1);
          padding: 3px 10px;
          border-radius: var(--radius-sm);
          white-space: nowrap;
        }

        .raw-url {
          font-family: var(--font-mono);
          font-size: var(--text-xs);
          color: var(--color-text-secondary);
        }

        .raw-response-meta {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }

        .raw-status {
          font-family: var(--font-mono);
          font-size: var(--text-sm);
          font-weight: 700;
        }

        .raw-latency {
          font-family: var(--font-mono);
          font-size: var(--text-xs);
          color: var(--color-text-muted);
        }

        .raw-panel-body {
          flex: 1;
          overflow-y: auto;
          padding: var(--space-4);
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }

        .raw-section { display: flex; flex-direction: column; gap: var(--space-2); }

        .raw-panel-footer {
          padding: var(--space-3) var(--space-4);
          border-top: var(--glass-border);
          display: flex;
          justify-content: flex-end;
          flex-shrink: 0;
        }

        .raw-empty {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-text-muted);
          font-size: var(--text-sm);
          text-align: center;
          padding: var(--space-8);
        }

        .raw-error {
          margin: var(--space-3) var(--space-4);
          padding: var(--space-3) var(--space-4);
          background: rgba(255,77,109,0.08);
          border: 1px solid rgba(255,77,109,0.25);
          border-radius: var(--radius-md);
          color: var(--color-accent-danger);
          font-size: var(--text-sm);
        }

        .spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
      `}</style>
    </>
  )
}
