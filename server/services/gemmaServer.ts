import { SERVER_CONFIG } from '../config.js'

export async function gemmaGenerateText(
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const url = `${SERVER_CONFIG.gemmaEndpoint}/models/${SERVER_CONFIG.gemmaModel}:generateContent?key=${SERVER_CONFIG.googleApiKey}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: options?.temperature ?? 0.3,
        maxOutputTokens: options?.maxTokens ?? 4096,
      },
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    if (response.status >= 500 && (options?.temperature ?? 0) < 1) {
      console.warn(`[Gemma] API 500, retrying...`);
      await new Promise(r => setTimeout(r, 2000));
      return gemmaGenerateText(systemPrompt, userPrompt, { ...options, temperature: (options?.temperature ?? 0) + 0.1 });
    }
    throw new Error(`Gemma API ${response.status}: ${err.slice(0, 300)}`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.find((p: { text?: string }) => p.text)?.text
  if (!text) throw new Error('Empty Gemma response')
  return text
}

/** Parse JSON from model output (handles markdown fences and messy text). */
export function parseJsonFromModel<T>(raw: string): T {
  // 1. Try to find JSON in code fences
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  let candidate = (fenced?.[1] ?? raw).trim()
  
  // 2. If no fence or failed, try to find the first '{' and last '}'
  if (!candidate.startsWith('{') && !candidate.startsWith('[')) {
    const start = candidate.indexOf('{')
    const end = candidate.lastIndexOf('}')
    if (start !== -1 && end !== -1 && end > start) {
      candidate = candidate.slice(start, end + 1)
    }
  }

  // 3. Clean up common issues (like trailing commas before closing braces)
  const cleaned = candidate
    .replace(/,\s*([}\]])/g, '$1') // Remove trailing commas
    .replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1') // Remove comments

  try {
    return JSON.parse(cleaned) as T
  } catch (err) {
    console.error('[Gemma] JSON Parse Error. Raw:', raw.slice(0, 200))
    throw err
  }
}

export async function gemmaGenerateJson<T>(
  systemPrompt: string,
  userPrompt: string
): Promise<T> {
  const text = await gemmaGenerateText(
    `${systemPrompt}\n\nRespond with valid JSON only. No markdown unless wrapping in a json code fence.`,
    userPrompt,
    { temperature: 0.2 }
  )
  return parseJsonFromModel<T>(text)
}
