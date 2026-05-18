/**
 * gemmaClient.ts
 *
 * Gemma 4 API wrapper for ReliefLens.
 * Handles multimodal requests (image + text), function calling,
 * and RAG context injection.
 *
 * All API calls fail gracefully — network errors are caught and returned
 * as typed error results, never thrown to the UI layer.
 */

import { GEMMA_CONFIG } from '@/config/gemma.config'
import type {
  GemmaMessage,
  GemmaRequest,
  GemmaRawResponse,
  GemmaEnrichmentResult,
  ExtractedIncidentData,
  FunctionCallResult,
} from '@/types/ai.types'
import type { DraftIncident } from '@/types/incident.types'
import { RELIEFLENS_ENRICH_PROMPT, ARIA_TRIAGE_PROMPT, buildAnalysisPrompt } from './gemmaPrompts'
import { EXTRACT_INCIDENT_SCHEMA } from './functionSchemas'
import { extractBase64Data, getMimeTypeFromDataUri } from '@/utils/imageUtils'
import { createLogger } from '@/utils/logger'
import { backendApi } from '@/services/api/backendClient'

// ─── Speech Filter ────────────────────────────────────────────────────────────

/**
 * Extract ONLY the spoken portion of ARIA's response.
 * Layer A (internal/silent): everything before SPEAKING:
 * Layer B (spoken via TTS): the SPEAKING: block
 *
 * If no SPEAKING: block exists, strip all known reasoning artefacts
 * and return whatever clean text remains, or a safe default.
 */
