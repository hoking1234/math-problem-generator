export interface MathProblemSession {
  id: string;
  problem_text: string;
  final_answer: number;
  difficulty?: string | null;
  created_at?: string | null;
}

export interface MathProblemSubmission {
  id: string;
  session_id: string;
  user_answer: string;
  user_answer_numeric?: number | null;
  is_correct?: boolean | null;
  feedback?: string | null;
  created_at?: string | null;
}
