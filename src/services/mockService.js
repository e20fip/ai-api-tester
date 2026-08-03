/**
 * Mock AI Service — simulates streaming AI responses for UI testing
 */

const MOCK_RESPONSES = [
  "สวัสดีครับ! ผมเป็น Mock AI Agent ที่ถูกสร้างขึ้นเพื่อทดสอบ UI\n\nคุณสามารถทดสอบ:\n- **Streaming** text output\n- **Tool Calls** visualization\n- **Error handling**\n- **Token counter**\n\nลองส่งข้อความมาเลยครับ! 🚀",
  "ขอบคุณสำหรับคำถามครับ! นี่คือตัวอย่าง Markdown output:\n\n## Code Example\n```python\ndef hello_world():\n    print('Hello from Mock AI!')\n    return 42\n```\n\n**Bold text**, *italic*, และ `inline code` ทำงานได้ปกติครับ",
  "นี่คือตัวอย่าง response แบบยาวๆ เพื่อทดสอบ scrolling และ layout:\n\n1. รายการที่ 1 — ข้อมูลสำคัญ\n2. รายการที่ 2 — รายละเอียดเพิ่มเติม\n3. รายการที่ 3 — สรุปผล\n\nการทดสอบ API นั้นสำคัญมากในกระบวนการพัฒนา AI Application เพราะช่วยให้นักพัฒนาเข้าใจพฤติกรรมของ Model และปรับ Parameters ได้อย่างเหมาะสม",
]

const MOCK_TOOL_CALL_RESPONSE = {
  content: null,
  tool_calls: [{
    id: 'call_mock_001',
    type: 'function',
    function: {
      name: 'search_web',
      arguments: JSON.stringify({ query: 'AI API testing best practices', max_results: 5 }),
    },
  }],
}

let responseIndex = 0

/**
 * Simulate a streaming AI response
 * @yields {{ type: 'chunk'|'done'|'tool_call', content: string, usage?: object }}
 */
export async function* mockStream(messages) {
  const lastUserMessage = messages.at(-1)?.content?.toLowerCase() || ''

  // Simulate tool call on specific keywords
  if (lastUserMessage.includes('tool') || lastUserMessage.includes('search')) {
    yield { type: 'tool_call', toolCall: MOCK_TOOL_CALL_RESPONSE.tool_calls[0] }
    await sleep(800)
    yield { type: 'chunk', content: 'ผมได้ค้นหาข้อมูลแล้วนะครับ นี่คือผลลัพธ์ที่พบ:\n\n- ✅ Best practice ที่ 1: Always validate API keys\n- ✅ Best practice ที่ 2: Handle rate limits gracefully\n- ✅ Best practice ที่ 3: Log all request/response pairs' }
    await sleep(200)
    yield { type: 'done', usage: { prompt_tokens: 45, completion_tokens: 62, total_tokens: 107 } }
    return
  }

  // Simulate error on specific keyword
  if (lastUserMessage.includes('error') || lastUserMessage.includes('fail')) {
    await sleep(500)
    throw new Error('Mock API Error 429: Rate limit exceeded. Please retry after 60 seconds.')
  }

  const text = MOCK_RESPONSES[responseIndex % MOCK_RESPONSES.length]
  responseIndex++

  // Stream character by character with variable delay
  let buffer = ''
  for (let i = 0; i < text.length; i++) {
    buffer += text[i]

    // Yield chunks of varying size for realistic feel
    if (buffer.length >= Math.floor(Math.random() * 4) + 1 || i === text.length - 1) {
      yield { type: 'chunk', content: buffer }
      buffer = ''
      await sleep(Math.random() * 30 + 10)
    }
  }

  yield {
    type: 'done',
    usage: {
      prompt_tokens: Math.floor(text.length / 5),
      completion_tokens: Math.floor(text.length / 4),
      total_tokens: Math.floor(text.length / 4) + Math.floor(text.length / 5),
    },
  }
}

/**
 * Non-streaming mock response
 */
export async function mockFetch(messages) {
  await sleep(800 + Math.random() * 600)
  const text = MOCK_RESPONSES[responseIndex % MOCK_RESPONSES.length]
  responseIndex++

  return {
    content: text,
    usage: {
      prompt_tokens: Math.floor(text.length / 5),
      completion_tokens: Math.floor(text.length / 4),
      total_tokens: Math.floor(text.length / 4) + Math.floor(text.length / 5),
    },
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
