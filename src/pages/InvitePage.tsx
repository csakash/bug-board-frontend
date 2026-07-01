import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Loader2, MailX, PartyPopper } from 'lucide-react';
import { acceptInvite, getInvite } from '../lib/api';
import { useAuth } from '../lib/auth';

export function InvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, login, register, logout } = useAuth();

  const {
    data: invite,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['invite', token],
    queryFn: () => getInvite(token!),
    enabled: !!token,
    retry: false,
  });

  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState('');
  // Synchronous re-entrancy guard: state updates aren't synchronous, so under
  // React StrictMode's double-invoke a state flag would let two accepts fire.
  const acceptTriedRef = useRef(false);

  const emailMatches =
    !!user?.email && !!invite && user.email.toLowerCase() === invite.email.toLowerCase();
  // Acceptable if a live pending invite, OR already accepted by this same user
  // (idempotent — the accept endpoint just returns the projectId so we redirect).
  const canAccept =
    !!invite &&
    emailMatches &&
    ((invite.status === 'pending' && !invite.expired) || invite.status === 'accepted');

  const doAccept = useCallback(() => {
    if (!token || acceptTriedRef.current) return;
    acceptTriedRef.current = true; // fire exactly once; retry() resets it explicitly
    setAccepting(true);
    setAcceptError('');
    acceptInvite(token)
      .then((projectId) => navigate(`/projects/${projectId}`, { replace: true }))
      .catch((e) => {
        setAcceptError(
          (e as { response?: { data?: { error?: string } } }).response?.data?.error ??
            'Could not accept this invite.',
        );
        setAccepting(false);
        // Deliberately do NOT reset the guard here — otherwise the effect would
        // immediately re-fire and spin forever on a persistent error.
      });
  }, [token, navigate]);

  // Auto-accept once we have a logged-in user whose email matches the invite.
  // Covers "already logged in" and "just signed up" (the app remounts this page
  // into the authed route tree after auth).
  useEffect(() => {
    if (canAccept) doAccept();
  }, [canAccept, doAccept]);

  function retry() {
    acceptTriedRef.current = false;
    doAccept();
  }

  return (
    <div className="flex h-full items-center justify-center bg-canvas px-4 animate-fade-in">
      <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-8 shadow-sm animate-slide-up-soft">
        <div className="mb-6 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-rust text-sm font-semibold text-white shadow-sm">
            B
          </span>
          <span className="font-display text-xl">Bug Board</span>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted">
            <Loader2 size={16} className="animate-spin" /> Loading invitation…
          </div>
        ) : isError || !invite ? (
          <InviteError
            title="Invitation not found"
            body="This invite link is invalid. Ask the project owner to send a new one."
          />
        ) : invite.status === 'revoked' ? (
          <InviteError
            title="Invitation revoked"
            body="This invite is no longer active. Ask the project owner to invite you again."
          />
        ) : invite.expired ? (
          <InviteError
            title="Invitation expired"
            body="This invite link has expired. Ask the project owner to send a fresh one."
          />
        ) : invite.status === 'accepted' && !emailMatches ? (
          <InviteError
            title="Invitation already used"
            body="This invite has already been accepted. If that was you, just sign in."
          />
        ) : accepting || canAccept ? (
          <div>
            <p className="flex items-center gap-2 text-sm text-ink">
              <PartyPopper size={16} className="text-rust" /> Joining{' '}
              <strong>{invite.projectName}</strong>…
            </p>
            {acceptError && !accepting && (
              <div className="mt-3">
                <p className="text-sm text-rust">{acceptError}</p>
                <button
                  onClick={retry}
                  className="premium-focus mt-2 rounded-md border border-line px-3 py-1.5 text-sm text-muted hover:border-rust/30 hover:text-ink"
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        ) : user ? (
          // Logged in as the wrong account — invite is email-locked.
          <div>
            <h1 className="mb-1 font-display text-2xl">Wrong account</h1>
            <p className="mb-4 text-sm text-muted">
              This invitation is for <strong>{invite.email}</strong>, but you're signed in as{' '}
              <strong>{user.email}</strong>. Log out and sign in as {invite.email} to accept.
            </p>
            <button
              onClick={() => void logout()}
              className="premium-focus w-full rounded-md bg-rust py-2 text-sm font-medium text-white hover:bg-rust-dark active:scale-[0.99]"
            >
              Log out
            </button>
          </div>
        ) : (
          <InviteAuthForm
            invite={invite}
            onLogin={login}
            onRegister={register}
          />
        )}
      </div>
    </div>
  );
}

function InviteAuthForm({
  invite,
  onLogin,
  onRegister,
}: {
  invite: { projectName: string; inviterName: string; email: string };
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (name: string, email: string, password: string) => Promise<void>;
}) {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'register') await onRegister(name, invite.email, password);
      else await onLogin(invite.email, password);
      // The page auto-accepts once auth completes (see InvitePage effect).
    } catch (err) {
      setError(
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ??
          'Something went wrong',
      );
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl">
        Join {invite.projectName}
      </h1>
      <p className="mb-5 text-sm text-muted">
        {invite.inviterName} invited you to collaborate.{' '}
        {mode === 'register' ? 'Create your account to accept.' : 'Sign in to accept.'}
      </p>

      <form onSubmit={submit} className="space-y-3">
        {mode === 'register' && (
          <input
            className="premium-focus w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-rust focus:shadow-[0_0_0_3px_rgba(192,85,45,0.12)]"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        )}
        <input
          className="w-full cursor-not-allowed rounded-md border border-line bg-canvas px-3 py-2 text-sm text-muted outline-none"
          value={invite.email}
          readOnly
          title="This invite is locked to this email"
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
          {busy ? 'Please wait…' : mode === 'register' ? 'Create account & join' : 'Sign in & join'}
        </button>
      </form>

      <button
        onClick={() => {
          setMode(mode === 'register' ? 'login' : 'register');
          setError('');
        }}
        className="premium-focus mt-4 w-full text-center text-sm text-muted hover:text-ink"
      >
        {mode === 'register'
          ? 'Already have an account? Sign in'
          : 'Need an account? Sign up'}
      </button>
    </div>
  );
}

function InviteError({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-rust">
        <MailX size={18} />
        <h1 className="font-display text-2xl text-ink">{title}</h1>
      </div>
      <p className="mb-5 text-sm text-muted">{body}</p>
      <Link
        to="/"
        className="premium-focus inline-block rounded-md border border-line px-4 py-2 text-sm text-muted hover:border-rust/30 hover:text-ink"
      >
        Go to Bug Board
      </Link>
    </div>
  );
}
