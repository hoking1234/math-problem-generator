export interface MathProblemSession {
  id: string;
  problem_text: string;
  correct_answer: number;
  difficulty?: string | null;
  created_at?: string | null;
}

export interface MathProblemSubmission {
  id: string;
  session_id: string;
  user_answer: string;
  is_correct?: boolean | null;
  feedback_text?: string | null;
  created_at?: string | null;
}
