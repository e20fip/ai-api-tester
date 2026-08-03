import { useState } from 'react'
import {
  Bot, Plus, Trash2, Settings, ChevronLeft, ChevronRight,
  Zap, Brain, Sparkles, Package, Wrench, FlaskConical
} from 'lucide-react'
import { useApp } from '../../context/AppContext.jsx'
import { createPreset, PROVIDERS } from '../../utils/presets.js'

const PROVIDER_ICONS = {
  mock:      { Icon: FlaskConical, color: '#6c63ff' },
  openai:    { Icon: Zap,      color: '#00d2ff' },
  anthropic: { Icon: Brain,    color: '#ff7b2f' },
  gemini:    { Icon: Sparkles, color: '#00ff9d' },
  ollama:    { Icon: Package,  color: '#ffb700' },
  custom:    { Icon: Wrench,   color: '#ff4d6d' },
}

function PresetItem({ preset, isActive, onClick, onDelete, isCustom }) {
  const { Icon, color } = PROVIDER_ICONS[preset.provider] ?? PROVIDER_ICONS.custom

  return (
    <div
      className={`preset-item${isActive ? ' active' : ''}`}
      onClick={onClick}
      id={`preset-${preset.id}`}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      <div className="preset-icon" style={{ '--preset-color': color }}>
        <Icon size={15} />
      </div>
      <div className="preset-info min-w-0">
        <div className="preset-name truncate">{preset.name}</div>
        <div className="preset-desc truncate">{preset.description || preset.model}</div>
      </div>
      {isCustom && (
        <button
          className="btn btn-ghost btn-icon preset-delete"
          onClick={e => { e.stopPropagation(); onDelete() }}
          data-tooltip="Delete"
          id={`delete-preset-${preset.id}`}
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  )
}

export default function Sidebar() {
  const { state, dispatch, currentPreset, allPresets } = useApp()
  const { sidebarOpen, customPresets } = state
  const builtinPresets = allPresets.filter(p => !customPresets.find(c => c.id === p.id))

  const handleAddPreset = () => {
    const preset = createPreset({ name: `Custom Preset ${customPresets.length + 1}` })
    dispatch({ type: 'ADD_CUSTOM_PRESET', payload: preset })
    dispatch({ type: 'SET_PRESET', payload: preset.id })
  }

  const handleDeletePreset = (id) => {
    dispatch({ type: 'DELETE_CUSTOM_PRESET', payload: id })
  }

  return (
    <>
      <aside className={`sidebar${sidebarOpen ? ' open' : ' collapsed'}`}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="app-logo">
            <div className="logo-icon">
              <Bot size={18} />
            </div>
            {sidebarOpen && (
              <div className="logo-text">
                <span className="logo-name">AI API Tester</span>
                <span className="logo-sub">v1.0</span>
              </div>
            )}
          </div>
          <button
            className="btn btn-ghost btn-icon sidebar-toggle"
            onClick={() => dispatch({ type: 'SET_SIDEBAR_OPEN', payload: !sidebarOpen })}
            data-tooltip={sidebarOpen ? 'Collapse' : 'Expand'}
            data-tooltip-pos="bottom"
            id="sidebar-toggle-btn"
          >
            {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        {/* Preset List */}
        <div className="sidebar-section">
          {sidebarOpen && <div className="sidebar-section-title">Built-in Presets</div>}
          <div className="preset-list">
            {builtinPresets.map(preset => (
              <PresetItem
                key={preset.id}
                preset={preset}
                isActive={currentPreset?.id === preset.id}
                onClick={() => dispatch({ type: 'SET_PRESET', payload: preset.id })}
                isCustom={false}
              />
            ))}
          </div>
        </div>

        {customPresets.length > 0 && (
          <div className="sidebar-section">
            {sidebarOpen && <div className="sidebar-section-title">Custom Presets</div>}
            <div className="preset-list">
              {customPresets.map(preset => (
                <PresetItem
                  key={preset.id}
                  preset={preset}
                  isActive={currentPreset?.id === preset.id}
                  onClick={() => dispatch({ type: 'SET_PRESET', payload: preset.id })}
                  onDelete={() => handleDeletePreset(preset.id)}
                  isCustom={true}
                />
              ))}
            </div>
          </div>
        )}

        {/* Add Preset */}
        <div className="sidebar-footer">
          <button
            className="btn btn-secondary w-full sidebar-add-btn"
            onClick={handleAddPreset}
            id="add-preset-btn"
          >
            <Plus size={15} />
            {sidebarOpen && <span>New Preset</span>}
          </button>
        </div>
      </aside>

      <style>{`
        .sidebar {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: rgba(10, 13, 28, 0.9);
          backdrop-filter: var(--glass-blur);
          border-right: var(--glass-border);
          transition: width var(--transition-normal);
          overflow: hidden;
          flex-shrink: 0;
        }
        .sidebar.open { width: var(--sidebar-width); }
        .sidebar.collapsed { width: 56px; }

        .sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-4) var(--space-3);
          border-bottom: var(--glass-border);
          height: var(--header-height);
          flex-shrink: 0;
        }

        .app-logo {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          overflow: hidden;
          flex: 1;
          min-width: 0;
        }

        .logo-icon {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-md);
          background: linear-gradient(135deg, var(--color-accent-primary), #8b5cf6);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: var(--glow-primary);
        }

        .logo-text {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .logo-name {
          font-size: var(--text-sm);
          font-weight: 700;
          color: var(--color-text-primary);
          white-space: nowrap;
        }

        .logo-sub {
          font-size: var(--text-xs);
          color: var(--color-text-muted);
        }

        .sidebar-section {
          padding: var(--space-3) var(--space-2);
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
        }

        .sidebar-section-title {
          font-size: var(--text-xs);
          font-weight: 700;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          padding: var(--space-1) var(--space-2);
          margin-bottom: var(--space-2);
        }

        .preset-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .preset-item {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-2) var(--space-2);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--transition-fast);
          position: relative;
          overflow: hidden;
          border: 1px solid transparent;
        }

        .preset-item:hover {
          background: var(--color-bg-glass-hover);
          border-color: var(--color-border);
        }

        .preset-item.active {
          background: var(--color-accent-primary-dim);
          border-color: var(--color-border-accent);
        }

        .preset-item:hover .preset-delete { opacity: 1; }
        .preset-delete { opacity: 0; transition: opacity var(--transition-fast); }

        .preset-icon {
          width: 30px;
          height: 30px;
          border-radius: var(--radius-sm);
          background: rgba(var(--preset-color, #6c63ff), 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--preset-color);
          flex-shrink: 0;
          border: 1px solid rgba(255,255,255,0.08);
        }

        .preset-info { display: flex; flex-direction: column; min-width: 0; flex: 1; }
        .preset-name { font-size: var(--text-sm); font-weight: 500; }
        .preset-desc { font-size: var(--text-xs); color: var(--color-text-muted); }

        .sidebar-footer {
          padding: var(--space-3) var(--space-2);
          border-top: var(--glass-border);
          flex-shrink: 0;
        }

        .sidebar.collapsed .sidebar-section-title { display: none; }
        .sidebar.collapsed .preset-name { display: none; }
        .sidebar.collapsed .preset-desc { display: none; }
        .sidebar.collapsed .logo-text { display: none; }
        .sidebar.collapsed .preset-item { justify-content: center; padding: var(--space-2); }
        .sidebar.collapsed .preset-info { display: none; }
        .sidebar.collapsed .sidebar-add-btn span { display: none; }
        .sidebar.collapsed .sidebar-add-btn { justify-content: center; }
      `}</style>
    </>
  )
}
