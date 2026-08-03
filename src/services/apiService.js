import { buildPayload, buildHeaders, buildEndpointUrl } from '../utils/requestBuilder.js'
import { mockStream, mockFetch } from './mockService.js'

/**
 * Parse SSE chunks from different providers into a unified format
 */
function parseChunk(chunk, format) {
  try {
    if (!chunk?.trim() || chunk === '[DONE]') return null

    const data = JSON.parse(chunk)

    switch (format) {
      case 'anthropic': {
        if (data.type === 'content_block_delta' && data.delta?.text) {
          return { type: 'chunk', content: data.delta.text }
        }
        if (data.type === 'message_delta' && data.usage) {
          return {
            type: 'done',
            usage: {
              prompt_tokens: data.usage.input_tokens ?? 0,
              completion_tokens: data.usage.output_tokens ?? 0,
              total_tokens: (data.usage.input_tokens ?? 0) + (data.usage.output_tokens ?? 0),
            },
          }
        }
        if (data.type === 'content_block_start' && data.content_block?.type === 'tool_use') {
          return { type: 'tool_call_start', toolName: data.content_block.name, id: data.content_block.id }
        }
        return null
      }

      case 'gemini': {
        const candidate = data.candidates?.[0]
        if (!candidate) return null
        const text = candidate.content?.parts?.map(p => p.text || '').join('')
        if (text) return { type: 'chunk', content: text }
        if (data.usageMetadata) {
          return {
            type: 'done',
            usage: {
              prompt_tokens: data.usageMetadata.promptTokenCount ?? 0,
              completion_tokens: data.usageMetadata.candidatesTokenCount ?? 0,
              total_tokens: data.usageMetadata.totalTokenCount ?? 0,
            },
          }
        }
        return null
      }

      case 'ollama': {
        if (data.message?.content) {
          return { type: 'chunk', content: data.message.content }
        }
        if (data.done && data.eval_count) {
          return {
            type: 'done',
            usage: {
              prompt_tokens: data.prompt_eval_count ?? 0,
              completion_tokens: data.eval_count ?? 0,
              total_tokens: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
            },
          }
        }
        return null
      }

      default: { // openai
        const delta = data.choices?.[0]?.delta
        if (!delta) return null

        if (delta.content) return { type: 'chunk', content: delta.content }

        if (delta.tool_calls?.[0]) {
          const tc = delta.tool_calls[0]
          return {
            type: 'tool_call',
            toolCall: {
              id: tc.id,
              name: tc.function?.name,
              argumentsDelta: tc.function?.arguments,
            },
          }
        }

        if (data.choices[0].finish_reason && data.usage) {
          return {
            type: 'done',
            usage: {
              prompt_tokens: data.usage.prompt_tokens ?? 0,
              completion_tokens: data.usage.completion_tokens ?? 0,
              total_tokens: data.usage.total_tokens ?? 0,
            },
          }
        }
        return null
      }
    }
  } catch {
    return null
  }
}

/**
 * Parse a non-streaming JSON response into unified format
 */
function parseFullResponse(data, format) {
  switch (format) {
    case 'anthropic': {
      const content = data.content
        ?.filter(b => b.type === 'text')
        ?.map(b => b.text)
        ?.join('') ?? ''
      return {
        content,
        toolCalls: data.content?.filter(b => b.type === 'tool_use') ?? [],
        usage: {
          prompt_tokens: data.usage?.input_tokens ?? 0,
          completion_tokens: data.usage?.output_tokens ?? 0,
          total_tokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
        },
      }
    }

    case 'gemini': {
      const candidate = data.candidates?.[0]
      const text = candidate?.content?.parts?.map(p => p.text || '').join('') ?? ''
      return {
        content: text,
        toolCalls: [],
        usage: {
          prompt_tokens: data.usageMetadata?.promptTokenCount ?? 0,
          completion_tokens: data.usageMetadata?.candidatesTokenCount ?? 0,
          total_tokens: data.usageMetadata?.totalTokenCount ?? 0,
        },
      }
    }

    case 'ollama': {
      return {
        content: data.message?.content ?? '',
        toolCalls: [],
        usage: {
          prompt_tokens: data.prompt_eval_count ?? 0,
          completion_tokens: data.eval_count ?? 0,
          total_tokens: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
        },
      }
    }

    default: { // openai
      const msg = data.choices?.[0]?.message
      return {
        content: msg?.content ?? '',
        toolCalls: msg?.tool_calls ?? [],
        usage: {
          prompt_tokens: data.usage?.prompt_tokens ?? 0,
          completion_tokens: data.usage?.completion_tokens ?? 0,
          total_tokens: data.usage?.total_tokens ?? 0,
        },
      }
    }
  }
}

