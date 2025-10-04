import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabaseClient';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('math_problem_sessions')
      .select(`
        id,
        problem_text,
        correct_answer,
        created_at,
        math_problem_submissions (
          id,
          user_answer,
          is_correct,
          feedback_text,
          created_at
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ history: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? String(err) }, { status: 500 });
  }
}
