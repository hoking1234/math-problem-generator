'use client';

import React, { useState } from 'react';
import type { MathProblemSession, MathProblemSubmission } from '../types/math';

export default function HomePage() {
  const [session, setSession] = useState<MathProblemSession | null>(null);
  const [answer, setAnswer] = useState('');
  const [loadingGen, setLoadingGen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submission, setSubmission] = useState<MathProblemSubmission | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generateProblem() {
    setError(null);
    setSubmission(null);
    setLoadingGen(true);
    try {
      const res = await fetch('/api/math-problem', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to generate');
      setSession(json.session);
      setAnswer('');
    } catch (err: any) {
      setError(err.message ?? String(err));
    } finally {
      setLoadingGen(false);
    }
  }

  async function submitAnswer(e?: React.FormEvent) {
    e?.preventDefault();
    if (!session) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/math-problem/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: session.id, user_answer: answer }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to submit');
      setSubmission(json.submission);
    } catch (err: any) {
      setError(err.message ?? String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 flex items-start justify-center">
      <div className="w-full max-w-2xl">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">AI Primary 5 Math Practice</h1>
          <p className="text-sm text-slate-600">Generate a Primary 5 style problem, answer, and receive feedback.</p>
        </header>

        <div className="flex gap-3 mb-4">
          <button
            onClick={generateProblem}
            disabled={loadingGen}
            className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {loadingGen ? 'Generating…' : 'Generate New Problem'}
          </button>

          <button
            onClick={() => {
              setSession(null);
              setSubmission(null);
              setAnswer('');
              setError(null);
            }}
            className="px-4 py-2 rounded border"
          >
            Reset
          </button>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-800 rounded">{error}</div>}

        {!session ? (
          <div className="p-6 bg-white rounded shadow text-slate-600">Click "Generate New Problem" to start.</div>
        ) : (
          <div className="bg-white rounded shadow p-4 space-y-4">
            <div className="text-slate-800 whitespace-pre-wrap">{session.problem_text}</div>

            <form onSubmit={submitAnswer} className="flex flex-col gap-3">
              <input
                className="border px-3 py-2 rounded"
                placeholder="Enter numeric answer (e.g. 42 or 3.5)"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                aria-label="answer"
                disabled={submitting}
              />
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded bg-green-600 text-white disabled:opacity-50"
                >
                  {submitting ? 'Submitting…' : 'Submit Answer'}
                </button>

                {submission && (
                  <div className="text-sm">
                    {submission.is_correct ? (
                      <span className="text-green-700 font-medium">Correct ✓</span>
                    ) : (
                      <span className="text-red-700 font-medium">Incorrect ✕</span>
                    )}
                    <div className="text-xs text-slate-500">
                      answered: {submission.user_answer} • {new Date(submission.created_at || '').toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            </form>

            {submission && (
              <div className="mt-3 bg-slate-50 p-3 rounded">
                <h3 className="font-semibold mb-1">Feedback</h3>
                <p className="text-slate-700 whitespace-pre-line">{submission.feedback_text}</p>
                <div className="mt-2 text-xs text-slate-500">
                  Correct answer: <strong>{session.correct_answer}</strong>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