/**
 * Main streaming API call — yields unified events
 * @yields {{ type: 'chunk'|'done'|'tool_call'|'error', ... }}
 */
export async function* streamCompletion(config, messages, onMetrics) {
  // Mock mode
  if (config.provider === 'mock') {
    yield* mockStream(messages)
    return
  }

  const startTime = Date.now()
  const url = buildEndpointUrl(config)
  const headers = buildHeaders(config)
  const payload = buildPayload(config, messages)

  let response
  try {
    response = await fetch(url, {
      method: config.method || 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60000),
    })
  } catch (err) {
    if (err.name === 'TimeoutError') {
      throw new Error('Request timeout (60s). The API took too long to respond.')
    }
    throw new Error(`Network error: ${err.message}`)
  }

  // Capture response metadata
  const responseHeaders = {}
  response.headers.forEach((v, k) => { responseHeaders[k] = v })

  if (onMetrics) {
    onMetrics({
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      requestPayload: payload,
      requestHeaders: headers,
      requestUrl: url,
      latency: Date.now() - startTime,
    })
  }

  if (!response.ok) {
    const errorText = await response.text()
    let errorMsg = `HTTP ${response.status}: ${response.statusText}`
    try {
      const parsed = JSON.parse(errorText)
      errorMsg = parsed.error?.message || parsed.message || errorMsg
    } catch {}
    throw new Error(errorMsg)
  }

  const format = config.requestFormat || 'openai'

  if (!config.stream) {
    const data = await response.json()
    const parsed = parseFullResponse(data, format)
    if (onMetrics) onMetrics({ responseBody: data })
    yield { type: 'full', ...parsed }
    return
  }

  // SSE Streaming via ReadableStream
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const toolCallBuffers = {}
  let lastUsage = null

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith(':')) continue // SSE comment

        let dataStr = trimmed
        if (trimmed.startsWith('data: ')) {
          dataStr = trimmed.slice(6)
        }

        if (dataStr === '[DONE]') {
          if (lastUsage) yield { type: 'done', usage: lastUsage }
          continue
        }

        const parsed = parseChunk(dataStr, format)
        if (!parsed) continue

        if (parsed.type === 'done') {
          lastUsage = parsed.usage
        } else if (parsed.type === 'tool_call' && parsed.toolCall.argumentsDelta) {
          // Accumulate tool call arguments
          const id = parsed.toolCall.id ?? 'current'
          if (!toolCallBuffers[id]) {
            toolCallBuffers[id] = { id, name: parsed.toolCall.name, arguments: '' }
          }
          toolCallBuffers[id].arguments += parsed.toolCall.argumentsDelta
        } else {
          yield parsed
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  // Emit accumulated tool calls
  for (const tc of Object.values(toolCallBuffers)) {
    try {
      tc.parsedArguments = JSON.parse(tc.arguments)
    } catch {
      tc.parsedArguments = tc.arguments
    }
    yield { type: 'tool_call', toolCall: tc }
  }

  if (lastUsage) yield { type: 'done', usage: lastUsage }
}

/**
 * Single non-streaming fetch (for Raw Request view)
 */
export async function fetchCompletion(config, messages) {
  if (config.provider === 'mock') return mockFetch(messages)

  const url = buildEndpointUrl(config)
  const headers = buildHeaders(config)
  const payload = buildPayload(config, messages)
  const startTime = Date.now()

  const response = await fetch(url, {
    method: config.method || 'POST',
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60000),
  })

  const latency = Date.now() - startTime

  const responseHeaders = {}
  response.headers.forEach((v, k) => { responseHeaders[k] = v })

  const rawBody = await response.text()
  let data
  try { data = JSON.parse(rawBody) } catch { data = rawBody }

  return {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
    body: data,
    rawBody,
    latency,
    requestPayload: payload,
    requestHeaders: headers,
    requestUrl: url,
  }
}
