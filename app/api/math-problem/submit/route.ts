// app/api/math-problem/submit/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabaseClient';

const GEMINI_API_KEY = process.env.GOOGLE_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

if (!GEMINI_API_KEY) {
  throw new Error('Missing GOOGLE_API_KEY environment variable');
}

/**
 * POST /api/math-problem/submit
 * Expected JSON body:
 * {
 *   "session_id": "uuid",
 *   "user_answer": 42
 * }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { session_id, user_answer } = body;

    if (!session_id || user_answer === undefined) {
      return NextResponse.json(
        { error: 'Missing session_id or user_answer' },
        { status: 400 }
      );
    }

    // === 1. Fetch the corresponding problem ===
    const { data: session, error: fetchError } = await supabase
      .from('math_problem_sessions')
      .select('*')
      .eq('id', session_id)
      .single();

    if (fetchError || !session) {
      console.error('Session fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Problem session not found' },
        { status: 404 }
      );
    }

    const correctAnswer = Number(session.correct_answer);
    const isCorrect = Number(user_answer) === correctAnswer;

    // === 2. Generate personalized feedback via Gemini ===
    const feedbackPrompt = `
You are an encouraging Primary 5 Math tutor.
Given:
- Problem: ${session.problem_text}
- Correct answer: ${correctAnswer}
- Student's answer: ${user_answer}
- Result: ${isCorrect ? 'Correct' : 'Incorrect'}

Write **a short, friendly, personalized feedback (1–3 sentences)** that:
- Encourages the student
- Explains (simply) if they made a mistake
- If correct, praises their reasoning

Return only plain text (no JSON).
`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      GEMINI_MODEL
    )}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

    const aiResp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: feedbackPrompt }],
          },
        ],
      }),
    });

    const aiJson = await aiResp.json();
    const feedbackText =
      aiJson?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      'Good effort! Keep practicing to improve your math skills.';

    // === 3. Save submission to Supabase ===
    const { data: submission, error: insertError } = await supabase
      .from('math_problem_submissions')
      .insert({
        session_id,
        user_answer: Number(user_answer),
        is_correct: isCorrect,
        feedback_text: feedbackText,
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('Supabase insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to save submission' },
        { status: 500 }
      );
    }

    // === 4. Return result ===
    return NextResponse.json({
      submission,
      feedback: feedbackText,
      is_correct: isCorrect,
    });
  } catch (err: any) {
    console.error('Submit error:', err);
    return NextResponse.json(
      { error: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
