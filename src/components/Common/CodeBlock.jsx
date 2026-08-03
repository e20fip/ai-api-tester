import { useEffect, useRef, useState } from 'react'
import hljs from 'highlight.js/lib/core'
import json from 'highlight.js/lib/languages/json'
import bash from 'highlight.js/lib/languages/bash'
import { Copy, Check } from 'lucide-react'

hljs.registerLanguage('json', json)
hljs.registerLanguage('bash', bash)

export default function CodeBlock({ code = '', language = 'json', maxHeight = '400px', label = '' }) {
  const preRef = useRef(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (preRef.current) {
      preRef.current.innerHTML = ''
      const codeEl = document.createElement('code')
      codeEl.textContent = code
      preRef.current.appendChild(codeEl)

      try {
        if (language === 'json') {
          const pretty = JSON.stringify(JSON.parse(code), null, 2)
          codeEl.textContent = pretty
        }
      } catch {}

      hljs.highlightElement(codeEl)
    }
  }, [code, language])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div className="code-block">
      {(label || language) && (
        <div className="code-block-header">
          {label && <span className="code-block-label">{label}</span>}
          <span className="code-block-lang">{language}</span>
          <button
            className="btn btn-ghost btn-sm btn-icon"
            onClick={handleCopy}
            data-tooltip={copied ? 'Copied!' : 'Copy'}
            id={`copy-btn-${language}-${label?.replace(/\s/g, '-')}`}
          >
            {copied ? <Check size={13} strokeWidth={2.5} /> : <Copy size={13} />}
          </button>
        </div>
      )}
      <div className="code-block-body" style={{ maxHeight, overflowY: 'auto' }}>
        <pre ref={preRef} />
      </div>

      <style>{`
        .code-block {
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          overflow: hidden;
        }
        .code-block-header {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-2) var(--space-3);
          border-bottom: 1px solid var(--color-border);
          background: rgba(255,255,255,0.03);
        }
        .code-block-label {
          font-size: var(--text-xs);
          font-weight: 600;
          color: var(--color-text-secondary);
          flex: 1;
        }
        .code-block-lang {
          font-family: var(--font-mono);
          font-size: var(--text-xs);
          color: var(--color-accent-primary);
          background: var(--color-accent-primary-dim);
          padding: 1px 6px;
          border-radius: var(--radius-sm);
        }
        .code-block-body {
          padding: var(--space-3) var(--space-4);
        }
        .code-block-body pre {
          margin: 0;
          white-space: pre-wrap;
          word-break: break-word;
        }
      `}</style>
    </div>
  )
}
