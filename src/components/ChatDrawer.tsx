import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  Plus,
  History,
  Send,
  Image as ImageIcon,
  Paperclip,
  Star,
  Wand2,
  X,
} from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { api, uploadFile } from '../lib/api';
import { Markdown } from './Markdown';
import { AttachmentUploadSkeleton, ChatMessageSkeleton } from './Skeleton';
import type { ChatMessage, ChatThreadSummary, IssueChatAction, SuggestionDraft } from '../types';

interface Props {
  projectId: string;
  /** When set, the drawer is scoped to a single issue: it lists that issue's
   *  threads and the agent can propose confirm-gated actions on the issue. */
  issueId?: string;
  open: boolean;
  onClose: () => void;
  emptyBoard?: boolean;
}

interface Suggestion {
  id: string;
  draft: SuggestionDraft;
}

interface PendingUpload {
  fileId: string;
  name: string;
}

const MIN_CHAT_WIDTH = 320;
const MAX_CHAT_WIDTH = 760;
const DEFAULT_CHAT_WIDTH = 380;

export function ChatDrawer({ projectId, issueId, open, onClose, emptyBoard = false }: Props) {
  const qc = useQueryClient();
  // Base path for listing/creating threads: issue-scoped or project-scoped.
  const threadsBase = issueId
    ? `/api/issues/${issueId}/chat/threads`
    : `/api/projects/${projectId}/chat/threads`;
  const [threads, setThreads] = useState<ChatThreadSummary[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [input, setInput] = useState('');
  const [pendingFileIds, setPendingFileIds] = useState<string[]>([]);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [action, setAction] = useState<IssueChatAction | null>(null);
  const [applying, setApplying] = useState(false);
  const [actionError, setActionError] = useState('');
  const [sending, setSending] = useState(false);
  const [adding, setAdding] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const [width, setWidth] = useState(() => {
    const saved = Number(localStorage.getItem('chatWidth'));
    return saved >= MIN_CHAT_WIDTH && saved <= MAX_CHAT_WIDTH ? saved : DEFAULT_CHAT_WIDTH;
  });
  const widthRef = useRef(width);
  widthRef.current = width;
  const resizingRef = useRef(false);
  // Track the active thread so an in-flight send() can drop its response if the
  // user switched threads before it arrived (avoids surfacing/applying an action
  // against the wrong thread).
  const activeThreadIdRef = useRef(activeThreadId);
  activeThreadIdRef.current = activeThreadId;

  // Drag the left edge to resize the chat; the board panel (flex-1) reflows.
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!resizingRef.current) return;
      const next = Math.min(
        MAX_CHAT_WIDTH,
        Math.max(MIN_CHAT_WIDTH, window.innerWidth - e.clientX),
      );
      setWidth(next);
    }
    function onUp() {
      if (!resizingRef.current) return;
      resizingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      localStorage.setItem('chatWidth', String(widthRef.current));
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  function startResize(e: React.MouseEvent) {
    e.preventDefault();
    resizingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  // Load conversation list (issue- or project-scoped) and open the most recent thread.
  useEffect(() => {
    if (issueId ? !issueId : !projectId) return;
    let cancelled = false;
    setLoadingThread(true);
    setSuggestion(null);
    setAction(null);
    void api
      .get(threadsBase)
      .then(async ({ data }) => {
        if (cancelled) return;
        const list = data.threads as ChatThreadSummary[];
        setThreads(list);
        const active = list[0]?.id ?? null;
        setActiveThreadId(active);
        if (active) {
          const res = await api.get(`/api/chat/threads/${active}/messages`);
          if (!cancelled) setMessages(res.data.messages);
        } else {
          setMessages([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingThread(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, issueId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, suggestion, action, sending]);

  async function openThread(threadId: string) {
    if (threadId === activeThreadId) {
      setShowHistory(false);
      return;
    }
    setShowHistory(false);
    setActiveThreadId(threadId);
    setSuggestion(null);
    setAction(null);
    setActionError('');
    setLoadingThread(true);
    try {
      const { data } = await api.get(`/api/chat/threads/${threadId}/messages`);
      setMessages(data.messages);
    } finally {
      setLoadingThread(false);
    }
  }

  async function newChat() {
    setShowHistory(false);
    const { data } = await api.post(threadsBase);
    const thread = data.thread as ChatThreadSummary;
    setThreads((t) => [thread, ...t]);
    setActiveThreadId(thread.id);
    setMessages([]);
    setSuggestion(null);
    setAction(null);
    setActionError('');
    setInput('');
    setPendingFileIds([]);
    setPendingUploads([]);
  }

  async function send() {
    if (!input.trim() || sending || !activeThreadId) return;
    const content = input.trim();
    const sentThreadId = activeThreadId;
    setInput('');
    setSending(true);
    setMessages((m) => [
      ...m,
      { id: `tmp-${Date.now()}`, role: 'user', content, createdAt: new Date().toISOString() },
    ]);
    try {
      const { data } = await api.post(`/api/chat/threads/${sentThreadId}/messages`, {
        content,
        fileIds: pendingFileIds,
      });
      // User switched threads while this was in flight — drop the stale response.
      if (activeThreadIdRef.current !== sentThreadId) return;
      setPendingFileIds([]);
      setPendingUploads([]);
      setMessages((m) => [
        ...m,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: data.message,
          createdAt: new Date().toISOString(),
        },
      ]);
      if (issueId) {
        setAction((data.action as IssueChatAction | null) ?? null);
        setActionError('');
      } else {
        setSuggestion(
          data.suggestion ? { id: data.suggestion.id, draft: data.suggestion.draft } : null,
        );
      }
      // Reflect the (possibly newly derived) thread title in the history list.
      setThreads((list) =>
        list.map((t) =>
          t.id === activeThreadId
            ? { ...t, title: data.title ?? t.title, updatedAt: new Date().toISOString() }
            : t,
        ),
      );
    } finally {
      setSending(false);
    }
  }

  async function onPickFile(list: FileList | null) {
    if (!list?.length) return;
    setUploadError('');
    setUploading(true);
    try {
      const uploaded = await Promise.all(
        Array.from(list).map(async (file) => ({
          fileId: await uploadFile(file, projectId),
          name: file.name,
        })),
      );
      setPendingFileIds((p) => [...p, ...uploaded.map((file) => file.fileId)]);
      setPendingUploads((p) => [...p, ...uploaded]);
    } catch (error) {
      setUploadError(
        (error as { response?: { data?: { error?: string } } }).response?.data?.error ??
          'Attachment upload failed. Check your R2 configuration and try again.',
      );
    } finally {
      setUploading(false);
    }
  }

  async function addToBoard() {
    if (!suggestion) return;
    setAdding(true);
    try {
      await api.post(`/api/issue-suggestions/${suggestion.id}/add-to-board`, {
        draft: suggestion.draft,
      });
      setSuggestion(null);
      void qc.invalidateQueries({ queryKey: ['issues', projectId] });
      void qc.invalidateQueries({ queryKey: ['projects'] });
    } finally {
      setAdding(false);
    }
  }

  async function dismiss() {
    if (!suggestion) return;
    setDismissing(true);
    try {
      await api.post(`/api/issue-suggestions/${suggestion.id}/dismiss`);
      setSuggestion(null);
    } finally {
      setDismissing(false);
    }
  }

  // Apply an issue action the agent proposed, using the same endpoints the
  // issue page uses, then refresh the issue so the change shows immediately.
  async function applyAction() {
    if (!action || !issueId) return;
    setApplying(true);
    setActionError('');
    try {
      if (action.kind === 'update_fields') {
        await api.patch(`/api/issues/${issueId}`, action.fields);
      } else {
        await api.post(`/api/issues/${issueId}/comments`, { body: action.comment });
      }
      void qc.invalidateQueries({ queryKey: ['issue', issueId] });
      void qc.invalidateQueries({ queryKey: ['issues', projectId] });
      const applied = action.kind === 'update_fields' ? 'Applied the changes to this issue.' : 'Posted the comment.';
      setMessages((m) => [
        ...m,
        { id: `sys-${Date.now()}`, role: 'assistant', content: `✓ ${applied}`, createdAt: new Date().toISOString() },
      ]);
      setAction(null);
    } catch (error) {
      setActionError(
        (error as { response?: { data?: { error?: string } } }).response?.data?.error ??
          'Could not apply that. Try again.',
      );
    } finally {
      setApplying(false);
    }
  }

  function dismissAction() {
    setAction(null);
    setActionError('');
  }

  if (!open) {
    return null;
  }

  return (
    <aside
      style={{ width }}
      className="relative flex h-full flex-shrink-0 flex-col border-l border-line bg-surface animate-slide-in-right shadow-sm"
    >
      <div
        onMouseDown={startResize}
        className="group absolute left-0 top-0 z-40 h-full w-1.5 -translate-x-1/2 cursor-col-resize"
        title="Drag to resize"
      >
        <div className="mx-auto h-full w-px bg-transparent transition-colors group-hover:bg-rust/40" />
      </div>
      <header className="flex items-center justify-between border-b border-line px-4 py-3 animate-fade-in">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded bg-rust text-xs font-semibold text-white">
            B
          </span>
          <div className="leading-tight">
            <p className="text-sm font-medium">Bug AI</p>
            <p className="text-xs text-muted">AI assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-muted">
          <button
            onClick={() => void newChat()}
            className="premium-focus rounded p-1 hover:bg-canvas hover:text-ink active:scale-95"
            title="New chat"
          >
            <Plus size={16} />
          </button>
          <button
            onClick={() => setShowHistory((s) => !s)}
            className={`premium-focus rounded p-1 hover:bg-canvas hover:text-ink active:scale-95 ${
              showHistory ? 'bg-canvas text-ink' : ''
            }`}
            title="Conversation history"
          >
            <History size={16} />
          </button>
          <button onClick={onClose} className="premium-focus p-1 hover:scale-105 hover:text-ink" title="Minimize">
            <X size={16} />
          </button>
        </div>
      </header>

      {showHistory && (
        <div className="absolute right-3 top-14 z-30 w-64 overflow-hidden rounded-lg border border-line bg-white shadow-lg animate-slide-up-soft">
          <div className="flex items-center justify-between border-b border-line px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted">
            <span>History</span>
            <button
              onClick={() => void newChat()}
              className="premium-focus flex items-center gap-1 text-rust hover:text-rust-dark"
            >
              <Plus size={12} /> New
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            {threads.length === 0 && (
              <p className="px-3 py-2 text-xs text-muted">No conversations yet.</p>
            )}
            {threads.map((t) => (
              <button
                key={t.id}
                onClick={() => void openThread(t.id)}
                className={`premium-focus flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-canvas ${
                  t.id === activeThreadId ? 'bg-canvas' : ''
                }`}
              >
                <span className="line-clamp-1 text-sm text-ink">{t.title ?? 'New chat'}</span>
                <span className="text-[11px] text-muted">
                  {t.messageCount} messages · {formatDistanceToNowStrict(new Date(t.updatedAt))} ago
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {loadingThread ? (
          <ChatMessageSkeleton />
        ) : (
          <>
            <div className="flex gap-2">
              <Bubble role="assistant">
                {issueId
                  ? "Hi — I'm focused on this issue. Ask me anything about it, or ask me to tighten the description, sharpen the repro steps, refine the acceptance criteria, adjust severity/status, or draft a comment. You'll confirm any change before it's applied."
                  : emptyBoard
                    ? "Let's create your first issue. Describe a bug, feature, or improvement — attach a screenshot or recording if you have one — and I'll turn it into a clean, structured card."
                    : "Hi, I'm your project assistant. Ask me about open issues and status, or describe a bug or feature and I'll draft a structured card."}
              </Bubble>
            </div>

            {messages.map((m) => (
              <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex'}>
                <Bubble role={m.role}>
                  {m.role === 'assistant' ? <Markdown content={m.content} /> : m.content}
                </Bubble>
              </div>
            ))}

            {sending && (
              <div className="flex">
                <ChatMessageSkeleton />
              </div>
            )}

            {suggestion && (
              <SuggestionCard
                draft={suggestion.draft}
                onChange={(d) => setSuggestion({ ...suggestion, draft: d })}
                onAdd={addToBoard}
                onDismiss={dismiss}
                adding={adding}
                dismissing={dismissing}
              />
            )}

            {action && (
              <ActionCard
                action={action}
                onApply={applyAction}
                onDismiss={dismissAction}
                applying={applying}
                error={actionError}
              />
            )}
          </>
        )}
      </div>

      <div className="border-t border-line p-3">
        {pendingUploads.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {pendingUploads.map((file) => (
              <span
                key={file.fileId}
                className="rounded border border-line bg-canvas px-2 py-1 text-[11px] text-muted animate-fade-up"
              >
                {file.name}
              </span>
            ))}
            {uploading && <AttachmentUploadSkeleton label="Uploading" />}
          </div>
        )}
        {uploading && pendingUploads.length === 0 && (
          <div className="mb-2">
            <AttachmentUploadSkeleton label="Uploading" />
          </div>
        )}
        {uploadError && <p className="mb-2 text-xs text-rust">{uploadError}</p>}
        <div className="premium-focus rounded-lg border border-line bg-white px-3 py-2 focus-within:border-rust/50 focus-within:shadow-[0_0_0_3px_rgba(192,85,45,0.10)]">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder={issueId ? 'Ask about this issue, or ask for a change…' : 'Describe the issue you ran into…'}
            className="h-12 w-full resize-none text-sm outline-none"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted">
              <label className="premium-focus cursor-pointer hover:scale-105 hover:text-ink">
                <ImageIcon size={16} />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  multiple
                  onChange={(e) => onPickFile(e.target.files)}
                />
              </label>
              <label className="premium-focus cursor-pointer hover:scale-105 hover:text-ink">
                <Paperclip size={16} />
                <input
                  type="file"
                  className="hidden"
                  multiple
                  onChange={(e) => onPickFile(e.target.files)}
                />
              </label>
            </div>
            <button
              onClick={() => void send()}
              disabled={sending || !input.trim()}
              className="premium-focus flex h-8 w-8 items-center justify-center rounded-full bg-rust text-white hover:bg-rust-dark active:scale-95 disabled:opacity-40"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

const FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  description: 'Description',
  type: 'Type',
  status: 'Status',
  severity: 'Severity',
  priority: 'Priority',
  environment: 'Environment',
  expectedResult: 'Expected result',
  actualResult: 'Actual result',
  stepsToReproduce: 'Steps to reproduce',
  acceptanceCriteria: 'Acceptance criteria',
};

// A confirm-gated proposal from the issue agent: either a set of field edits or
// a comment to post. Mirrors the SuggestionCard pattern.
function ActionCard({
  action,
  onApply,
  onDismiss,
  applying,
  error,
}: {
  action: IssueChatAction;
  onApply: () => void;
  onDismiss: () => void;
  applying: boolean;
  error: string;
}) {
  const isComment = action.kind === 'post_comment';
  return (
    <div className="rounded-xl border border-line bg-white p-4 shadow-sm animate-slide-up-soft">
      <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted">
        <Wand2 size={12} /> {isComment ? 'Proposed comment' : 'Proposed field update'}
      </div>

      <p className="mt-2 text-sm text-ink">{action.summary}</p>

      {isComment ? (
        <div className="mt-3 rounded-md border border-line bg-canvas px-3 py-2 text-sm text-ink/80">
          <Markdown content={action.comment ?? ''} />
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {Object.entries(action.fields ?? {}).map(([key, value]) => (
            <div key={key}>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
                {FIELD_LABELS[key] ?? key}
              </p>
              {Array.isArray(value) ? (
                <ul className="mt-0.5 space-y-0.5 text-sm text-ink/80">
                  {value.map((v, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-muted">•</span>
                      {v}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-0.5 whitespace-pre-wrap text-sm text-ink/80">
                  {value === null || value === '' ? '(cleared)' : String(value)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {error && <p className="mt-2 text-xs text-rust">{error}</p>}

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={onApply}
          disabled={applying}
          className="premium-focus flex flex-1 items-center justify-center gap-1.5 rounded-md bg-rust py-2 text-sm font-medium text-white hover:bg-rust-dark active:scale-[0.99] disabled:opacity-60"
        >
          {applying && <Loader2 size={14} className="animate-spin" />}
          {applying
            ? isComment
              ? 'Posting…'
              : 'Applying…'
            : isComment
              ? 'Post comment'
              : 'Apply changes'}
        </button>
        <button
          onClick={onDismiss}
          disabled={applying}
          className="premium-focus rounded-md border border-line px-3 py-2 text-sm text-muted hover:border-rust/30 hover:text-ink active:scale-[0.99] disabled:opacity-60"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

function Bubble({ role, children }: { role: string; children: React.ReactNode }) {
  const isUser = role === 'user';
  return (
    <div
      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm ${
        isUser ? 'bg-rust text-white animate-message-in-right' : 'border border-line bg-canvas text-ink animate-message-in-left'
      }`}
    >
      {children}
    </div>
  );
}

function SuggestionCard({
  draft,
  onChange,
  onAdd,
  onDismiss,
  adding,
  dismissing,
}: {
  draft: SuggestionDraft;
  onChange: (d: SuggestionDraft) => void;
  onAdd: () => void;
  onDismiss: () => void;
  adding: boolean;
  dismissing: boolean;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="rounded-xl border border-line bg-white p-4 shadow-sm animate-slide-up-soft">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-muted">
        <span className="flex items-center gap-1">
          <Star size={12} /> Suggested issue card
        </span>
        <span className="capitalize text-rust">{draft.type}</span>
      </div>

      {editing ? (
        <input
          value={draft.title}
          onChange={(e) => onChange({ ...draft, title: e.target.value })}
          className="premium-focus mt-2 w-full rounded border border-line px-2 py-1 font-display text-lg outline-none focus:border-rust focus:shadow-[0_0_0_3px_rgba(192,85,45,0.10)]"
        />
      ) : (
        <h3 className="mt-2 font-display text-lg">{draft.title}</h3>
      )}

      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
        <span className="rounded border border-line bg-canvas px-1.5 py-0.5 capitalize">
          {draft.status.replace('_', ' ')}
        </span>
        {draft.severity && (
          <span className="rounded border border-line bg-canvas px-1.5 py-0.5 capitalize">
            {draft.severity}
          </span>
        )}
        {draft.labels.map((l) => (
          <span key={l} className="rounded border border-line bg-canvas px-1.5 py-0.5">
            {l}
          </span>
        ))}
      </div>

      {editing ? (
        <textarea
          value={draft.description}
          onChange={(e) => onChange({ ...draft, description: e.target.value })}
          className="premium-focus mt-3 h-20 w-full resize-none rounded border border-line px-2 py-1 text-sm outline-none focus:border-rust focus:shadow-[0_0_0_3px_rgba(192,85,45,0.10)]"
        />
      ) : (
        <div className="mt-3 text-ink/80">
          <Markdown content={draft.description} />
        </div>
      )}

      {draft.stepsToReproduce.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
            Steps to reproduce
          </p>
          <ol className="mt-1 space-y-0.5 text-sm text-ink/80">
            {draft.stepsToReproduce.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-muted">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
        </div>
      )}

      {(draft.expectedResult || draft.actualResult) && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          {draft.expectedResult && (
            <div className="rounded-md border border-line bg-canvas p-2">
              <p className="font-medium text-[#3f6f4e]">Expected</p>
              <p className="mt-0.5 text-ink/80">{draft.expectedResult}</p>
            </div>
          )}
          {draft.actualResult && (
            <div className="rounded-md border border-line bg-[#fbf1ee] p-2">
              <p className="font-medium text-rust">Actual</p>
              <p className="mt-0.5 text-ink/80">{draft.actualResult}</p>
            </div>
          )}
        </div>
      )}

      {draft.acceptanceCriteria.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
            Acceptance criteria
          </p>
          <ul className="mt-1 space-y-0.5 text-sm text-ink/80">
            {draft.acceptanceCriteria.map((c, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-muted">•</span>
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={onAdd}
          disabled={adding || dismissing}
          className="premium-focus flex flex-1 items-center justify-center gap-1.5 rounded-md bg-rust py-2 text-sm font-medium text-white hover:bg-rust-dark active:scale-[0.99] disabled:opacity-60"
        >
          {adding && <Loader2 size={14} className="animate-spin" />}
          {adding ? 'Adding...' : '+ Add to board'}
        </button>
        <button
          onClick={() => setEditing((e) => !e)}
          disabled={adding || dismissing}
          className="premium-focus rounded-md border border-line px-3 py-2 text-sm text-muted hover:border-rust/30 hover:text-ink active:scale-[0.99] disabled:opacity-60"
        >
          {editing ? 'Done' : 'Edit'}
        </button>
        <button
          onClick={onDismiss}
          disabled={adding || dismissing}
          className="premium-focus rounded-md border border-line px-3 py-2 text-sm text-muted hover:border-rust/30 hover:text-ink active:scale-[0.99] disabled:opacity-60"
        >
          {dismissing ? 'Dismissing...' : 'Dismiss'}
        </button>
      </div>
    </div>
  );
}
