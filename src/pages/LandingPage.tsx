import { Link } from 'react-router-dom';
import {
  Sparkles,
  Tags,
  BookOpen,
  Users,
  FileText,
  Image as ImageIcon,
  Video,
  File,
  ArrowRight,
} from 'lucide-react';

// Visible keyboard-focus ring for links (the shared `.premium-focus` class only
// animates transitions; it does not draw a focus indicator).
const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas';

/** Small rust "B" logomark + wordmark, matching the login card. */
function Wordmark({ asLink = true }: { asLink?: boolean }) {
  const inner = (
    <>
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-rust text-sm font-semibold text-white shadow-sm transition-transform duration-200 ease-premium hover:scale-[1.03]">
        B
      </span>
      <span className="font-display text-xl">Bug Board</span>
    </>
  );
  return asLink ? (
    <Link to="/" className={`flex items-center gap-2 rounded-md ${FOCUS_RING}`}>
      {inner}
    </Link>
  ) : (
    <span className="flex items-center gap-2">{inner}</span>
  );
}

const FEATURES = [
  {
    icon: Sparkles,
    title: 'AI-assisted intake',
    body: 'Paste text or drop a screenshot, video, or PDF. The always-on AI chat turns it into a clean, structured issue card.',
  },
  {
    icon: Tags,
    title: 'Rich issue types',
    body: 'Bug, feature, improvement, task, regression and more — each with severity and status, so the board reflects reality.',
  },
  {
    icon: BookOpen,
    title: 'Project context',
    body: "Give each project context once, and the AI writes every issue in your product's own language.",
  },
  {
    icon: Users,
    title: 'Team collaboration',
    body: 'Invite teammates to a project by email and work the same board together.',
  },
];

const STEPS = [
  {
    n: '1',
    title: 'Create a project & give it context',
    body: 'Spin up a project and tell Bug Board what it is. That context grounds every issue the AI writes.',
  },
  {
    n: '2',
    title: 'Drop in a rough report',
    body: 'Text, a screenshot, a screen recording, or a PDF — however the bug showed up, hand it over as-is.',
  },
  {
    n: '3',
    title: 'Get a structured card',
    body: 'The AI turns the mess into a clean, titled, typed issue card sitting on your board, ready to triage.',
  },
];

const MEDIA = [
  { icon: FileText, label: 'Text' },
  { icon: ImageIcon, label: 'Screenshots' },
  { icon: Video, label: 'Video' },
  { icon: File, label: 'PDF' },
];

/**
 * A faux Bug Board UI, drawn entirely in theme tokens — no external assets.
 * Purely illustrative, so the whole block is aria-hidden: its fake card titles
 * and chat text are not real page content and should not reach screen readers.
 */
