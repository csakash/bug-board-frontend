import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../lib/auth';

export function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<'login' | 'register'>(
    searchParams.get('mode') === 'register' ? 'register' : 'login',
  );

  // Keep the view in sync when the ?mode query changes (e.g. browser back/forward
  // between /login and /login?mode=register). The in-card toggle uses setMode
  // directly and does not touch the query, so it is unaffected.
  useEffect(() => {
    setMode(searchParams.get('mode') === 'register' ? 'register' : 'login');
  }, [searchParams]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('maya@bugboard.dev');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register(name, email, password);
      navigate('/');
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ??
        'Something went wrong';
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full items-center justify-center bg-canvas animate-fade-in">
      <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-8 shadow-sm animate-slide-up-soft">
        <div className="mb-6 flex items-center gap-2 animate-fade-up">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-rust text-sm font-semibold text-white shadow-sm transition-transform duration-200 ease-premium hover:scale-[1.03]">
            B
          </span>
          <span className="font-display text-xl">Bug Board</span>
        </div>
        <h1 className="mb-1 font-display text-2xl">
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="mb-6 text-sm text-muted">
          {mode === 'login'
            ? 'Sign in to your workspace.'
            : 'Start tracking issues in minutes.'}
        </p>

        <form onSubmit={submit} className="space-y-3">
          {mode === 'register' && (
            <input
              className="premium-focus w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-rust focus:shadow-[0_0_0_3px_rgba(192,85,45,0.12)] animate-fade-up"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}
          <input
            className="premium-focus w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-rust focus:shadow-[0_0_0_3px_rgba(192,85,45,0.12)]"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="premium-focus w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-rust focus:shadow-[0_0_0_3px_rgba(192,85,45,0.12)]"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-sm text-rust">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="premium-focus flex w-full items-center justify-center gap-2 rounded-md bg-rust py-2 text-sm font-medium text-white hover:bg-rust-dark active:scale-[0.99] disabled:opacity-60"
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          className="premium-focus mt-4 w-full text-center text-sm text-muted hover:text-ink"
        >
          {mode === 'login'
            ? "Don't have an account? Sign up"
            : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
