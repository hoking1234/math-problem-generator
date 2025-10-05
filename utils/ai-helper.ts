import { GoogleGenAI } from '@google/genai'

const GEMINI_API_KEY = process.env.GOOGLE_API_KEY
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

if (!GEMINI_API_KEY) {
  throw new Error('Missing GOOGLE_API_KEY environment variable')
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })

type CallGeminiOptions = {
  expectJson?: boolean
  thinking?: boolean
  retries?: number
}

export async function callGemini(
  prompt: string,
  { expectJson = false, thinking=false, retries = 2 }: CallGeminiOptions = {}
) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const result = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: thinking
      ? {
          thinkingConfig: {
            thinkingBudget: 1,
          },
        }
      : {
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
    })

    const text = result.text?.trim()
    if (!text) {
      console.warn(`Attempt ${attempt}: Empty response from Gemini.`)
      continue
    }

    if (expectJson) {
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) {
        console.warn(`Attempt ${attempt}: No valid JSON found.`)
        continue
      }
      try {
        return { parsed: JSON.parse(match[0]), text }
      } catch (err) {
        console.warn(`Attempt ${attempt}: JSON parse error`, err)
        continue
      }
    } else {
      return { text }
    }
  }

  throw new Error('Gemini failed to produce a valid response after retries')
}
