import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabaseClient';
import { GoogleGenAI } from '@google/genai'

const GEMINI_API_KEY = process.env.GOOGLE_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

if (!GEMINI_API_KEY) {
  throw new Error('Missing GOOGLE_API_KEY environment variable');
}

const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
})

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
- Answer: ${user_answer}
- Result: ${isCorrect ? 'Correct' : 'Incorrect'}

Write **a short, friendly, personalized feedback (1 to 3 sentences)** that:
- Encourages the student
- Explains (simply) if they made a mistake
- If correct, praises their reasoning

Return only plain text (no JSON).
`;

    const result = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: feedbackPrompt,
    })
    const aiFeedback = result.text
    console.log(aiFeedback)

    const feedbackText = aiFeedback
    ? aiFeedback
    : isCorrect
    ? 'Well done! You got the correct answer.'
    : 'Wrong answer. Review your calculations and try again!';

    
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
