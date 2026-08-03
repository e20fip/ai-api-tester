import { buildPayload, buildHeaders, buildEndpointUrl } from './requestBuilder.js'

/**
 * Generate a cURL command from config + messages
 */
export function buildCurlCommand(config, messages) {
  const url = buildEndpointUrl(config)
  const headers = buildHeaders(config)
  const payload = buildPayload(config, messages)

  const headerFlags = Object.entries(headers)
    .map(([k, v]) => `  -H '${k}: ${v}'`)
    .join(' \\\n')

  const body = JSON.stringify(payload, null, 2)
    .replace(/'/g, "'\\''") // escape single quotes for shell

  const streamFlag = config.stream ? ' \\\n  --no-buffer' : ''

  return `curl -X ${config.method || 'POST'} '${url}' \\\n${headerFlags} \\\n  -d '${body}'${streamFlag}`
}

/**
 * Estimate cost based on provider and token usage
 * Rough estimates, not exact billing
 */
export function estimateCost(provider, model, promptTokens, completionTokens) {
  const pricing = {
    'gpt-4o':            { input: 0.0025,  output: 0.01 },
    'gpt-4o-mini':       { input: 0.00015, output: 0.0006 },
    'gpt-4-turbo':       { input: 0.01,    output: 0.03 },
    'gpt-3.5-turbo':     { input: 0.0005,  output: 0.0015 },
    'claude-opus-4-5':   { input: 0.015,   output: 0.075 },
    'claude-sonnet-4-5': { input: 0.003,   output: 0.015 },
    'claude-haiku-3-5':  { input: 0.0008,  output: 0.004 },
    'gemini-2.0-flash':  { input: 0.0001,  output: 0.0004 },
    'gemini-1.5-pro':    { input: 0.00125, output: 0.005 },
  }

  const prices = pricing[model]
  if (!prices) return null

  const inputCost  = (promptTokens     / 1000) * prices.input
  const outputCost = (completionTokens / 1000) * prices.output

  return {
    inputCost:  inputCost.toFixed(6),
    outputCost: outputCost.toFixed(6),
    totalCost:  (inputCost + outputCost).toFixed(6),
    currency: 'USD',
  }
}

/**
 * Format milliseconds to human readable
 */
export function formatLatency(ms) {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

/**
 * Count rough token estimate (4 chars ≈ 1 token)
 */
export function estimateTokens(text) {
  return Math.ceil((text || '').length / 4)
}
