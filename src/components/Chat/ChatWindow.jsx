import { useEffect, useRef, useState } from 'react'
import { User, Bot, ChevronDown, ChevronRight, Wrench, Copy, Check, AlertCircle } from 'lucide-react'
import { useApp } from '../../context/AppContext.jsx'
import CodeBlock from '../Common/CodeBlock.jsx'

function ToolCallCard({ toolCall }) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const args = toolCall.parsedArguments ?? toolCall.argumentsDelta ?? ''
  const argsStr = typeof args === 'string' ? args : JSON.stringify(args, null, 2)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(argsStr)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="tool-call-card">
      <div
        className="tool-call-header"
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && setExpanded(!expanded)}
      >
        <Wrench size={13} />
        <span className="tool-call-name">{toolCall.name ?? 'tool_call'}</span>
        <span className="tool-call-id">{toolCall.id}</span>
        <div style={{ flex: 1 }} />
        <button
          className="btn btn-ghost btn-icon"
          onClick={e => { e.stopPropagation(); handleCopy() }}
          id={`copy-tool-${toolCall.id ?? 'tc'}`}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </div>
      {expanded && (
        <div className="tool-call-body">
          <pre className="tool-call-args">{argsStr}</pre>
        </div>
      )}
    </div>
  )
}

function MessageBubble({ message, isStreaming = false }) {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'

  const renderContent = (text) => {
    if (!text) return null

    const blocks = []
    const lines = text.split('\n')
    let currentCodeBlock = null
    let currentList = null

    const flushList = () => {
      if (currentList) {
        const Tag = currentList.type
        blocks.push(
          <Tag key={`list-${blocks.length}`} className={currentList.type === 'ul' ? 'msg-ul' : 'msg-ol'}>
            {currentList.items.map((item, idx) => (
              <li key={idx} className="msg-li">{renderInline(item)}</li>
            ))}
          </Tag>
        )
        currentList = null
      }
    }

    const renderInline = (inlineText) => {
      const parts = inlineText.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/)
      return parts.map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) return <strong key={j}>{part.slice(2, -2)}</strong>
        if (part.startsWith('`') && part.endsWith('`'))   return <code key={j} className="msg-inline-code">{part.slice(1, -1)}</code>
        if (part.startsWith('*') && part.endsWith('*'))   return <em key={j}>{part.slice(1, -1)}</em>
        return part
      })
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // Handle Code Block
      if (line.trim().startsWith('```')) {
        if (currentCodeBlock !== null) {
          const codeText = currentCodeBlock.lines.join('\n')
          blocks.push(
            <div key={`code-${blocks.length}`} className="msg-code-block-container" style={{ margin: '8px 0' }}>
              <CodeBlock code={codeText} language={currentCodeBlock.lang || 'text'} />
            </div>
          )
          currentCodeBlock = null
        } else {
          flushList()
          const lang = line.trim().slice(3).trim()
          currentCodeBlock = { lang, lines: [] }
        }
        continue
      }

      if (currentCodeBlock !== null) {
        currentCodeBlock.lines.push(line)
        continue
      }

      // Handle Headings
      if (line.startsWith('#')) {
        flushList()
        const match = line.match(/^(#{1,6})\s+(.*)$/)
        if (match) {
          const level = match[1].length
          const headingText = match[2]
          const Tag = `h${Math.min(level + 1, 6)}`
          blocks.push(<Tag key={`h-${blocks.length}`} className={`msg-heading-${level}`}>{renderInline(headingText)}</Tag>)
          continue
        }
      }

      // Handle Unordered List Items
      const ulMatch = line.match(/^[\*\-]\s+(.*)$/)
      if (ulMatch) {
        if (currentList && currentList.type !== 'ul') {
          flushList()
        }
        if (!currentList) {
          currentList = { type: 'ul', items: [] }
        }
        currentList.items.push(ulMatch[1])
        continue
      }

      // Handle Ordered List Items
      const olMatch = line.match(/^\d+\.\s+(.*)$/)
      if (olMatch) {
        if (currentList && currentList.type !== 'ol') {
          flushList()
        }
        if (!currentList) {
          currentList = { type: 'ol', items: [] }
        }
        currentList.items.push(olMatch[1])
        continue
      }

      if (line.trim() === '') {
        flushList()
        continue
      }

      flushList()
      blocks.push(
        <p key={`p-${blocks.length}`} className="msg-line">
          {renderInline(line)}
        </p>
      )
    }

    flushList()

    if (currentCodeBlock !== null) {
      const codeText = currentCodeBlock.lines.join('\n')
      blocks.push(
        <div key={`code-open-${blocks.length}`} className="msg-code-block-container" style={{ margin: '8px 0' }}>
          <CodeBlock code={codeText} language={currentCodeBlock.lang || 'text'} />
        </div>
      )
    }

    return blocks
  }

  return (
    <div className={`message animate-fade-slide ${isUser ? 'message-user' : 'message-assistant'}`}>
      <div className="message-avatar">
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>
      <div className="message-body">
        <div className="message-role">
          {isUser ? 'You' : 'Assistant'}
          {message.timestamp && (
            <span className="message-time">
              {new Date(message.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <div className="message-content">
          {renderContent(message.content)}
          {isStreaming && (
            <span className="streaming-cursor" />
          )}
        </div>
        {message.toolCalls?.length > 0 && (
          <div className="message-tool-calls">
            {message.toolCalls.map((tc, i) => (
              <ToolCallCard key={tc.id ?? i} toolCall={tc} />
            ))}
          </div>
        )}
        {message.usage && (
          <div className="message-usage">
            <span>↑ {message.usage.prompt_tokens ?? '—'}</span>
            <span>↓ {message.usage.completion_tokens ?? '—'}</span>
            <span>∑ {message.usage.total_tokens ?? '—'} tokens</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ChatWindow() {
  const { state } = useApp()
  const { messages, isStreaming, streamingContent, error } = state
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  const isEmpty = messages.length === 0 && !isStreaming

  return (
    <>
      <div className="chat-window" id="chat-window" role="log" aria-live="polite">
        {isEmpty ? (
          <div className="chat-empty">
            <div className="chat-empty-icon">
              <Bot size={40} />
            </div>
            <h2 className="chat-empty-title">AI API Tester</h2>
            <p className="chat-empty-sub">
              เลือก preset ด้านซ้าย ตั้งค่า API และเริ่มสนทนากับ AI Agent ได้เลย
            </p>
            <div className="chat-empty-hints">
              <div className="hint-chip">💬 Chat Mode</div>
              <div className="hint-chip">⚡ Streaming SSE</div>
              <div className="hint-chip">🔧 Tool Calls</div>
              <div className="hint-chip">🧪 Mock Mode</div>
            </div>
          </div>
        ) : (
          <div className="chat-messages">
            {messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {/* Streaming message */}
            {isStreaming && (
              streamingContent
                ? <MessageBubble
                    message={{ role: 'assistant', content: streamingContent }}
                    isStreaming={true}
                  />
                : <div className="message message-assistant animate-fade">
                    <div className="message-avatar"><Bot size={14} /></div>
                    <div className="message-body">
                      <div className="typing-indicator">
                        <div className="typing-dot" />
                        <div className="typing-dot" />
                        <div className="typing-dot" />
                      </div>
                    </div>
                  </div>
            )}

            {/* Error */}
            {error && (
              <div className="chat-error animate-fade-slide">
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <style>{`
        .chat-window {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: var(--space-6) var(--space-5);
          display: flex;
          flex-direction: column;
        }

        .chat-messages {
          display: flex;
          flex-direction: column;
          gap: var(--space-5);
          max-width: 860px;
          width: 100%;
          margin: 0 auto;
        }

        .chat-empty {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--space-4);
          text-align: center;
          padding: var(--space-12);
          animation: fadeSlideIn 0.5s both;
        }

        .chat-empty-icon {
          width: 80px;
          height: 80px;
          border-radius: var(--radius-xl);
          background: var(--color-accent-primary-dim);
          border: 1px solid var(--color-border-accent);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-accent-primary);
          box-shadow: var(--glow-primary);
        }

        .chat-empty-title {
          font-size: var(--text-2xl);
          font-weight: 700;
          background: linear-gradient(135deg, var(--color-accent-primary), var(--color-accent-secondary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .chat-empty-sub {
          font-size: var(--text-md);
          color: var(--color-text-secondary);
          max-width: 360px;
          line-height: 1.7;
        }

        .chat-empty-hints {
          display: flex;
          gap: var(--space-2);
          flex-wrap: wrap;
          justify-content: center;
        }

        .hint-chip {
          padding: var(--space-2) var(--space-3);
          background: var(--color-bg-glass);
          border: var(--glass-border);
          border-radius: var(--radius-full);
          font-size: var(--text-xs);
          font-weight: 600;
          color: var(--color-text-secondary);
        }

        .message {
          display: flex;
          gap: var(--space-3);
          max-width: 100%;
        }

        .message-user { flex-direction: row-reverse; }

        .message-avatar {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .message-user .message-avatar {
          background: linear-gradient(135deg, var(--color-accent-primary), #8b5cf6);
          color: white;
        }

        .message-assistant .message-avatar {
          background: var(--color-bg-glass);
          border: var(--glass-border);
          color: var(--color-text-secondary);
        }

        .message-body { display: flex; flex-direction: column; gap: var(--space-2); max-width: 80%; min-width: 0; }
        .message-user .message-body { align-items: flex-end; }

        .message-role {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-size: var(--text-xs);
          font-weight: 700;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .message-time { font-weight: 400; }

        .message-content {
          background: var(--color-bg-glass);
          border: var(--glass-border);
          border-radius: var(--radius-lg);
          padding: var(--space-3) var(--space-4);
          font-size: var(--text-md);
          line-height: 1.75;
          word-break: break-word;
        }

        .message-user .message-content {
          background: var(--color-accent-primary-dim);
          border-color: var(--color-border-accent);
        }

        .msg-line { margin: 2px 0; }
        .msg-line:empty { height: 8px; }
        .msg-ul, .msg-ol {
          margin: 8px 0;
          padding-left: var(--space-5);
        }
        .msg-li {
          margin: 4px 0;
        }
        .msg-heading-1 { font-size: var(--text-xl); font-weight: 700; margin: var(--space-3) 0 var(--space-2); }
        .msg-heading-2 { font-size: var(--text-lg); font-weight: 700; margin: var(--space-2) 0 var(--space-1); }
        .msg-heading-3 { font-size: var(--text-md); font-weight: 700; margin: var(--space-2) 0 var(--space-1); }
        .msg-heading-4, .msg-heading-5, .msg-heading-6 { font-size: var(--text-sm); font-weight: 700; margin: var(--space-2) 0 var(--space-1); }
        .msg-inline-code {
          font-family: var(--font-mono);
          font-size: 0.88em;
          background: rgba(108, 99, 255, 0.15);
          color: var(--color-accent-secondary);
          padding: 1px 5px;
          border-radius: var(--radius-sm);
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

        .message-tool-calls { display: flex; flex-direction: column; gap: var(--space-2); }

        .tool-call-card {
          background: rgba(255, 183, 0, 0.06);
          border: 1px solid rgba(255, 183, 0, 0.2);
          border-radius: var(--radius-md);
          overflow: hidden;
        }

        .tool-call-header {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-2) var(--space-3);
          cursor: pointer;
          font-size: var(--text-xs);
          color: var(--color-accent-warning);
          transition: background var(--transition-fast);
        }

        .tool-call-header:hover { background: rgba(255, 183, 0, 0.05); }
        .tool-call-name { font-weight: 700; font-family: var(--font-mono); }
        .tool-call-id { color: var(--color-text-muted); font-family: var(--font-mono); font-size: 10px; }

        .tool-call-body { padding: 0 var(--space-3) var(--space-3); }
        .tool-call-args {
          font-family: var(--font-mono);
          font-size: var(--text-xs);
          color: var(--color-text-secondary);
          white-space: pre-wrap;
          word-break: break-word;
          background: rgba(0,0,0,0.2);
          padding: var(--space-2);
          border-radius: var(--radius-sm);
        }

        .message-usage {
          display: flex;
          gap: var(--space-3);
          font-size: var(--text-xs);
          color: var(--color-text-muted);
          font-family: var(--font-mono);
        }

        .chat-error {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-3) var(--space-4);
          background: rgba(255, 77, 109, 0.08);
          border: 1px solid rgba(255, 77, 109, 0.25);
          border-radius: var(--radius-md);
          color: var(--color-accent-danger);
          font-size: var(--text-sm);
          max-width: 860px;
          margin: 0 auto;
          width: 100%;
        }
      `}</style>
    </>
  )
}
