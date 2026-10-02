import LoginForm from "../auth/login-form";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#fffaf7] px-6 py-12 text-slate-900">
      <div className="mx-auto max-w-md">
        <a href="/" className="text-sm font-semibold text-slate-500">← Baby Prediction</a>
        <div className="mt-10 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-100">
          <p className="text-sm font-semibold text-rose-500">Welcome back</p>
          <h1 className="mt-2 text-3xl font-bold">Log in to your baby game</h1>
          <p className="mt-3 text-slate-600">Use your parent account to manage games and see predictions.</p>
          <LoginForm />
          <p className="mt-6 text-center text-sm text-slate-500">New here? <a href="/signup" className="font-semibold text-slate-900">Create an account</a></p>
        </div>
      </div>
    </main>
  );
}
