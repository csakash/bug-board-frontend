import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Check,
  FileText,
  Image as ImageIcon,
  Layers,
  Link2,
  Loader2,
  Mail,
  RefreshCw,
  Tag,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { api, inviteMember, regenerateContext, removeMember, revokeInvite } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Avatar } from './ui';
import { Markdown } from './Markdown';
import type { PendingInvite, ProjectDetail, ProjectFileRef } from '../types';

type DetailTab = 'overview' | 'screenshots' | 'context' | 'members';

function extractError(e: unknown): string {
  return (
    (e as { response?: { data?: { error?: string } } }).response?.data?.error ??
    'Something went wrong'
  );
}

interface Props {
  project: ProjectDetail;
  issueCounts: {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
  };
  onClose: () => void;
}

export function ProjectDetailsModal({ project, issueCounts, onClose }: Props) {
  const [tab, setTab] = useState<DetailTab>('overview');
  const qc = useQueryClient();
  const regenerate = useMutation({
    mutationFn: () => regenerateContext(project.id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project', project.id] });
      void qc.invalidateQueries({ queryKey: ['projects'] });
    },
  });
  const regenerating = regenerate.isPending || project.contextStatus === 'generating';
  const screenshots = useMemo(
    () =>
      (project.files ?? []).filter(
        (entry) => entry.purpose === 'screenshot' || entry.file.contentType.startsWith('image/'),
      ),
    [project.files],
  );
  const attachments = useMemo(
    () =>
      (project.files ?? []).filter(
        (entry) => entry.purpose !== 'screenshot' && !entry.file.contentType.startsWith('image/'),
      ),
    [project.files],
  );

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 px-4 py-6 animate-fade-in">
      <div className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xl animate-slide-up-soft">
        <header className="border-b border-line px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted">
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ background: project.color ?? '#c0552d' }}
                />
                {project.key}
              </p>
              <h2 className="mt-1 font-display text-3xl text-ink">{project.name}</h2>
            </div>
            <button
              onClick={onClose}
              className="premium-focus rounded-md p-1.5 text-muted hover:bg-canvas hover:text-ink active:scale-95"
              title="Close project details"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Total issues" value={issueCounts.total} />
            <Stat label="Open" value={issueCounts.open} />
            <Stat label="In progress" value={issueCounts.inProgress} />
            <Stat label="Resolved" value={issueCounts.resolved} />
          </div>

          <div className="mt-5 flex gap-1 border-b border-line pb-px">
            <TabButton active={tab === 'overview'} onClick={() => setTab('overview')} icon={<FileText size={14} />}>
              Overview
            </TabButton>
            <TabButton active={tab === 'screenshots'} onClick={() => setTab('screenshots')} icon={<ImageIcon size={14} />}>
              Screenshots {screenshots.length ? screenshots.length : ''}
            </TabButton>
            <TabButton active={tab === 'context'} onClick={() => setTab('context')} icon={<Layers size={14} />}>
              AI context
            </TabButton>
            <TabButton active={tab === 'members'} onClick={() => setTab('members')} icon={<Users size={14} />}>
              Members {(project.members?.length ?? 0) > 1 ? project.members?.length : ''}
            </TabButton>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {tab === 'overview' && (
            <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
              <section className="rounded-lg border border-line bg-white p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-medium text-ink">
                  <FileText size={15} className="text-rust" /> Project brief
                </div>
                <Markdown content={project.description} className="text-ink/80" />
              </section>

              <aside className="space-y-4">
                <InfoPanel title="Labels" empty="No labels yet.">
                  <div className="flex flex-wrap gap-1.5">
                    {(project.labels ?? []).map((label) => (
                      <span
                        key={label.id}
                        className="inline-flex items-center gap-1 rounded border border-line bg-canvas px-2 py-1 text-xs text-muted"
                      >
                        <Tag size={11} /> {label.name}
                      </span>
                    ))}
                  </div>
                </InfoPanel>

                <InfoPanel title="Files" empty={attachments.length ? undefined : 'No supporting files.'}>
                  <div className="space-y-2">
                    {attachments.map((entry) => (
                      <FileRow key={entry.file.id} entry={entry} />
                    ))}
                  </div>
                </InfoPanel>
              </aside>
            </div>
          )}

          {tab === 'screenshots' && (
            <section>
              {screenshots.length ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {screenshots.map((entry) => (
                    <ScreenshotCard key={entry.file.id} entry={entry} />
                  ))}
                </div>
              ) : (
                <EmptyState icon={<ImageIcon size={22} />} title="No screenshots uploaded" />
              )}
            </section>
          )}

          {tab === 'context' && (
            <section className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-ink">AI-generated project context</p>
                  <p className="text-xs text-muted">
                    Built from the project brief and uploaded screenshots.
                  </p>
                </div>
                <button
                  onClick={() => regenerate.mutate()}
                  disabled={regenerating}
                  className="premium-focus inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-3 py-1.5 text-sm text-ink hover:border-rust/30 disabled:opacity-50"
                  title="Regenerate AI context from the brief and screenshots"
                >
                  <RefreshCw size={14} className={regenerating ? 'animate-spin' : ''} />
                  {regenerating ? 'Generating' : 'Regenerate'}
                </button>
              </div>

              {project.context ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  <ContextCard title="Summary" items={[project.context.summary]} paragraph />
                  <ContextCard title="Audience" items={project.context.audience ? [project.context.audience] : []} paragraph />
                  <ContextCard title="Components" items={project.context.components} />
                  <ContextCard title="Flows" items={project.context.flows} />
                  <ContextCard title="Terminology" items={project.context.terminology} />
                  <ContextCard title="Risks" items={project.context.risks} icon={<AlertTriangle size={14} />} />
                  <ContextCard title="Open questions" items={project.context.openQuestions} />
                  <ContextCard title="Suggested labels" items={project.context.suggestedLabels} />
                </div>
              ) : project.contextStatus === 'failed' ? (
                <EmptyState
                  icon={<AlertTriangle size={22} />}
                  title="AI context generation failed"
                  description="Something went wrong while building the context. Regenerate to rebuild it from the brief and screenshots."
                />
              ) : (
                <EmptyState
                  icon={<Loader2 size={22} className="animate-spin" />}
                  title="AI context is still being generated"
                  description="This usually takes a few moments and will appear here automatically."
                />
              )}
            </section>
          )}

          {tab === 'members' && <MembersTab project={project} />}
        </div>
      </div>
    </div>
  );
}

