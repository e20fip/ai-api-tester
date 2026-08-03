/**
 * Build request payload from config + messages for each provider format
 */

// ===== OpenAI Format =====
export function buildOpenAIPayload(config, messages) {
  const payload = {
    model: config.model,
    messages: [],
    temperature: config.temperature,
    top_p: config.topP,
    max_tokens: config.maxTokens,
    stream: config.stream,
  }

  if (config.systemPrompt?.trim()) {
    payload.messages.push({ role: 'system', content: config.systemPrompt.trim() })
  }

  payload.messages.push(...messages.map(m => ({
    role: m.role,
    content: m.content,
  })))

  if (config.tools?.length > 0) {
    try {
      const tools = typeof config.tools === 'string'
        ? JSON.parse(config.tools)
        : config.tools
      if (Array.isArray(tools) && tools.length > 0) {
        payload.tools = tools
      }
    } catch {}
  }

  return payload
}

// ===== Anthropic Format =====
export function buildAnthropicPayload(config, messages) {
  const payload = {
    model: config.model,
    max_tokens: config.maxTokens,
    stream: config.stream,
    messages: messages.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    })),
  }

  if (config.systemPrompt?.trim()) {
    payload.system = config.systemPrompt.trim()
  }

  if (config.temperature !== undefined) {
    payload.temperature = config.temperature
  }

  if (config.topP !== undefined) {
    payload.top_p = config.topP
  }

  if (config.tools?.length > 0) {
    try {
      const tools = typeof config.tools === 'string'
        ? JSON.parse(config.tools)
        : config.tools
      if (Array.isArray(tools) && tools.length > 0) {
        payload.tools = tools
      }
    } catch {}
  }

  return payload
}

// ===== Gemini Format =====
export function buildGeminiPayload(config, messages) {
  const contents = []

  messages.forEach(m => {
    contents.push({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })
  })

  const payload = {
    contents,
    generationConfig: {
      temperature: config.temperature,
      topP: config.topP,
      maxOutputTokens: config.maxTokens,
    },
  }

  if (config.systemPrompt?.trim()) {
    payload.systemInstruction = {
      parts: [{ text: config.systemPrompt.trim() }],
    }
  }

  return payload
}

// ===== Ollama Format =====
export function buildOllamaPayload(config, messages) {
  const payload = {
    model: config.model,
    messages: [],
    stream: config.stream,
    options: {
      temperature: config.temperature,
      top_p: config.topP,
      num_predict: config.maxTokens,
    },
  }

  if (config.systemPrompt?.trim()) {
    payload.messages.push({ role: 'system', content: config.systemPrompt.trim() })
  }

  payload.messages.push(...messages.map(m => ({
    role: m.role,
    content: m.content,
  })))

  return payload
}

// ===== Dispatcher =====
export function buildPayload(config, messages) {
  switch (config.requestFormat) {
    case 'anthropic': return buildAnthropicPayload(config, messages)
    case 'gemini':    return buildGeminiPayload(config, messages)
    case 'ollama':    return buildOllamaPayload(config, messages)
    default:          return buildOpenAIPayload(config, messages)
  }
}

// ===== Build Headers =====
export function buildHeaders(config) {
  const headers = {
    'Content-Type': 'application/json',
  }

  if (config.apiKey?.trim()) {
    const prefix = config.apiKeyPrefix?.trim()
    headers[config.apiKeyHeader] = prefix
      ? `${prefix} ${config.apiKey.trim()}`
      : config.apiKey.trim()
  }

  // Gemini uses query param, not header
  if (config.requestFormat === 'gemini' && config.apiKey?.trim()) {
    delete headers[config.apiKeyHeader]
  }

  // Merge custom headers
  if (config.customHeaders) {
    Object.entries(config.customHeaders).forEach(([k, v]) => {
      if (k?.trim() && v !== undefined) {
        headers[k.trim()] = v
      }
    })
  }

  return headers
}

// ===== Build Endpoint URL =====
export function buildEndpointUrl(config) {
  let url = config.endpoint

  // Replace {model} placeholder (Gemini)
  url = url.replace('{model}', config.model || '')

  // Gemini: append API key as query param
  if (config.requestFormat === 'gemini' && config.apiKey?.trim()) {
    const sep = url.includes('?') ? '&' : '?'
    url += `${sep}key=${config.apiKey.trim()}`
    if (config.stream) {
      url += '&alt=sse'
    }
  }

  return url
}
