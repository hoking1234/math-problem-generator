import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { supabase } from '../../../lib/supabaseClient'

const GEMINI_API_KEY = process.env.GOOGLE_API_KEY
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

if (!GEMINI_API_KEY) {
  throw new Error('Missing GOOGLE_API_KEY environment variable')
}

const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
})

const AI_PROMPT = `
You are an AI that MUST return EXACTLY one JSON object and nothing else.
Create ONE Primary 5 (Singapore syllabus) math word problem appropriate for a Primary 5 student.
Return a JSON object with keys:
- problem_text (string): the short word problem (1-2 sentences)
- final_answer (number): the numeric final answer (single number, no units)
Example:
{"problem_text":"A bakery sold 45 cupcakes...","final_answer":15}
Do NOT include explanations or extra text, only the JSON object.
`

export async function POST() {
  try {
    // === 1. Call Gemini API ===
    const result = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: AI_PROMPT,
    })
    const text = result.text
    if (!text) {
      console.error('Empty AI response:', result)
      return NextResponse.json({ error: 'Empty response from Gemini' }, { status: 500 })
    }

    // === 2. Extract JSON object ===
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) {
      console.error('AI raw response:', text)
      return NextResponse.json({ error: 'AI did not return valid JSON' }, { status: 500 })
    }

    const parsed = JSON.parse(match[0])
    if (!parsed.problem_text || parsed.final_answer === undefined) {
      return NextResponse.json({ error: 'AI JSON missing required keys' }, { status: 500 })
    }

    const finalAnswer = Number(parsed.final_answer)
    if (Number.isNaN(finalAnswer)) {
      return NextResponse.json({ error: 'final_answer must be numeric' }, { status: 500 })
    }

    // === 3. Save to Supabase ===
    const { data, error } = await supabase
      .from('math_problem_sessions')
      .insert({
        problem_text: parsed.problem_text,
        correct_answer: finalAnswer,
      })
      .select('*')
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ error: 'Failed to save to database' }, { status: 500 })
    }

    // === 4. Return result ===
    return NextResponse.json({ session: data })
  } catch (err: any) {
    console.error('Error generating math problem:', err)
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 })
  }
}
