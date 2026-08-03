import React, { createContext, useContext, useReducer, useCallback, useRef } from 'react'
import { DEFAULT_PRESETS } from '../utils/presets.js'

const AppContext = createContext(null)

// ===== State =====
function loadPresets() {
  try {
    const saved = localStorage.getItem('ai-tester-presets')
    if (saved) return JSON.parse(saved)
  } catch {}
  return DEFAULT_PRESETS
}

function loadCustomPresets() {
  try {
    const saved = localStorage.getItem('ai-tester-custom-presets')
    if (saved) return JSON.parse(saved)
  } catch {}
  return []
}

const INITIAL_STATE = {
  presets: loadPresets(),
  customPresets: loadCustomPresets(),
  currentPresetId: 'mock-agent',
  messages: [],
  isStreaming: false,
  streamingContent: '',
  activeView: 'chat', // 'chat' | 'playground' | 'raw'
  sidebarOpen: true,
  configOpen: false,
  inspectorOpen: false,
  inspectorData: null,
  lastMetrics: null,
  error: null,
}

// ===== Reducer =====
function reducer(state, action) {
  switch (action.type) {

    case 'SET_VIEW':
      return { ...state, activeView: action.payload }

    case 'SET_PRESET':
      return { ...state, currentPresetId: action.payload, messages: [], error: null }

    case 'UPDATE_PRESET': {
      const presets = state.presets.map(p =>
        p.id === action.payload.id ? { ...p, ...action.payload } : p
      )
      const customPresets = state.customPresets.map(p =>
        p.id === action.payload.id ? { ...p, ...action.payload } : p
      )
      return { ...state, presets, customPresets }
    }

    case 'ADD_CUSTOM_PRESET': {
      const customPresets = [...state.customPresets, action.payload]
      try { localStorage.setItem('ai-tester-custom-presets', JSON.stringify(customPresets)) } catch {}
      return { ...state, customPresets }
    }

    case 'DELETE_CUSTOM_PRESET': {
      const customPresets = state.customPresets.filter(p => p.id !== action.payload)
      try { localStorage.setItem('ai-tester-custom-presets', JSON.stringify(customPresets)) } catch {}
      const newId = state.currentPresetId === action.payload ? 'mock-agent' : state.currentPresetId
      return { ...state, customPresets, currentPresetId: newId }
    }

    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
        error: null,
      }

    case 'START_STREAMING':
      return { ...state, isStreaming: true, streamingContent: '', error: null }

    case 'APPEND_CHUNK':
      return { ...state, streamingContent: state.streamingContent + action.payload }

    case 'FINISH_STREAMING': {
      const assistantMsg = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: state.streamingContent,
        timestamp: Date.now(),
        usage: action.payload?.usage,
        toolCalls: action.payload?.toolCalls ?? [],
      }
      return {
        ...state,
        isStreaming: false,
        streamingContent: '',
        messages: [...state.messages, assistantMsg],
      }
    }

    case 'ADD_TOOL_CALL': {
      const lastMsg = state.messages.at(-1)
      if (lastMsg?.role === 'assistant') {
        const messages = [...state.messages]
        messages[messages.length - 1] = {
          ...lastMsg,
          toolCalls: [...(lastMsg.toolCalls || []), action.payload],
        }
        return { ...state, messages }
      }
      return state
    }

    case 'SET_ERROR':
      return { ...state, isStreaming: false, streamingContent: '', error: action.payload }

    case 'CLEAR_CHAT':
      return { ...state, messages: [], error: null, streamingContent: '', isStreaming: false }

    case 'SET_SIDEBAR_OPEN':
      return { ...state, sidebarOpen: action.payload }

    case 'SET_CONFIG_OPEN':
      return { ...state, configOpen: action.payload }

    case 'SET_INSPECTOR':
      return { ...state, inspectorOpen: action.payload.open, inspectorData: action.payload.data ?? state.inspectorData }

    case 'SET_METRICS':
      return { ...state, lastMetrics: { ...state.lastMetrics, ...action.payload } }

    default:
      return state
  }
}

// ===== Provider =====
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)
  const abortControllerRef = useRef(null)

  const allPresets = [...state.presets, ...state.customPresets]
  const currentPreset = allPresets.find(p => p.id === state.currentPresetId) ?? allPresets[0]

  const stopStream = useCallback(() => {
    abortControllerRef.current?.abort()
    dispatch({ type: 'FINISH_STREAMING', payload: { toolCalls: [] } })
  }, [])

  const value = {
    state,
    dispatch,
    currentPreset,
    allPresets,
    stopStream,
    abortControllerRef,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// ===== Hook =====
export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
