'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase-browser';

type Question = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  position: number;
  options: unknown;
  is_custom?: boolean;
};

function normalizedOptions(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

function defaultOptions(type: string): string[] {
  if (type === 'gender') return ['Boy', 'Girl'];
  if (type === 'lookalike') return ['Mom', 'Dad', 'Both'];
  return [];
}

function followUpPrompt(type: string, title: string): string {
  if (type === 'boy-name' || type === 'girl-name' || /name/i.test(title)) return 'Is there a fun story or special reason behind the name you suggested?';
  if (type === 'gender') return 'What makes you think it will be a boy or a girl?';
  if (type === 'arrival' || type === 'date') return 'Is there a special reason you picked this date?';
  if (type === 'lookalike') return 'Why do you think the baby will look like them?';
  if (type === 'wishes') return 'Would you like to add a little story or personal message?';
  return 'What inspired your prediction? Share a fun story or reason (optional).';
}

export default function PlayGamePage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const [game, setGame] = useState<{ id: string; title: string; welcome_message: string | null } | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [name, setName] = useState('');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [followUps, setFollowUps] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      if (!slug) return;
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('id,title,welcome_message')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();
      if (gameError || !gameData) {
        setError('This game could not be found or is not published yet.');
        setLoading(false);
        return;
      }
      const { data: questionData, error: questionError } = await supabase
        .from('game_questions')
        .select('id,type,title,description,position,options')
        .eq('game_id', gameData.id)
        .eq('enabled', true)
        .order('position', { ascending: true });
      if (questionError || !questionData?.length) {
        setError('This game has no active questions yet.');
      } else {
        setGame(gameData);
        setQuestions(questionData);
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    const question = questions[step];
    if (!question) return;
    if (step < questions.length - 1) {
      setStep(step + 1);
      return;
    }

    setSubmitting(true);
    const storedAnswers = { ...answers };
    for (const [questionId, story] of Object.entries(followUps)) {
      if (story.trim()) storedAnswers[`__followup__${questionId}`] = story.trim();
    }
    const { error: predictionError } = await supabase.from('predictions').insert({
      game_id: game?.id,
      guest_name: name.trim(),
      answers: storedAnswers,
    });
    setSubmitting(false);
    if (predictionError) {
      setError(predictionError.message);
      return;
    }
    setSubmitted(true);
  }

  if (loading) return <main className="min-h-screen bg-[#fffaf7] px-6 py-12 text-center text-slate-500">Loading your prediction game…</main>;

  if (submitted) return <main className="min-h-screen bg-[#fffaf7] px-6 py-12"><div className="mx-auto max-w-lg rounded-[2rem] bg-white p-10 text-center shadow-sm ring-1 ring-slate-100"><div className="text-6xl">💌</div><h1 className="mt-5 text-2xl font-bold sm:text-3xl">Prediction submitted!</h1><p className="mt-3 text-slate-600">Thanks {name || 'for joining'}! Your predictions have been sent to the parents.</p></div></main>;

  if (!game || !questions.length) return <main className="min-h-screen bg-[#fffaf7] px-6 py-12"><div className="mx-auto max-w-lg rounded-[2rem] bg-white p-10 text-center shadow-sm ring-1 ring-slate-100"><p className="text-red-600">{error || 'Game unavailable.'}</p></div></main>;

  const question = questions[step];
  const options = normalizedOptions(question.options);
  const fallbackOptions = question.is_custom ? [] : defaultOptions(question.type);
  const displayOptions = options.length ? options : fallbackOptions;
  const value = answers[question.id] || '';
  const inputType = question.type === 'arrival' || question.type === 'date' ? 'date' : 'text';

  return <main className="min-h-screen bg-[#fffaf7] px-4 py-7 text-slate-900 sm:px-6 sm:py-10"><div className="mx-auto max-w-2xl">
    <div className="mb-5 flex justify-between text-sm font-semibold text-slate-500"><span>Prediction {step + 1} of {questions.length}</span><span>{Math.round(((step + 1) / questions.length) * 100)}%</span></div>
    <div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-rose-400" style={{ width: `${((step + 1) / questions.length) * 100}%` }} /></div>
    <form onSubmit={submit} className="mt-6 rounded-[2rem] sm:mt-8 bg-white p-5 shadow-sm sm:p-8 ring-1 ring-slate-100 sm:p-10">
      <p className="text-sm font-semibold text-rose-500">{game.title}</p>
      {step === 0 && <label className="mt-6 block text-sm font-semibold">Your name<input required value={name} onChange={e => setName(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal" placeholder="Enter your name" /></label>}
      <h1 className="mt-8 text-3xl font-bold">{question.title}</h1>
      {question.description && <p className="mt-2 text-slate-500">{question.description}</p>}
      <div className="mt-6 grid gap-3">{displayOptions.length > 0 ? displayOptions.map(option => <button type="button" key={option} onClick={() => setAnswers({ ...answers, [question.id]: option })} className={`rounded-2xl border px-5 py-4 text-left font-semibold ${value === option ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200'}`}>{option}</button>) : <input required value={value} onChange={e => setAnswers({ ...answers, [question.id]: e.target.value })} className="w-full rounded-2xl border border-slate-200 px-4 py-4" type={inputType} placeholder={question.type === 'wishes' ? 'Write your message' : 'Write your answer'} />}</div>
      <div className="mt-6 rounded-2xl bg-rose-50/70 p-4">
        <label htmlFor={`followup-${question.id}`} className="block text-sm font-semibold text-slate-800">💬 One more thing…</label>
        <p className="mt-1 text-sm text-slate-600">{followUpPrompt(question.type, question.title)}</p>
        <textarea id={`followup-${question.id}`} value={followUps[question.id] || ''} onChange={e => setFollowUps({ ...followUps, [question.id]: e.target.value.slice(0, 280) })} maxLength={280} rows={3} className="mt-3 w-full resize-y rounded-xl border border-rose-100 bg-white px-3 py-3 text-sm outline-none focus:border-rose-300" placeholder="Share a story… (optional)" />
        <p className="mt-1 text-right text-xs text-slate-400">{(followUps[question.id] || '').length}/280 · Optional</p>
      </div>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <button disabled={submitting || !name.trim() || (question.type !== 'wishes' && !value)} className="mt-6 w-full rounded-2xl bg-slate-900 px-5 py-3 font-semibold text-white disabled:opacity-50">{submitting ? 'Submitting…' : step === questions.length - 1 ? 'Submit predictions' : 'Next prediction →'}</button>
    </form>
  </div></main>;
}