export function extractSpeechOnly(text: string): string {
  if (!text) return ''

  // 1. Prefer explicit SPEAKING: block
  const speakingMatch = text.match(/SPEAKING:\s*([\s\S]*?)(?:$|(?=\nTHINKING:))/i)
  if (speakingMatch?.[1]?.trim()) {
    return cleanSpeechText(speakingMatch[1].trim())
  }

  // 2. Strip THINKING: block entirely, then take the rest
  const withoutThinking = text
    .replace(/THINKING:[\s\S]*?(?=SPEAKING:|$)/i, '')
    .replace(/SPEAKING:/i, '')
    .trim()

  if (withoutThinking) {
    // 3. Strip known reasoning artefacts from whatever remains
    const stripped = withoutThinking
      .replace(/^(Step \d+:|Plan:|Let me|I need to|Processing|Analyzing|The user|According to|Incident type:|Hazards:|Confidence:|incident_type|severity|urgency_flags)[\s\S]*?(\.|\?|!)\s*/gim, '')
      .replace(/\{[\s\S]*?\}/g, '')   // remove JSON blobs
      .replace(/\[[\s\S]*?\]/g, '')    // remove JSON arrays
      .replace(/[*_#`]/g, '')          // remove markdown
      .replace(/\s+/g, ' ')
      .trim()

    if (stripped.length > 10) return cleanSpeechText(stripped)
  }

  // 4. Safe default — should rarely be hit
  return 'Stay calm. Help is on the way. Please use the Super Critical button on your dashboard if needed.'
}

/**
 * Split a speech string into the four required ARIA parts.
 * Returns object with keys: reassurance, action, advice, instruction.
 * If the model provides fewer than four sentences, sensible defaults are used.
 */
export function splitIntoFourParts(speech: string): { reassurance: string; action: string; advice: string; instruction: string } {
  const defaults = {
    reassurance: 'Calm down, I am here to help you.',
    action: 'I am notifying the rescue teams in your area and preparing your report immediately.',
    advice: 'Do not enter the water yourself. Try to reach for a floating object to throw to those in danger.',
    instruction: 'Use the Super Critical Report button in your dashboard for immediate escalation.'
  }

  if (!speech || !speech.trim()) return defaults

  // Split into sentences (simple heuristic)
  const sentences = speech
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean)

  const parts = [defaults.reassurance, defaults.action, defaults.advice, defaults.instruction]

  for (let i = 0; i < Math.min(4, sentences.length); i++) {
    parts[i] = sentences[i]
  }

  return {
    reassurance: parts[0],
    action: parts[1],
    advice: parts[2],
    instruction: parts[3],
  }
}

function cleanSpeechText(text: string): string {
  let cleaned = text
    .replace(/[*_#`\[\]{}()<>]/g, ' ')  // remove special chars
    // Remove titles like "1. Reassurance:" or "Reassurance:" or "- Action:"
    .replace(/(?:^\s*|\.\s+)(?:\d+\.\s*)?(?:Reassurance|Action|Advice|Instruction)\s*:/gi, '. ')
    // Remove standalone leading serial numbers (1. 2. 3. 4.) at start of lines/sentences
    .replace(/(?:^\s*|\n\s*|\.\s+)\d+\.\s+/g, '. ')
    .replace(/\s+/g, ' ')
    .trim()
    
  // Clean up any leading dot from replacement
  cleaned = cleaned.replace(/^\.\s*/, '')
  return cleaned
}

const logger = createLogger('gemmaClient')

// ─── API Endpoint ─────────────────────────────────────────────────────────────

function buildEndpointUrl(): string {
  const { endpoint, model, apiKey } = GEMMA_CONFIG
  return `${endpoint}/models/${model}:generateContent?key=${apiKey}`
}

// ─── Request Builder ──────────────────────────────────────────────────────────

/**
 * Build a Gemma API request from draft incident data + optional RAG context.
 * Composes a multimodal user message: image (if any) + text prompt.
 */
function buildRequest(draft: DraftIncident, ragContext?: string): GemmaRequest {
  const textContent = [draft.voiceTranscript, draft.textInput].filter(Boolean).join('\n')
  const prompt = buildAnalysisPrompt(textContent || 'No text input provided', ragContext)

  const userParts: GemmaRequest['contents'][0]['parts'] = []

  // Attach image if available
  if (draft.photoBase64) {
    userParts.push({
      inline_data: {
        mime_type: getMimeTypeFromDataUri(draft.photoBase64),
        data: extractBase64Data(draft.photoBase64),
      },
    })
  }

  // Always include text prompt
  userParts.push({ text: prompt })

  return {
    contents: [{ role: 'user', parts: userParts }],
    tools: [EXTRACT_INCIDENT_SCHEMA],
    systemInstruction: {
      parts: [{ text: RELIEFLENS_ENRICH_PROMPT }],
    },
    generationConfig: {
      temperature: GEMMA_CONFIG.temperature,
      topP: GEMMA_CONFIG.topP,
      maxOutputTokens: GEMMA_CONFIG.maxOutputTokens,
    },
  }
}

// ─── Response Parser ──────────────────────────────────────────────────────────

/**
 * Parse the raw Gemma API response and extract the function call arguments.
 * Returns a typed FunctionCallResult — never throws.
 */
function parseResponse(raw: GemmaRawResponse): FunctionCallResult<ExtractedIncidentData> {
  const candidate = raw.candidates?.[0]
  if (!candidate) {
    return { success: false, error: 'No candidates in Gemma response' }
  }

  if (candidate.finishReason === 'SAFETY') {
    return { success: false, error: 'Response blocked by safety filters' }
  }

  // Look for a function call part in the response
  const functionCallPart = candidate.content.parts.find(p => p.functionCall)
  if (!functionCallPart?.functionCall) {
    const textPart = candidate.content.parts.find(p => p.text)
    logger.warn('Gemma responded with text instead of function call:', textPart?.text)
    return { success: false, error: 'Gemma did not return a function call — check system prompt' }
  }

  const { name, args } = functionCallPart.functionCall
  if (name !== 'extract_incident_data') {
    return { success: false, error: `Unexpected function call: ${name}` }
  }

  // Validate required fields
  if (!args.severity || args.confidence === undefined || !args.what) {
    return {
      success: false,
      rawArgs: args,
      error: 'Function call missing required fields: severity, confidence, or what',
    }
  }

  return {
    success: true,
    data: args as unknown as ExtractedIncidentData,
    rawArgs: args,
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Send a draft incident to Gemma for AI enrichment.
 * Returns extracted structured data with timing and token usage.
 *
 * @throws Never — all errors are returned in the result object
 */
export async function enrichIncident(
  draft: DraftIncident,
  ragContext?: string
): Promise<{ success: true; result: GemmaEnrichmentResult } | { success: false; error: string }> {
  if (!GEMMA_CONFIG.apiKey) {
    return { success: false, error: 'Google AI API key not configured. Check VITE_GOOGLE_AI_API_KEY in .env.local' }
  }

  const startTime = Date.now()
  const request = buildRequest(draft, ragContext)

  logger.info('Sending incident to Gemma for enrichment...')

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), GEMMA_CONFIG.timeoutMs)

    const response = await fetch(buildEndpointUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      logger.error('Gemma API error:', response.status, errorText)
      return { success: false, error: `Gemma API returned ${response.status}: ${errorText.slice(0, 200)}` }
    }

    const raw: GemmaRawResponse = await response.json()
    const parsed = parseResponse(raw)

    if (!parsed.success || !parsed.data) {
      return { success: false, error: parsed.error ?? 'Failed to parse Gemma response' }
    }

    const latencyMs = Date.now() - startTime
    logger.info(`Gemma enrichment complete in ${latencyMs}ms`)

    return {
      success: true,
      result: {
        extracted: parsed.data,
        tokenUsage: raw.usageMetadata
          ? {
              prompt: raw.usageMetadata.promptTokenCount,
              completion: raw.usageMetadata.candidatesTokenCount,
              total: raw.usageMetadata.totalTokenCount,
            }
          : undefined,
        latencyMs,
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    logger.error('Gemma client error:', message)
    return { success: false, error: `Network error: ${message}` }
  }
}

/**
 * Perform a conversational turn with Gemma.
 * Supports multi-turn history and optional image/location context.
 */
export async function chatWithGemma(
  messages: GemmaMessage[],
  userLocation?: { lat: number, lng: number, address?: string, region?: string, countryCode?: string } | null
): Promise<{ success: true; text?: string; extracted?: ExtractedIncidentData } | { success: false; error: string }> {
  if (!GEMMA_CONFIG.apiKey) {
    return { success: false, error: 'API key not configured' }
  }

  // Inject location context if this is the first message
  let processedMessages = [...messages]
  if (userLocation && messages.length === 1 && messages[0].role === 'user') {
    const locStr = `USER_LOCATION: Lat ${userLocation.lat}, Lng ${userLocation.lng}${userLocation.address ? `, Address: ${userLocation.address}` : ''}`
    
    // Fetch contacts for the region to inject as context
    let contactsContext = ''
    try {
      const contactsRes = await backendApi.getContacts(userLocation.region || userLocation.address || '', userLocation.countryCode)
      if (contactsRes.contacts.length > 0) {
        contactsContext = `\n[LOCAL EMERGENCY CONTACTS: ${JSON.stringify(contactsRes.contacts.slice(0, 5))}]`
      }
    } catch (err) {
      console.warn('Failed to fetch contacts for ARIA context:', err)
    }

    processedMessages[0].parts.push({ text: `\n\n[SYSTEM CONTEXT: ${locStr}${contactsContext}]` })
  }

  const request: GemmaRequest = {
    contents: processedMessages,
    tools: [EXTRACT_INCIDENT_SCHEMA],
    systemInstruction: {
      parts: [{ text: ARIA_TRIAGE_PROMPT }],
    },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
    },
  }

  try {
    const response = await fetch(buildEndpointUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const errBody = await response.text()
      return { success: false, error: `API Error ${response.status}: ${errBody.slice(0, 120)}` }
    }

    const raw: GemmaRawResponse = await response.json()
    const candidate = raw.candidates?.[0]
    if (!candidate) return { success: false, error: 'No response from AI' }

    const textPart = candidate.content.parts.find((p) => p.text)
    const rawText = textPart?.text?.trim() || ''

    const functionCallPart = candidate.content.parts.find((p) => p.functionCall)
    if (functionCallPart?.functionCall?.name === 'extract_incident_data') {
      const extracted = functionCallPart.functionCall.args as unknown as ExtractedIncidentData
      const rawSpeech = (extracted as any).speech_response || rawText || 'Stay calm. I have logged your incident and alerted response teams near you. Help is on the way.'
      
      // Always filter through extractSpeechOnly just in case
      const spokenText = extractSpeechOnly(rawSpeech)
      const speechParts = splitIntoFourParts(spokenText)
      
      return { success: true, extracted, text: spokenText, rawModelText: rawText || JSON.stringify(extracted), speechParts }
    }

    if (rawText) {
      // Always filter through extractSpeechOnly — never pass raw model output to TTS
      const spokenText = extractSpeechOnly(rawText)
      const speechParts = splitIntoFourParts(spokenText)
      return { success: true, text: spokenText, rawModelText: rawText, speechParts }
    }

    return {
      success: true,
      text: 'Stay calm. What type of emergency are you facing, and roughly how many people need help?',
      rawModelText: '',
      speechParts: splitIntoFourParts('')
    }

  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
