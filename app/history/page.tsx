'use client';

import React, { useEffect, useState } from 'react';
import type { MathProblemSession, MathProblemSubmission } from '../../types/math';
import Link from 'next/link';

export default function HistoryPage() {
  const [history, setHistory] = useState<MathProblemSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryAnswer, setRetryAnswer] = useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/math-problem/history');
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Failed to fetch history');
        setHistory(json.history);
      } catch (err: any) {
        setError(err.message ?? String(err));
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, []);

  async function retryProblem(sessionId: string) {
    const answer = retryAnswer[sessionId];
    if (!answer) return;

    setSubmitting(prev => ({ ...prev, [sessionId]: true }));

    try {
      const res = await fetch('/api/math-problem/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, user_answer: answer }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to submit');

      // Update the session in history with new submission
      setHistory(prev =>
        prev.map(session =>
          session.id === sessionId
            ? { ...session, math_problem_submissions: [json.submission, ...session.math_problem_submissions] }
            : session
        )
      );
      setRetryAnswer(prev => ({ ...prev, [sessionId]: '' }));
    } catch (err: any) {
      alert(err.message ?? String(err));
    } finally {
      setSubmitting(prev => ({ ...prev, [sessionId]: false }));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-green-50 gap-2">
        <span className="text-gray-700 text-lg font-medium">Loading History</span>
        <svg
          className="animate-spin h-5 w-5 text-gray-700"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          ></path>
        </svg>
      </div>
    );
  }
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">Math Problem History</h1>
        <div className="mb-6 flex justify-start">
                <Link
                  href="/"
                  className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 ease-in-out"
                >
                  Home
                </Link>
              </div>

        {history.length === 0 && <p className="text-center text-gray-600">No problems yet. Try generating some!</p>}

        {history.map(session => (
          <div key={session.id} className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-2 text-gray-700">{session.problem_text}</h2>
            <p className="text-sm text-gray-500 mb-4">Created at: {new Date(session.created_at).toLocaleString()}</p>

            {session.math_problem_submissions?.map(sub => (
              <div key={sub.id} className="border-t border-gray-200 pt-2 mt-2">
                <p className="text-gray-800">
                  Your answer: {sub.user_answer} — {sub.is_correct ? '✅ Correct' : '❌ Incorrect'}
                </p>
                <p className="text-gray-700 whitespace-pre-line">{sub.feedback_text}</p>
                <p className="text-xs text-gray-400">Submitted: {new Date(sub.created_at).toLocaleString()}</p>
              </div>
            ))}

            {/* Retry input + button */}
            <form className="mt-4 flex gap-3">
              <input
                type="number"
                value={retryAnswer[session.id] ?? ''}
                onChange={e => setRetryAnswer(prev => ({ ...prev, [session.id]: e.target.value }))}
                placeholder="Retry answer"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-100"
                disabled={submitting[session.id]}
              />
              <button
                type="button"
                onClick={() => retryProblem(session.id)}
                disabled={!retryAnswer[session.id] || submitting[session.id]}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition duration-200 ease-in-out transform hover:scale-105"
              >
                {submitting[session.id] ? 'Submitting…' : 'Retry'}
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
