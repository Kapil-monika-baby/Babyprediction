'use client';

import { FormEvent, useState } from 'react';

const questions = [
  ['gender', 'What do you predict — boy or girl?', ['Boy', 'Girl']],
  ['arrival', 'When will the baby arrive?', []],
  ['lookalike', 'Who will the baby look like?', ['Mom', 'Dad', 'Both']],
  ['name', 'Suggest a baby name', []],
  ['wishes', 'Leave a tip or wish for the parents', []],
] as const;

export default function PlayGamePage() {
  const [name, setName] = useState('');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const [type, title, options] = questions[step];

  function submit(event: FormEvent) {
    event.preventDefault();
    if (step < questions.length - 1) setStep(step + 1);
    else setSubmitted(true);
  }

  if (submitted) return <main className="min-h-screen bg-[#fffaf7] px-6 py-12"><div className="mx-auto max-w-lg rounded-[2rem] bg-white p-10 text-center shadow-sm ring-1 ring-slate-100"><div className="text-6xl">💌</div><h1 className="mt-5 text-3xl font-bold">Prediction submitted!</h1><p className="mt-3 text-slate-600">Thanks {name || 'for joining'}! The parents can now see your predictions.</p></div></main>;

  return <main className="min-h-screen bg-[#fffaf7] px-6 py-10 text-slate-900"><div className="mx-auto max-w-2xl"><div className="mb-5 flex justify-between text-sm font-semibold text-slate-500"><span>Prediction {step + 1} of {questions.length}</span><span>{Math.round(((step + 1) / questions.length) * 100)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-rose-400" style={{ width: `${((step + 1) / questions.length) * 100}%` }} /></div><form onSubmit={submit} className="mt-8 rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-100 sm:p-10"><p className="text-sm font-semibold text-rose-500">Baby prediction game</p>{step === 0 && <label className="mt-6 block text-sm font-semibold">Your name<input required value={name} onChange={e => setName(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal" placeholder="Enter your name" /></label>}<h1 className="mt-8 text-3xl font-bold">{title}</h1><div className="mt-6 grid gap-3">{options.length > 0 ? options.map(option => <button type="button" key={option} onClick={() => setAnswers({ ...answers, [type]: option })} className={`rounded-2xl border px-5 py-4 text-left font-semibold ${answers[type] === option ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200'}`}>{option}</button>) : <input required value={answers[type] || ''} onChange={e => setAnswers({ ...answers, [type]: e.target.value })} className="w-full rounded-2xl border border-slate-200 px-4 py-4" type={type === 'arrival' ? 'date' : 'text'} placeholder={type === 'name' ? 'Your baby name suggestion' : 'Write your answer'} />}</div><button disabled={options.length > 0 && !answers[type]} className="mt-8 w-full rounded-2xl bg-slate-900 px-5 py-3 font-semibold text-white">{step === questions.length - 1 ? 'Submit predictions' : 'Next prediction →'}</button></form></div></main>;
}