function MembersTab({ project }: { project: ProjectDetail }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isOwner = project.myRole === 'owner';
  const members = project.members ?? [];
  const invites = project.pendingInvites ?? [];
  const [email, setEmail] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const refresh = () => void qc.invalidateQueries({ queryKey: ['project', project.id] });

  async function copyLink(inv: PendingInvite) {
    try {
      await navigator.clipboard.writeText(inv.acceptUrl);
      setCopiedId(inv.id);
      setTimeout(() => setCopiedId((id) => (id === inv.id ? null : id)), 1500);
    } catch {
      // Clipboard blocked (insecure context / permissions) — surface the URL.
      window.prompt('Copy this invite link:', inv.acceptUrl);
    }
  }

  const invite = useMutation({
    mutationFn: () => inviteMember(project.id, email.trim().toLowerCase()),
    onSuccess: (res) => {
      const sentTo = email.trim().toLowerCase();
      setEmail('');
      setError('');
      if (res.alreadyMember) setNotice('That person is already a member.');
      else if (res.emailSent) setNotice(`Invite sent to ${sentTo}.`);
      else
        setNotice(
          'Invite created, but the email could not be sent. Use “Copy link” below to share it.',
        );
      refresh();
    },
    onError: (e) => {
      setNotice('');
      setError(extractError(e));
    },
  });

  const revoke = useMutation({
    mutationFn: (inviteId: string) => revokeInvite(project.id, inviteId),
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: (userId: string) => removeMember(project.id, userId),
    onSuccess: () => {
      setError('');
      refresh();
    },
    onError: (e) => setError(extractError(e)),
  });

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-ink">Members</p>
        <p className="text-xs text-muted">
          {members.length <= 1
            ? 'This project is personal. Invite someone to collaborate.'
            : `${members.length} people can see and work on this board.`}
        </p>
      </div>

      <div className="space-y-2">
        {members.map((m) => (
          <div
            key={m.userId}
            className="flex items-center justify-between rounded-lg border border-line bg-white px-3 py-2"
          >
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={m.name} size={30} />
              <div className="min-w-0">
                <p className="truncate text-sm text-ink">
                  {m.name}
                  {m.userId === user?.id && <span className="text-muted"> (you)</span>}
                </p>
                <p className="truncate text-xs text-muted">{m.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded px-1.5 py-0.5 text-[11px] capitalize ${
                  m.role === 'owner'
                    ? 'bg-[#fbeae6] text-rust'
                    : 'border border-line bg-canvas text-muted'
                }`}
              >
                {m.role}
              </span>
              {isOwner && m.userId !== user?.id && (
                <button
                  onClick={() => remove.mutate(m.userId)}
                  disabled={remove.isPending}
                  className="premium-focus rounded p-1 text-muted hover:text-rust disabled:opacity-50"
                  title={`Remove ${m.name}`}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {isOwner && (
        <div className="space-y-3">
          <div>
            <p className="mb-2 text-sm font-medium text-ink">Invite a teammate</p>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                  setNotice('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && email.trim()) invite.mutate();
                }}
                placeholder="teammate@company.com"
                className="premium-focus flex-1 rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-rust focus:shadow-[0_0_0_3px_rgba(192,85,45,0.12)]"
              />
              <button
                onClick={() => invite.mutate()}
                disabled={!email.trim() || invite.isPending}
                className="premium-focus flex items-center gap-1.5 rounded-md bg-rust px-4 py-2 text-sm font-medium text-white hover:bg-rust-dark active:scale-[0.99] disabled:opacity-50"
              >
                {invite.isPending ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                Invite
              </button>
            </div>
            {notice && <p className="mt-2 text-xs text-[#3f6f4e]">{notice}</p>}
            {error && <p className="mt-2 text-xs text-rust">{error}</p>}
          </div>

          {invites.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-ink">Pending invites</p>
              <div className="space-y-2">
                {invites.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between rounded-lg border border-dashed border-line bg-canvas px-3 py-2"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-sm text-ink">
                      <Mail size={14} className="text-muted" />
                      <span className="truncate">{inv.email}</span>
                      <span className="whitespace-nowrap text-xs text-muted">
                        · expires in {formatDistanceToNowStrict(new Date(inv.expiresAt))}
                      </span>
                    </span>
                    <span className="flex flex-shrink-0 items-center gap-1">
                      <button
                        onClick={() => void copyLink(inv)}
                        className="premium-focus flex items-center gap-1 rounded px-1.5 py-1 text-xs text-muted hover:text-ink"
                        title="Copy invite link"
                      >
                        {copiedId === inv.id ? (
                          <>
                            <Check size={13} className="text-[#3f6f4e]" /> Copied
                          </>
                        ) : (
                          <>
                            <Link2 size={13} /> Copy link
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => revoke.mutate(inv.id)}
                        disabled={revoke.isPending}
                        className="premium-focus rounded p-1 text-muted hover:text-rust disabled:opacity-50"
                        title="Revoke invite"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl text-ink">{value}</p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`premium-focus flex items-center gap-1.5 rounded-t-md px-3 py-1.5 text-sm ${
        active ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:bg-canvas hover:text-ink'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function InfoPanel({
  title,
  empty,
  children,
}: {
  title: string;
  empty?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <p className="mb-3 text-sm font-medium text-ink">{title}</p>
      {empty ? <p className="text-sm text-muted">{empty}</p> : children}
    </div>
  );
}

function FileRow({ entry }: { entry: ProjectFileRef }) {
  async function openFile() {
    const { data } = await api.get(`/api/uploads/${entry.file.id}/url`);
    window.open(data.url, '_blank', 'noopener,noreferrer');
  }

  return (
    <button
      onClick={() => void openFile()}
      className="premium-focus flex w-full items-center justify-between gap-3 rounded-md border border-line bg-canvas px-3 py-2 text-left hover:border-rust/30"
    >
      <span className="min-w-0">
        <span className="block truncate text-sm text-ink">{entry.file.fileName}</span>
        <span className="text-xs text-muted">{entry.purpose}</span>
      </span>
      <span className="text-xs text-rust">Open</span>
    </button>
  );
}

function ScreenshotCard({ entry }: { entry: ProjectFileRef }) {
  const { data, isLoading } = useQuery({
    queryKey: ['upload-url', entry.file.id],
    queryFn: async () => (await api.get(`/api/uploads/${entry.file.id}/url`)).data as { url: string },
    staleTime: 60_000,
  });

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white shadow-sm animate-fade-up">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{entry.file.fileName}</p>
          <p className="text-xs text-muted">
            Uploaded {formatDistanceToNowStrict(new Date(entry.createdAt))} ago
          </p>
        </div>
      </div>
      <div className="flex aspect-video items-center justify-center bg-canvas">
        {isLoading ? (
          <div className="h-full w-full skeleton-shimmer" />
        ) : data?.url ? (
          <img src={data.url} alt={entry.file.fileName} className="h-full w-full object-contain" />
        ) : (
          <p className="text-sm text-muted">Preview unavailable</p>
        )}
      </div>
    </div>
  );
}

function ContextCard({
  title,
  items,
  paragraph,
  icon,
}: {
  title: string;
  items: string[];
  paragraph?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-ink">
        {icon}
        {title}
      </p>
      {items.length ? (
        paragraph ? (
          <div className="space-y-2 text-sm leading-6 text-ink/80">
            {items.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {items.map((item) => (
              <span key={item} className="rounded border border-line bg-canvas px-2 py-1 text-xs text-muted">
                {item}
              </span>
            ))}
          </div>
        )
      ) : (
        <p className="text-sm text-muted">No data yet.</p>
      )}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-lg border border-dashed border-line bg-white px-6 text-center text-muted">
      {icon}
      <p className="mt-2 text-sm">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-xs text-muted">{description}</p> : null}
    </div>
  );
}
