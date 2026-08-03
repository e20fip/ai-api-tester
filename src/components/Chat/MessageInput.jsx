import { useState, useRef, useCallback } from 'react'
import { Send, Square, Trash2, Search, PaperclipIcon } from 'lucide-react'
import { useApp } from '../../context/AppContext.jsx'
import { streamCompletion } from '../../services/apiService.js'
import { estimateTokens } from '../../utils/curlBuilder.js'

export default function MessageInput() {
  const { state, dispatch, currentPreset, stopStream, abortControllerRef } = useApp()
  const { isStreaming, messages } = state
  const [input, setInput] = useState('')
  const textareaRef = useRef(null)

  const charCount = input.length
  const tokenEstimate = estimateTokens(input)

  const handleSend = useCallback(async () => {
    const content = input.trim()
    if (!content || isStreaming) return

    setInput('')
    textareaRef.current?.focus()

    // Add user message
    const userMsg = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp: Date.now(),
    }
    dispatch({ type: 'ADD_MESSAGE', payload: userMsg })
    dispatch({ type: 'START_STREAMING' })

    const allMessages = [...messages, userMsg]

    // Abort controller for cancellation
    const abortCtrl = new AbortController()
    abortControllerRef.current = abortCtrl

    const toolCalls = []
    let finalUsage = null

    try {
      const stream = streamCompletion(
        currentPreset,
        allMessages.map(m => ({ role: m.role, content: m.content })),
        (metrics) => {
          dispatch({ type: 'SET_METRICS', payload: metrics })
          dispatch({
            type: 'SET_INSPECTOR',
            payload: {
              open: false,
              data: metrics,
            },
          })
        }
      )

      for await (const event of stream) {
        if (abortCtrl.signal.aborted) break

        if (event.type === 'chunk') {
          dispatch({ type: 'APPEND_CHUNK', payload: event.content })
        } else if (event.type === 'full') {
          // Non-streaming full response
          dispatch({ type: 'APPEND_CHUNK', payload: event.content })
          finalUsage = event.usage
        } else if (event.type === 'tool_call') {
          toolCalls.push(event.toolCall)
        } else if (event.type === 'done') {
          finalUsage = event.usage
          if (finalUsage) {
            dispatch({ type: 'SET_METRICS', payload: { usage: finalUsage } })
          }
        }
      }
    } catch (err) {
      if (!abortCtrl.signal.aborted) {
        dispatch({ type: 'SET_ERROR', payload: err.message })
        return
      }
    }

    dispatch({ type: 'FINISH_STREAMING', payload: { usage: finalUsage, toolCalls } })
  }, [input, isStreaming, messages, currentPreset, dispatch, abortControllerRef])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClear = () => {
    dispatch({ type: 'CLEAR_CHAT' })
    setInput('')
  }

  return (
    <>
      <div className="message-input-area">
        <div className="message-input-container">
          {/* Toolbar */}
          <div className="input-toolbar">
            <button
              className="btn btn-ghost btn-icon btn-sm"
              onClick={handleClear}
              data-tooltip="Clear chat"
              id="clear-chat-btn"
              disabled={isStreaming}
            >
              <Trash2 size={14} />
            </button>
            <button
              className="btn btn-ghost btn-icon btn-sm"
              onClick={() => dispatch({ type: 'SET_INSPECTOR', payload: { open: true } })}
              data-tooltip="Open Payload Inspector"
              id="open-inspector-btn"
            >
              <Search size={14} />
            </button>
            <div style={{ flex: 1 }} />
            {charCount > 0 && (
              <span className="char-counter">
                ~{tokenEstimate} tokens
              </span>
            )}
          </div>

          {/* Input Row */}
          <div className="input-row">
            <textarea
              ref={textareaRef}
              id="message-textarea"
              className="message-textarea"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="พิมพ์ข้อความ... (Enter ส่ง, Shift+Enter ขึ้นบรรทัดใหม่)"
              rows={1}
              disabled={isStreaming}
              style={{
                height: 'auto',
                minHeight: '44px',
                maxHeight: '160px',
              }}
              onInput={e => {
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
              }}
            />

            {isStreaming ? (
              <button
                className="btn btn-danger send-btn"
                onClick={stopStream}
                id="stop-stream-btn"
                title="Stop streaming"
              >
                <Square size={16} fill="currentColor" />
              </button>
            ) : (
              <button
                className="btn btn-primary send-btn"
                onClick={handleSend}
                disabled={!input.trim()}
                id="send-message-btn"
                title="Send message (Enter)"
              >
                <Send size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .message-input-area {
          padding: var(--space-3) var(--space-5) var(--space-4);
          border-top: var(--glass-border);
          background: rgba(8, 11, 20, 0.6);
          backdrop-filter: var(--glass-blur);
          flex-shrink: 0;
        }

        .message-input-container {
          max-width: 860px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          background: var(--color-bg-glass);
          border: var(--glass-border);
          border-radius: var(--radius-lg);
          padding: var(--space-2) var(--space-3);
          transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
        }

        .message-input-container:focus-within {
          border-color: rgba(108, 99, 255, 0.4);
          box-shadow: 0 0 0 3px rgba(108, 99, 255, 0.08);
        }

        .input-toolbar {
          display: flex;
          align-items: center;
          gap: var(--space-1);
        }

        .char-counter {
          font-size: var(--text-xs);
          color: var(--color-text-muted);
          font-family: var(--font-mono);
        }

        .input-row {
          display: flex;
          align-items: flex-end;
          gap: var(--space-3);
        }

        .message-textarea {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: var(--color-text-primary);
          font-family: var(--font-sans);
          font-size: var(--text-md);
          line-height: 1.6;
          resize: none;
          overflow-y: auto;
        }

        .message-textarea::placeholder { color: var(--color-text-muted); }
        .message-textarea:disabled { opacity: 0.5; cursor: not-allowed; }

        .send-btn {
          width: 40px;
          height: 40px;
          padding: 0;
          justify-content: center;
          border-radius: var(--radius-md);
          flex-shrink: 0;
        }
      `}</style>
    </>
  )
}
