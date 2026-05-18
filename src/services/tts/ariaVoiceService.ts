/**
 * ariaVoiceService.ts — single-voice playback (Gemini TTS OR Web Speech, never both).
 *
 * Priority:
 *   1. Gemini TTS (gemini-2.5-flash-preview-tts) — high quality
 *   2. Web Speech API fallback — female voice, fires ONLY if Gemini fails
 *
 * Mutual exclusion: a shared `speechGeneration` counter aborts stale requests.
 * Both engines check the generation before/after async ops.
 */

const TTS_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.5-flash-preview-tts',
  'gemini-2.0-flash-exp',
]

let speechGeneration = 0
let activeAudioContext: AudioContext | null = null
let activeSource: AudioBufferSourceNode | null = null
let activeUtterance: SpeechSynthesisUtterance | null = null
let geminiPlaying = false  // mutual-exclusion flag

export const cancelAriaSpeech = (): void => {
  speechGeneration += 1
  geminiPlaying = false

  if (activeSource) {
    try { activeSource.stop() } catch { /* already stopped */ }
    activeSource = null
  }
  if (activeAudioContext) {
    activeAudioContext.close().catch(() => {})
    activeAudioContext = null
  }
  if (activeUtterance) {
    activeUtterance.onend = null
    activeUtterance.onerror = null
    activeUtterance = null
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
}

export const speakAsARIA = async (
  text: string,
  onStart?: () => void,
  onEnd?: () => void,
  lang?: string  // BCP-47 language tag hint for Web Speech fallback (e.g. 'ta-IN', 'hi-IN')
): Promise<void> => {
  const gen = speechGeneration + 1
  speechGeneration = gen
  cancelAriaSpeech()
  speechGeneration = gen   // restore after cancel incremented it

  // Sanitise text
  let sanitized = text.trim()
    .replace(/[*_#\[\]()<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!sanitized) { onEnd?.(); return }

  // Try Gemini TTS first (Aoede is natively multilingual)
  const geminiOk = await tryGeminiTTS(sanitized, onStart, onEnd, gen, lang)
  if (gen !== speechGeneration) return   // cancelled while awaiting

  if (!geminiOk) {
    // Gemini failed — fall back to Web Speech with female voice
    console.warn('[ARIA] Gemini TTS unavailable, using Web Speech API fallback.')
    await tryWebSpeechFallback(sanitized, onStart, onEnd, gen, lang)
  }
}

// ─── Gemini TTS ───────────────────────────────────────────────────────────────

const tryGeminiTTS = async (
  text: string,
  onStart?: () => void,
  onEnd?: () => void,
  gen?: number,
  lang?: string,
  modelIndex = 0
): Promise<boolean> => {
  if (gen !== undefined && gen !== speechGeneration) return false

  const apiKey = import.meta.env.VITE_GOOGLE_AI_API_KEY

  // ── Language-aware voice + model routing ──────────────────────────────────
  // Tamil and Hindi use gemini-2.0-flash which has superior Indic phoneme
  // rendering and perfect native accents. English uses gemini-2.5-flash.
  const isTamil = lang?.startsWith('ta')
  const isHindi = lang?.startsWith('hi')
  const isIndic = isTamil || isHindi

  // Aoede is a premium female voice that natively supports excellent
  // multilingual pronunciation and code-switching across English, Tamil, and Hindi.
  const voiceName = 'Aoede'
  const models = isIndic
    ? ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-preview-tts']
    : ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash-preview-tts']

  if (!apiKey || modelIndex >= models.length) return false

  const modelName = models[modelIndex]
  console.info(`[ARIA TTS] model=${modelName} voice=${voiceName} lang=${lang || 'en-US'}`)

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  // Speak the text directly — Aoede auto-detects language (Tamil, Hindi, English, etc.)
                  // Do NOT add English prefixes like "TTS_INPUT:" as they confuse non-English output
                  text: text,
                },
              ],
            },
          ],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName },
              },
            },
          },
        }),
      }
    )

    if (!response.ok) {
      const errText = await response.text().catch(() => response.status.toString())
      console.warn(`[ARIA TTS] Model ${modelName} returned ${response.status}: ${errText.slice(0, 120)}`)
      return tryGeminiTTS(text, onStart, onEnd, gen, lang, modelIndex + 1)
    }

    const data = await response.json()
    const parts = data.candidates?.[0]?.content?.parts || []
    const audioPart = parts.find(
      (p: { inlineData?: { data?: string; mimeType?: string } }) => p.inlineData?.data
    )
    const audioData: string | undefined = audioPart?.inlineData?.data
    const mimeType: string = audioPart?.inlineData?.mimeType || 'audio/wav'

    if (!audioData) {
      console.warn(`[ARIA TTS] Model ${modelName}: no audio data in response.`, data)
      return tryGeminiTTS(text, onStart, onEnd, gen, lang, modelIndex + 1)
    }

    if (gen !== undefined && gen !== speechGeneration) return false

    // Decode base64 audio
    const binaryStr = atob(audioData)
    const bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i)
    }

    // Determine if we need to add a WAV header (PCM-only response)
    const isPcm = mimeType.includes('pcm') || mimeType.includes('l16') || mimeType === 'audio/wav'
    const audioBuffer = isPcm ? addWAVHeader(bytes, 24000, 1, 16) : bytes.buffer

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const audioContext = new AudioCtx()

    let decodedBuffer: AudioBuffer
    try {
      decodedBuffer = await audioContext.decodeAudioData(audioBuffer.slice(0))
    } catch (decodeErr) {
      console.warn('[ARIA TTS] Decode failed, trying WAV wrap:', decodeErr)
      // If decode failed and we didn't wrap, try wrapping
      if (!isPcm) {
        try {
          const wrapped = addWAVHeader(bytes, 24000, 1, 16)
          decodedBuffer = await audioContext.decodeAudioData(wrapped.slice(0))
        } catch {
          audioContext.close().catch(() => {})
          return tryGeminiTTS(text, onStart, onEnd, gen, lang, modelIndex + 1)
        }
      } else {
        audioContext.close().catch(() => {})
        return tryGeminiTTS(text, onStart, onEnd, gen, lang, modelIndex + 1)
      }
    }

    if (gen !== undefined && gen !== speechGeneration) {
      audioContext.close().catch(() => {})
      return false
    }

    activeAudioContext = audioContext
    const source = audioContext.createBufferSource()
    activeSource = source
    source.buffer = decodedBuffer
    source.connect(audioContext.destination)

    return new Promise<boolean>((resolve) => {
      source.onended = () => {
        geminiPlaying = false
        if (gen === undefined || gen === speechGeneration) {
          onEnd?.()
        }
        activeSource = null
        audioContext.close().catch(() => {})
        if (activeAudioContext === audioContext) activeAudioContext = null
        resolve(true)
      }
      try {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel() // Strict mutual exclusion
        }
        geminiPlaying = true
        source.start(0)
        onStart?.()
        // Don't resolve(true) here — wait for onended
      } catch (startErr) {
        console.error('[ARIA TTS] Source start failed:', startErr)
        geminiPlaying = false
        resolve(false)
      }
    })
  } catch (err) {
    console.warn(`[ARIA TTS] Model ${modelName} exception:`, err)
    return tryGeminiTTS(text, onStart, onEnd, gen, lang, modelIndex + 1)
  }
}

