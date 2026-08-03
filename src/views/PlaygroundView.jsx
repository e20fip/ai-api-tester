import { useState, useCallback } from 'react'
import { Send, Square, RotateCcw, Zap } from 'lucide-react'
import AgentConfigPanel from '../components/Config/AgentConfigPanel.jsx'
import CodeBlock from '../components/Common/CodeBlock.jsx'
import PayloadInspector from '../components/Inspector/PayloadInspector.jsx'
import { useApp } from '../context/AppContext.jsx'
import { streamCompletion } from '../services/apiService.js'
import { estimateTokens } from '../utils/curlBuilder.js'

export default function PlaygroundView() {
  const { state, dispatch, currentPreset, stopStream, abortControllerRef } = useApp()
  const { isStreaming } = state

  const [prompt, setPrompt] = useState('')
  const [response, setResponse] = useState('')
  const [responseRaw, setResponseRaw] = useState(null)
  const [usage, setUsage] = useState(null)
  const [error, setError] = useState(null)

  const tokenEstimate = estimateTokens(prompt)

  const handleRun = useCallback(async () => {
    if (!prompt.trim() || isStreaming) return

    setResponse('')
    setResponseRaw(null)
    setUsage(null)
    setError(null)
    dispatch({ type: 'START_STREAMING' })

    const messages = [{ role: 'user', content: prompt.trim() }]

    const abortCtrl = new AbortController()
    abortControllerRef.current = abortCtrl

    let accum = ''

    try {
      const stream = streamCompletion(currentPreset, messages, (metrics) => {
        dispatch({ type: 'SET_METRICS', payload: metrics })
        dispatch({ type: 'SET_INSPECTOR', payload: { open: false, data: metrics } })
      })

      for await (const event of stream) {
        if (abortCtrl.signal.aborted) break
        if (event.type === 'chunk') {
          accum += event.content
          setResponse(accum)
        } else if (event.type === 'full') {
          accum = event.content
          setResponse(accum)
          setUsage(event.usage)
        } else if (event.type === 'done') {
          setUsage(event.usage)
          if (event.usage) dispatch({ type: 'SET_METRICS', payload: { usage: event.usage } })
        }
      }
    } catch (err) {
      if (!abortCtrl.signal.aborted) setError(err.message)
    }

    dispatch({ type: 'FINISH_STREAMING', payload: { usage: null, toolCalls: [] } })
  }, [prompt, isStreaming, currentPreset, dispatch, abortControllerRef])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleRun()
  }

  return (
    <>
      <div className="playground-view">
        <AgentConfigPanel />

        <div className="playground-main">
          {/* Input Panel */}
          <div className="pg-panel glass-card">
            <div className="pg-panel-header">
              <Zap size={15} />
              <span>Prompt</span>
              <div style={{ flex: 1 }} />
              <span className="pg-token-hint">~{tokenEstimate} tokens</span>
              <button
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => { setPrompt(''); setResponse(''); setUsage(null); setError(null) }}
                data-tooltip="Clear"
                id="pg-clear-btn"
              >
                <RotateCcw size={13} />
              </button>
            </div>
            <div className="pg-panel-body">
              <textarea
                id="pg-prompt-input"
                className="pg-textarea"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="พิมพ์ prompt ที่ต้องการทดสอบ... (Ctrl+Enter เพื่อส่ง)"
                disabled={isStreaming}
              />
            </div>
            <div className="pg-panel-footer">
              {isStreaming ? (
                <button className="btn btn-danger" onClick={stopStream} id="pg-stop-btn">
                  <Square size={14} fill="currentColor" /> Stop
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={handleRun}
                  disabled={!prompt.trim()}
                  id="pg-run-btn"
                >
                  <Send size={14} /> Run (Ctrl+Enter)
                </button>
              )}
            </div>
          </div>

          {/* Response Panel */}
          <div className="pg-panel glass-card">
            <div className="pg-panel-header">
              <span>Response</span>
              <div style={{ flex: 1 }} />
              {usage && (
                <span className="pg-token-hint">
                  ↑{usage.prompt_tokens} ↓{usage.completion_tokens} ∑{usage.total_tokens} tokens
                </span>
              )}
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => dispatch({ type: 'SET_INSPECTOR', payload: { open: true } })}
                id="pg-inspector-btn"
              >
                Inspect
              </button>
            </div>
            <div className="pg-panel-body pg-response-body">
              {error ? (
                <div className="pg-error">{error}</div>
              ) : !response && !isStreaming ? (
                <div className="pg-empty">Response will appear here...</div>
              ) : (
                <div className="pg-response-text">
                  {response}
                  {isStreaming && <span className="streaming-cursor" />}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <PayloadInspector />

      <style>{`
        .playground-view {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        .playground-main {
          flex: 1;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-4);
          padding: var(--space-4);
          overflow: hidden;
          min-width: 0;
        }

        .pg-panel {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border-radius: var(--radius-lg);
        }

        .pg-panel-header {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-3) var(--space-4);
          border-bottom: var(--glass-border);
          flex-shrink: 0;
          font-size: var(--text-sm);
          font-weight: 600;
        }

        .pg-token-hint {
          font-size: var(--text-xs);
          color: var(--color-text-muted);
          font-family: var(--font-mono);
        }

        .pg-panel-body {
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .pg-textarea {
          flex: 1;
          width: 100%;
          background: transparent;
          border: none;
          outline: none;
          color: var(--color-text-primary);
          font-family: var(--font-sans);
          font-size: var(--text-md);
          line-height: 1.75;
          resize: none;
          padding: var(--space-4);
        }

        .pg-textarea::placeholder { color: var(--color-text-muted); }

        .pg-panel-footer {
          padding: var(--space-3) var(--space-4);
          border-top: var(--glass-border);
          display: flex;
          justify-content: flex-end;
          flex-shrink: 0;
        }

        .pg-response-body {
          padding: var(--space-4);
          overflow-y: auto;
        }

        .pg-response-text {
          font-size: var(--text-md);
          line-height: 1.75;
          color: var(--color-text-primary);
          white-space: pre-wrap;
          word-break: break-word;
        }

        .streaming-cursor {
          display: inline-block;
          width: 2px;
          height: 1em;
          background: var(--color-accent-primary);
          margin-left: 2px;
          vertical-align: middle;
          animation: typing-dots 1s infinite;
          border-radius: 1px;
        }

        .pg-empty {
          color: var(--color-text-muted);
          font-size: var(--text-md);
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
        }

        .pg-error {
          color: var(--color-accent-danger);
          background: rgba(255,77,109,0.08);
          border: 1px solid rgba(255,77,109,0.25);
          border-radius: var(--radius-md);
          padding: var(--space-4);
          font-size: var(--text-sm);
        }
      `}</style>
    </>
  )
}
