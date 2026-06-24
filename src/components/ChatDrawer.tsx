import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  PanelRightClose,
  Plus,
  History,
  Send,
  Image as ImageIcon,
  Paperclip,
  Star,
  X,
} from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { api, uploadFile } from '../lib/api';
import { AttachmentUploadSkeleton, ChatMessageSkeleton } from './Skeleton';
import type { ChatMessage, ChatThreadSummary, SuggestionDraft } from '../types';

interface Props {
  projectId: string;
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
  emptyBoard: boolean;
}

interface Suggestion {
  id: string;
  draft: SuggestionDraft;
}

interface PendingUpload {
  fileId: string;
  name: string;
}

export function ChatDrawer({ projectId, open, onClose, onOpen, emptyBoard }: Props) {
  const qc = useQueryClient();
  const [threads, setThreads] = useState<ChatThreadSummary[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [input, setInput] = useState('');
  const [pendingFileIds, setPendingFileIds] = useState<string[]>([]);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [sending, setSending] = useState(false);
  const [adding, setAdding] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load conversation list for the project and open the most recent thread.
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setLoadingThread(true);
    void api
      .get(`/api/projects/${projectId}/chat/threads`)
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
  }, [projectId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, suggestion, sending]);

  async function openThread(threadId: string) {
    if (threadId === activeThreadId) {
      setShowHistory(false);
      return;
    }
    setShowHistory(false);
    setActiveThreadId(threadId);
    setSuggestion(null);
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
    const { data } = await api.post(`/api/projects/${projectId}/chat/threads`);
    const thread = data.thread as ChatThreadSummary;
    setThreads((t) => [thread, ...t]);
    setActiveThreadId(thread.id);
    setMessages([]);
    setSuggestion(null);
    setInput('');
    setPendingFileIds([]);
    setPendingUploads([]);
  }

  async function send() {
    if (!input.trim() || sending || !activeThreadId) return;
    const content = input.trim();
    setInput('');
    setSending(true);
    setMessages((m) => [
      ...m,
      { id: `tmp-${Date.now()}`, role: 'user', content, createdAt: new Date().toISOString() },
    ]);
    try {
      const { data } = await api.post(`/api/chat/threads/${activeThreadId}/messages`, {
        content,
        fileIds: pendingFileIds,
      });
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
      setSuggestion(
        data.suggestion ? { id: data.suggestion.id, draft: data.suggestion.draft } : null,
      );
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

  if (!open) {
    return (
      <button
        onClick={onOpen}
        className="premium-focus absolute right-0 top-1/2 z-20 -translate-y-1/2 rounded-l-md border border-r-0 border-line bg-surface px-2 py-3 text-muted shadow-sm animate-slide-in-right hover:text-ink hover:shadow-md"
        title="Open chat"
      >
        <PanelRightClose size={16} />
      </button>
    );
  }

  return (
    <aside className="relative flex h-full w-[380px] flex-shrink-0 flex-col border-l border-line bg-surface animate-slide-in-right shadow-sm">
      <header className="flex items-center justify-between border-b border-line px-4 py-3 animate-fade-in">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded bg-rust text-xs font-semibold text-white">
            B
          </span>
          <div className="leading-tight">
            <p className="text-sm font-medium">Report an issue</p>
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
          <>
            <ChatMessageSkeleton />
            <ChatMessageSkeleton />
          </>
        ) : (
          <>
            <div className="flex gap-2">
              <Bubble role="assistant">
                {emptyBoard
                  ? "Let's create your first issue. Describe a bug, feature, or improvement — attach a screenshot or recording if you have one — and I'll turn it into a clean, structured card."
                  : "Hi, I'm your project assistant. Ask me about open issues and status, or describe a bug or feature and I'll draft a structured card."}
              </Bubble>
            </div>

            {messages.map((m) => (
              <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex'}>
                <Bubble role={m.role}>{m.content}</Bubble>
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
            placeholder="Describe the issue you ran into…"
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
              className="premium-focus rounded-md bg-rust p-1.5 text-white hover:bg-rust-dark active:scale-95 disabled:opacity-40"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
        </div>
      </div>
    </aside>
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
        <p className="mt-3 text-sm text-ink/80">{draft.description}</p>
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
