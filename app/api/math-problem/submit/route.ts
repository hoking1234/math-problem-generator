import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabaseClient';
import { callGemini } from '../../../../utils/ai-helper'


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
    const AI_PROMPT = `
      Evaluate this Primary 5 math answer.

      Problem: ${session.problem_text}
      Answer: ${user_answer}

      - If correct: praise in 1 sentences.
      - If wrong: explain why and correct reasoning in 3 sentences.
    `;

    const { text } = await callGemini(AI_PROMPT, { thinking: true })

    const feedbackText = text
    ? text
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
    });
  } catch (err: any) {
    console.error('Submit error:', err);
    return NextResponse.json(
      { error: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
