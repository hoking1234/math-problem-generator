import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabaseClient'
import { callGemini } from '../../../utils/ai-helper'


const AI_PROMPT = `
You are an AI that MUST return EXACTLY one JSON object and nothing else.
Create ONE Primary 5 (Singapore syllabus) math word problem appropriate for a Primary 5 student.
Return a JSON object with keys:
- problem_text (string): the short word problem (1-2 sentences)
- correct_answer (number): the numeric final answer (single number, no units)
Example:
{"problem_text":"A bakery sold 45 cupcakes...","correct_answer":15}
`

export async function POST() {
  try {
    // === 1. Call Gemini API ===
    const { parsed } = await callGemini(AI_PROMPT, { expectJson: true })

    // === 2. Extract JSON object ===
    if (!parsed.problem_text || parsed.correct_answer === undefined) {
      return NextResponse.json({ error: 'AI JSON missing required keys' }, { status: 500 })
    }
    const correctAnswer = Number(parsed.correct_answer)
    if (Number.isNaN(correctAnswer)) {
      return NextResponse.json({ error: 'Answer returned is not numeric' }, { status: 500 })
    }

    // === 3. Save to Supabase ===
    const { data, error } = await supabase
      .from('math_problem_sessions')
      .insert({
        problem_text: parsed.problem_text,
        correct_answer: correctAnswer,
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
