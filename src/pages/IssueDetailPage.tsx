import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, FileText, Image as ImageIcon, Loader2, Paperclip } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { api, uploadFile } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Avatar, SeverityTag } from '../components/ui';
import { AttachmentUploadSkeleton, IssueDetailSkeleton } from '../components/Skeleton';
import type { Issue, IssueStatus, ReviewState } from '../types';

const STATUS_OPTIONS: IssueStatus[] = ['open', 'in_progress', 'resolved'];

export function IssueDetailPage() {
  const { projectId, issueId } = useParams();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [comment, setComment] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<Array<{ fileId: string; name: string }>>([]);
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);

  const { data: issue } = useQuery({
    queryKey: ['issue', issueId],
    queryFn: async () => (await api.get(`/api/issues/${issueId}`)).data.issue as Issue,
    enabled: !!issueId,
    staleTime: 5_000,
  });

  const setStatus = useMutation({
    mutationFn: (status: IssueStatus) =>
      api.post(`/api/issues/${issueId}/status`, { status }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['issue', issueId] });
      void qc.invalidateQueries({ queryKey: ['issues', projectId] });
    },
  });

  const addComment = useMutation({
    mutationFn: (reviewState: ReviewState) =>
      api.post(`/api/issues/${issueId}/comments`, {
        body: comment,
        reviewState,
        fileIds: pendingAttachments.map((file) => file.fileId),
      }),
    onSuccess: () => {
      setComment('');
      setPendingAttachments([]);
      void qc.invalidateQueries({ queryKey: ['issue', issueId] });
      void qc.invalidateQueries({ queryKey: ['issues', projectId] });
    },
  });

  async function onPickAttachment(list: FileList | null) {
    if (!list?.length || !projectId) return;
    setUploadError('');
    setUploading(true);
    try {
      const uploaded = await Promise.all(
        Array.from(list).map(async (file) => ({
          fileId: await uploadFile(file, projectId),
          name: file.name,
        })),
      );
      setPendingAttachments((current) => [...current, ...uploaded]);
    } catch (error) {
      setUploadError(
        (error as { response?: { data?: { error?: string } } }).response?.data?.error ??
          'Attachment upload failed. Check your R2 configuration and try again.',
      );
    } finally {
      setUploading(false);
    }
  }

  if (!issue) {
    return <IssueDetailSkeleton />;
  }

  return (
    <div className="h-full overflow-y-auto px-10 py-8 animate-fade-in">
      <div className="mx-auto grid max-w-4xl grid-cols-[1fr_220px] gap-10">
        <div className="animate-fade-up">
          <Link
            to={`/projects/${projectId}`}
            className="premium-focus inline-flex items-center gap-1 text-sm text-muted hover:-translate-x-0.5 hover:text-ink"
          >
            <ChevronLeft size={14} /> {issue.project?.key} board
          </Link>

          <p className="mt-4 text-xs text-muted">{issue.issueKey}</p>
          <h1 className="mt-1 font-display text-3xl leading-tight">{issue.title}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <SeverityTag severity={issue.severity} />
            <span className="rounded border border-rust/40 px-1.5 py-0.5 text-xs capitalize text-rust">
              {issue.status.replace('_', ' ')}
            </span>
            <span className="rounded border border-line px-1.5 py-0.5 text-xs capitalize text-muted">
              {issue.type}
            </span>
            {issue.labels.map((l) => (
              <span
                key={l.id}
                className="rounded border border-line bg-surface px-1.5 py-0.5 text-xs text-muted animate-fade-in"
              >
                {l.name}
              </span>
            ))}
          </div>

          <Section title="Description">
            <p className="text-sm leading-relaxed text-ink/85">{issue.description}</p>
          </Section>

          {issue.stepsToReproduce.length > 0 && (
            <Section title="Steps to reproduce">
              <ol className="space-y-1.5">
                {issue.stepsToReproduce.map((s, i) => (
                  <li key={i} className="flex gap-3 text-sm text-ink/85">
                    <span className="text-muted">{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {(issue.expectedResult || issue.actualResult) && (
            <div className="mt-6 grid grid-cols-2 gap-3">
              {issue.expectedResult && (
                <div className="rounded-lg border border-line bg-surface p-3">
                  <p className="text-xs font-medium text-[#3f6f4e]">✓ Expected</p>
                  <p className="mt-1 text-sm text-ink/85">{issue.expectedResult}</p>
                </div>
              )}
              {issue.actualResult && (
                <div className="rounded-lg border border-line bg-[#fbf1ee] p-3">
                  <p className="text-xs font-medium text-rust">✕ Actual</p>
                  <p className="mt-1 text-sm text-ink/85">{issue.actualResult}</p>
                </div>
              )}
            </div>
          )}

          {issue.acceptanceCriteria.length > 0 && (
            <Section title="Acceptance criteria">
              <ul className="space-y-1.5">
                {issue.acceptanceCriteria.map((c, i) => (
                  <li key={i} className="flex gap-2 text-sm text-ink/85">
                    <span className="text-muted">•</span>
                    {c}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {(issue.files?.length ?? 0) > 0 && (
            <Section title="Attachments">
              <div className="flex flex-wrap gap-2">
                {issue.files?.map((f) => (
                  <Attachment key={f.file.id} fileId={f.file.id} name={f.file.fileName} type={f.file.contentType} />
                ))}
              </div>
            </Section>
          )}

          <div className="mt-8 border-t border-line pt-5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
              Activity · {issue.comments?.length ?? 0} updates
            </p>
            <div className="mt-4 space-y-5">
              {issue.comments?.map((c) => (
                <div key={c.id} className="flex gap-3 animate-fade-up">
                  <Avatar name={c.author?.name} size={28} />
                  <div className="flex-1">
                    <p className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{c.author?.name}</span>
                      {c.reviewState && c.reviewState !== 'commented' && (
                        <span
                          className={`rounded px-1.5 py-0.5 text-[11px] ${
                            c.reviewState === 'approved'
                              ? 'bg-[#e7efe8] text-[#3f6f4e]'
                              : 'bg-[#fbeae6] text-rust'
                          }`}
                        >
                          {c.reviewState === 'approved' ? 'approved' : 'requested changes'}
                        </span>
                      )}
                      <span className="text-xs text-muted">
                        {formatDistanceToNowStrict(new Date(c.createdAt))} ago
                      </span>
                    </p>
                    <div className="mt-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink/85">
                      {c.body}
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex gap-3">
                <Avatar name={user?.name} size={28} />
                <div className="premium-focus flex-1 rounded-lg border border-line bg-surface p-3 focus-within:border-rust/40 focus-within:shadow-[0_0_0_3px_rgba(192,85,45,0.08)]">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Leave a comment or review…"
                    className="h-16 w-full resize-none bg-transparent text-sm outline-none"
                  />
                  {pendingAttachments.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {pendingAttachments.map((file) => (
                        <span
                          key={file.fileId}
                          className="rounded border border-line bg-white px-2 py-1 text-[11px] text-muted animate-fade-up"
                        >
                          {file.name}
                        </span>
                      ))}
                      {uploading && <AttachmentUploadSkeleton label="Uploading" />}
                    </div>
                  )}
                  {uploading && pendingAttachments.length === 0 && (
                    <div className="mb-2">
                      <AttachmentUploadSkeleton label="Uploading" />
                    </div>
                  )}
                  {uploadError && <p className="mb-2 text-xs text-rust">{uploadError}</p>}
                  <div className="flex items-center gap-2">
                    <label className="premium-focus cursor-pointer rounded-md border border-line px-2.5 py-1.5 text-sm text-muted hover:border-rust/30 hover:text-ink active:scale-[0.99]">
                      <span className="flex items-center gap-1.5">
                        <ImageIcon size={14} />
                        <span>Image</span>
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(event) => onPickAttachment(event.target.files)}
                      />
                    </label>
                    <label className="premium-focus cursor-pointer rounded-md border border-line px-2.5 py-1.5 text-sm text-muted hover:border-rust/30 hover:text-ink active:scale-[0.99]">
                      <span className="flex items-center gap-1.5">
                        <Paperclip size={14} />
                        <span>Attachment</span>
                      </span>
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(event) => onPickAttachment(event.target.files)}
                      />
                    </label>
                    <button
                      disabled={!comment.trim() || addComment.isPending}
                      onClick={() => addComment.mutate('commented')}
                      className="premium-focus flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm text-muted hover:border-rust/30 hover:text-ink active:scale-[0.99] disabled:opacity-40"
                    >
                      {addComment.isPending && <Loader2 size={13} className="animate-spin" />}
                      Comment
                    </button>
                    <button
                      disabled={!comment.trim() || addComment.isPending}
                      onClick={() => addComment.mutate('approved')}
                      className="premium-focus rounded-md border border-line px-3 py-1.5 text-sm text-muted hover:border-rust/30 hover:text-ink active:scale-[0.99] disabled:opacity-40"
                    >
                      Approve
                    </button>
                    <button
                      disabled={!comment.trim() || addComment.isPending}
                      onClick={() => addComment.mutate('requested_changes')}
                      className="premium-focus rounded-md border border-line px-3 py-1.5 text-sm text-muted hover:border-rust/30 hover:text-ink active:scale-[0.99] disabled:opacity-40"
                    >
                      Request changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-5 text-sm animate-fade-up [animation-delay:80ms]">
          <Meta label="Status">
            <select
              value={issue.status}
              onChange={(e) => setStatus.mutate(e.target.value as IssueStatus)}
              disabled={setStatus.isPending}
              className="premium-focus w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm capitalize outline-none focus:border-rust disabled:animate-pulse disabled:opacity-70"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </select>
          </Meta>
          <Meta label="Severity">
            <SeverityTag severity={issue.severity} />
          </Meta>
          <Meta label="Reporter">
            <span className="flex items-center gap-2">
              <Avatar name={issue.reporter?.name} size={22} />
              {issue.reporter?.name ?? '—'}
            </span>
          </Meta>
          <Meta label="Created">
            {formatDistanceToNowStrict(new Date(issue.createdAt))} ago
          </Meta>
          {issue.environment && <Meta label="Environment">{issue.environment}</Meta>}
        </aside>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 animate-fade-up">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{title}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
      <div className="mt-1 text-ink/85">{children}</div>
    </div>
  );
}

function Attachment({ fileId, name, type }: { fileId: string; name: string; type: string }) {
  async function open() {
    try {
      const { data } = await api.get(`/api/uploads/${fileId}/url`);
      window.open(data.url, '_blank');
    } catch {
      // storage not configured
    }
  }
  const isImage = type.startsWith('image/');
  return (
    <button
      onClick={open}
      className="premium-focus flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-sm hover:-translate-y-0.5 hover:border-rust/40 active:translate-y-0"
    >
      <span className="flex h-6 w-6 items-center justify-center rounded bg-canvas text-muted">
        {isImage ? <ImageIcon size={14} /> : <FileText size={14} />}
      </span>
      <span className="truncate">{name}</span>
    </button>
  );
}
