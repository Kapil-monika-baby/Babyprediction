import SignupForm from "../auth/signup-form";

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-[#fffaf7] px-6 py-12 text-slate-900">
      <div className="mx-auto max-w-md">
        <a href="/" className="text-sm font-semibold text-slate-500">← Baby Prediction</a>
        <div className="mt-10 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-100">
          <p className="text-sm font-semibold text-rose-500">Create your account</p>
          <h1 className="mt-2 text-3xl font-bold">Start your baby prediction game</h1>
          <p className="mt-3 text-slate-600">Create a parent account and start building your game.</p>
          <SignupForm />
          <p className="mt-6 text-center text-sm text-slate-500">Already have an account? <a href="/login" className="font-semibold text-slate-900">Log in</a></p>
        </div>
      </div>
    </main>
  );
}
