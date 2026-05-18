import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../.env.local') })

export const SERVER_CONFIG = {
  port: Number(process.env.PORT || 3001),
  mongoUri: process.env.MONGODB_URI || process.env.VITE_MONGODB_URI || '',
  dbName: process.env.MONGODB_DB || process.env.VITE_MONGODB_DB || 'relieflens',
  googleApiKey: process.env.GOOGLE_AI_API_KEY || process.env.VITE_GOOGLE_AI_API_KEY || '',
  gemmaModel: process.env.GEMMA_MODEL || process.env.VITE_GEMMA_MODEL || 'gemma-4-31b-it',
  gemmaEndpoint:
    process.env.GEMMA_API_ENDPOINT ||
    process.env.VITE_GEMMA_API_ENDPOINT ||
    'https://generativelanguage.googleapis.com/v1beta',
  ttsModel: process.env.TTS_MODEL || 'gemini-2.5-flash-preview-tts',
  ariaVoice: process.env.ARIA_VOICE_NAME || process.env.VITE_ARIA_VOICE_NAME || 'Aoede',
  gmailUser:
    process.env.GMAIL_USER ||
    process.env.GMAIL_EMAIL ||
    process.env.VITE_GMAIL_USER ||
    '',
  /** Google App Password — spaces are stripped (Gmail copy-paste often includes them). */
  gmailAppPassword: (
    process.env.GMAIL_APP_PASSWORD ||
    process.env.GOOGLE_APP_PASSWORD ||
    ''
  ).replace(/\s/g, ''),
}