// ─── Web Speech API Fallback (female voice) ───────────────────────────────────

const tryWebSpeechFallback = (
  text: string,
  onStart?: () => void,
  onEnd?: () => void,
  gen?: number,
  lang?: string  // BCP-47 language hint
): Promise<void> => {
  return new Promise((resolve) => {
    if (gen !== undefined && gen !== speechGeneration) { resolve(); return }
    if (geminiPlaying) { resolve(); return }  // Gemini started — do not overlap

    const synth = window.speechSynthesis
    if (!synth) { onEnd?.(); resolve(); return }

    synth.cancel()  // clear any previous



    const utter = new SpeechSynthesisUtterance(text)
    utter.rate = 0.95
    utter.pitch = 1.1  // slightly higher pitch for female voice
    if (lang) utter.lang = lang  // set language for correct pronunciation

    const doSpeak = () => {
      if (gen !== undefined && gen !== speechGeneration) { resolve(); return }
      if (geminiPlaying) { resolve(); return }

      const voices = synth.getVoices()

      // Pre-filter voices to strictly enforce female voices.
      const isFemaleVoice = (v: SpeechSynthesisVoice) => {
        const lowerName = v.name.toLowerCase()
        // Exclude known male names and keywords (unless it's 'female')
        if (lowerName.includes('male') && !lowerName.includes('female')) return false
        if (['boy', 'man', 'david', 'mark', 'ravi', 'james', 'john', 'brian', 'george', 'arthur'].some(n => lowerName.includes(n))) return false
        return true
      }

      const femaleVoices = voices.filter(isFemaleVoice)
      const usableVoices = femaleVoices.length > 0 ? femaleVoices : voices

      // Try to find a voice for the requested language first
      let voice: SpeechSynthesisVoice | null = null
      if (lang) {
        const langBase = lang.split('-')[0]
        // Known good female voice names for Indic languages
        const indicFemaleHints = ['lekha', 'veena', 'trinoids', 'female', 'aditi', 'pallavi', 'kanya']
        voice =
          // 1. Exact lang + female-sounding name
          usableVoices.find((v) => v.lang === lang && indicFemaleHints.some((h) => v.name.toLowerCase().includes(h))) ||
          // 2. Base lang match + female-sounding name
          usableVoices.find((v) => v.lang.startsWith(langBase) && indicFemaleHints.some((h) => v.name.toLowerCase().includes(h))) ||
          // 3. Any female voice for the exact locale
          usableVoices.find((v) => v.lang === lang) ||
          // 4. Any female voice for the base language
          usableVoices.find((v) => v.lang.startsWith(langBase)) ||
          null
      }

      // Fall back to preferred female English voices
      if (!voice) {
        const preferredNames = [
          'Google UK English Female',
          'Samantha',
          'Victoria',
          'Karen',
          'Moira',
          'Tessa',
          'Zira',
          'Google US English' // often defaults to female on Android/Chrome, but we already filtered known males
        ]
        for (const name of preferredNames) {
          const v = usableVoices.find((v) => v.name.includes(name))
          if (v) { voice = v; break }
        }
      }

      // Last resort: any female-sounding voice or first available female voice
      if (!voice) {
        voice = usableVoices.find((v) => v.name.toLowerCase().includes('female')) ||
                usableVoices.find((v) => v.lang.startsWith('en')) ||
                usableVoices[0] || 
                null
      }

      if (voice) utter.voice = voice

      activeUtterance = utter

      utter.onstart = () => {
        if (gen !== undefined && gen !== speechGeneration) {
          synth.cancel()
          resolve()
          return
        }
        onStart?.()
      }

      utter.onend = () => {
        activeUtterance = null
        if (gen === undefined || gen === speechGeneration) onEnd?.()
        resolve()
      }

      utter.onerror = (e) => {
        console.warn('[ARIA WebSpeech] Error:', e.error)
        activeUtterance = null
        onEnd?.()
        resolve()
      }

      synth.speak(utter)
    }

    // Voices may not be loaded yet
    if (synth.getVoices().length > 0) {
      doSpeak()
    } else {
      synth.onvoiceschanged = () => {
        synth.onvoiceschanged = null
        doSpeak()
      }
    }
  })
}

// ─── WAV Header Builder ───────────────────────────────────────────────────────

const addWAVHeader = (
  pcmData: Uint8Array,
  sampleRate: number,
  channels: number,
  bitDepth: number
): ArrayBuffer => {
  const header = new ArrayBuffer(44)
  const view = new DataView(header)
  const dataLength = pcmData.length

  view.setUint32(0, 0x52494646, false)
  view.setUint32(4, 36 + dataLength, true)
  view.setUint32(8, 0x57415645, false)
  view.setUint32(12, 0x666d7420, false)
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, channels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, (sampleRate * channels * bitDepth) / 8, true)
  view.setUint16(32, (channels * bitDepth) / 8, true)
  view.setUint16(34, bitDepth, true)
  view.setUint32(36, 0x64617461, false)
  view.setUint32(40, dataLength, true)

  const wav = new Uint8Array(44 + dataLength)
  wav.set(new Uint8Array(header))
  wav.set(pcmData, 44)
  return wav.buffer
}