function ProductMockup() {
  const cards = [
    { badge: 'Bug', badgeCls: 'text-rust', dot: 'bg-rust', title: 'Upload fails on files over 10MB', meta: 'High · Open' },
    { badge: 'Feature', badgeCls: 'text-[#5b5bd6]', dot: 'bg-[#d39a2b]', title: 'Bulk-assign issues from the board', meta: 'Medium · In progress' },
    { badge: 'Improvement', badgeCls: 'text-[#3f6f4e]', dot: 'bg-[#3f6f4e]', title: 'Faster search across projects', meta: 'Low · Resolved' },
  ];
  return (
    <div
      aria-hidden="true"
      className="animate-slide-up-soft rounded-xl border border-line bg-surface p-3 shadow-[0_20px_60px_-24px_rgba(43,41,37,0.35)] [animation-delay:120ms]"
    >
      {/* window chrome */}
      <div className="mb-3 flex items-center gap-1.5 px-1">
        <span className="h-2.5 w-2.5 rounded-full bg-line" />
        <span className="h-2.5 w-2.5 rounded-full bg-line" />
        <span className="h-2.5 w-2.5 rounded-full bg-line" />
        <span className="ml-3 text-xs text-muted">Payments · Board</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
        {/* issue cards */}
        <div className="space-y-2">
          {cards.map((c, i) => (
            <div
              key={c.title}
              className="animate-fade-up rounded-lg border border-line bg-canvas/60 p-3"
              style={{ animationDelay: `${200 + i * 90}ms` }}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className={`text-[11px] font-medium ${c.badgeCls}`}>{c.badge}</span>
                <span className={`inline-block h-2 w-2 rounded-full ${c.dot}`} />
              </div>
              <div className="text-sm text-ink">{c.title}</div>
              <div className="mt-1 text-[11px] text-muted">{c.meta}</div>
            </div>
          ))}
        </div>
        {/* mini AI chat */}
        <div className="hidden flex-col gap-2 rounded-lg border border-line bg-canvas/40 p-2.5 sm:flex">
          <div className="text-[11px] font-medium text-muted">AI chat</div>
          <div className="animate-message-in-right ml-auto max-w-[120px] rounded-lg rounded-br-sm bg-rust px-2 py-1.5 text-[11px] leading-snug text-white [animation-delay:520ms]">
            login button does nothing on mobile
          </div>
          <div className="animate-message-in-left max-w-[120px] rounded-lg rounded-bl-sm border border-line bg-surface px-2 py-1.5 text-[11px] leading-snug text-ink [animation-delay:680ms]">
            Filed <span className="font-medium text-rust">Bug</span>: “Login button unresponsive on mobile.”
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-full bg-canvas text-ink">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-line bg-surface/80 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Wordmark />
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className={`premium-focus hidden rounded-md px-3 py-2 text-sm text-muted hover:text-ink sm:inline-block ${FOCUS_RING}`}
            >
              Log in
            </Link>
            <Link
              to="/login?mode=register"
              className={`premium-focus rounded-md bg-rust px-3.5 py-2 text-sm font-medium text-white hover:bg-rust-dark active:scale-[0.99] ${FOCUS_RING}`}
            >
              Get started
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 md:grid-cols-2 md:py-24">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs text-muted">
              <Sparkles size={13} className="text-rust" aria-hidden="true" />
              AI-assisted issue tracking
            </span>
            <h1 className="mt-5 font-display text-4xl leading-[1.1] md:text-5xl">
              Turn messy bug reports into clean issues.
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-muted">
              Drop in a note, a screenshot, a screen recording, or a PDF. Bug Board&rsquo;s
              always-on AI chat turns the mess into structured, triage-ready issue cards.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                to="/login?mode=register"
                className={`premium-focus inline-flex items-center gap-1.5 rounded-md bg-rust px-4 py-2.5 text-sm font-medium text-white hover:bg-rust-dark active:scale-[0.99] ${FOCUS_RING}`}
              >
                Get started free
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link
                to="/login"
                className={`premium-focus inline-flex items-center rounded-md border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink hover:border-rust hover:text-rust ${FOCUS_RING}`}
              >
                Log in
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-muted">
              {MEDIA.map((m) => (
                <span key={m.label} className="inline-flex items-center gap-1.5">
                  <m.icon size={13} aria-hidden="true" /> {m.label}
                </span>
              ))}
            </div>
          </div>
          <ProductMockup />
        </section>

        {/* Features */}
        <section className="border-t border-line bg-surface/50">
          <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
            <h2 className="font-display text-2xl md:text-3xl">Everything you need to keep issues clean</h2>
            <p className="mt-2 max-w-lg text-sm text-muted">
              Bug Board handles the busywork of writing good issues so your team can spend its time fixing them.
            </p>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="rounded-xl border border-line bg-surface p-5 transition-transform duration-200 ease-premium hover:-translate-y-0.5"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-rust/10 text-rust">
                    <f.icon size={18} aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-medium">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-5 py-16 md:py-20">
          <h2 className="font-display text-2xl md:text-3xl">From rough report to structured card</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n}>
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-rust/30 bg-rust/10 font-display text-lg text-rust">
                  {s.n}
                </span>
                <h3 className="mt-4 font-medium">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Closing CTA band */}
        <section className="px-5 pb-20">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-2xl border border-rust/20 bg-rust/[0.06] px-6 py-14 text-center md:py-16">
            <h2 className="font-display text-3xl md:text-4xl">Start tracking issues in minutes.</h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted">
              Create your first project, hand Bug Board a rough report, and watch it become a clean issue card.
            </p>
            <Link
              to="/login?mode=register"
              className={`premium-focus mt-7 inline-flex items-center gap-1.5 rounded-md bg-rust px-5 py-3 text-sm font-medium text-white hover:bg-rust-dark active:scale-[0.99] ${FOCUS_RING}`}
            >
              Get started free
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-line bg-surface/50">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-sm text-muted sm:flex-row">
          <Wordmark asLink={false} />
          <span>Turn rough reports into clean, structured issues.</span>
          <span>© {new Date().getFullYear()} Bug Board</span>
        </div>
      </footer>
    </div>
  );
}
