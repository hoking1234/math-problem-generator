import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabaseClient'
import { callGemini } from '../../../utils/ai-helper'
import { syllabus } from '../../../data/syllabus';


export async function POST(req: Request) {
  try {
    const { subStrand, difficulty } = await req.json();

    const topics = syllabus.find(s => s.subStrand === subStrand)?.topics ?? [];
    const topic =
      topics.length > 0
        ? topics[Math.floor(Math.random() * topics.length)]
        : "General math question";

    const AI_PROMPT = `
      Return ONLY a valid JSON object, no explanations, no extra text.
      Task: Create 1 Primary 5 Singapore Math word problem.

      Requirements:
      - Difficulty: ${difficulty ?? 'medium'}
      - Sub-strand: ${subStrand ?? 'any'}
      - Topic: "${topic}"
      - Question must be in 1 to 4 sentences and answerable with a single numeric value.

      JSON format:
      {
        "problem_text": "string (the math problem)",
        "correct_answer": number (numeric final answer only)
      }

      Example:
      {"problem_text": "A bakery sold 45 cupcakes equally in 3 boxes. How many in each box?", "correct_answer": 15}

    `
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
