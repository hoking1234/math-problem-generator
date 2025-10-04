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
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <main className="container mx-auto px-4 py-10 max-w-2xl">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
          AI Primary 5 Math Practice
        </h1>

        {/* Generate button */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <button
            onClick={generateProblem}
            disabled={loadingGen}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition duration-200 ease-in-out transform hover:scale-105"
          >
            {loadingGen ? 'Generating...' : 'Generate New Problem'}
          </button>
        </div>

        {/* Error box */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 text-red-700 p-4 mb-6 rounded">
            {error}
          </div>
        )}

        {/* Problem + Answer form */}
        {session && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Problem:</h2>
            <p className="text-lg text-gray-800 leading-relaxed mb-6 whitespace-pre-wrap">
              {session.problem_text}
            </p>

            <form onSubmit={submitAnswer} className="space-y-4">
              <div>
                <label
                  htmlFor="answer"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Your Answer:
                </label>
                <input
                  type="number"
                  id="answer"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  disabled={submitting}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  placeholder="Enter your answer"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={!answer || submitting}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition duration-200 ease-in-out transform hover:scale-105"
              >
                {submitting ? 'Submitting...' : 'Submit Answer'}
              </button>
            </form>
          </div>
        )}

        {/* Feedback display */}
        {submission && (
          <div
            className={`rounded-lg shadow-lg p-6 ${
              submission.is_correct
                ? 'bg-green-50 border-2 border-green-200'
                : 'bg-yellow-50 border-2 border-yellow-200'
            }`}
          >
            <h2 className="text-xl font-semibold mb-4 text-gray-700">
              {submission.is_correct ? '✅ Correct!' : '❌ Not quite right'}
            </h2>
            <p className="text-gray-800 leading-relaxed whitespace-pre-line">
              {submission.feedback_text}
            </p>
            <div className="mt-3 text-xs text-slate-500">
              Correct answer: <strong>{session.correct_answer}</strong>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
