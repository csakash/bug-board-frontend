import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronDown, FileText, MessageSquare, Paperclip } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { api } from '../lib/api';
import { Avatar, SeverityTag, StatusDot, Pill, STATUS_META } from '../components/ui';
import { ChatDrawer } from '../components/ChatDrawer';
import { ProjectDetailsModal } from '../components/ProjectDetailsModal';
import { BoardSkeleton, SkeletonBlock } from '../components/Skeleton';
import type { GroupedIssues, Issue, IssueStatus, ProjectDetail } from '../types';

const FILTERS: { key: 'all' | IssueStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved', label: 'Resolved' },
];

export function BoardPage() {
  const { projectId } = useParams();
  const [filter, setFilter] = useState<'all' | IssueStatus>('all');
  const [chatOpen, setChatOpen] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const qc = useQueryClient();

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () =>
      (await api.get(`/api/projects/${projectId}`)).data.project as ProjectDetail,
    enabled: !!projectId,
    staleTime: 10_000,
    // Poll fast while AI context is generating; otherwise keep members and
    // details fresh across users at a calmer cadence.
    refetchInterval: (query) => {
      const status = query.state.data?.contextStatus;
      return status === 'pending' || status === 'generating' ? 4000 : 7000;
    },
    refetchOnWindowFocus: true,
  });

  const { data, isLoading: issuesLoading } = useQuery({
    queryKey: ['issues', projectId],
    queryFn: async () =>
      (await api.get(`/api/projects/${projectId}/issues`)).data as {
        issues: Issue[];
        grouped: GroupedIssues;
      },
    enabled: !!projectId,
    staleTime: 5_000,
    // Cross-user freshness: other members' new/moved issues appear within ~7s.
    refetchInterval: 7000,
    refetchOnWindowFocus: true,
  });

  const counts = useMemo(() => {
    const g = data?.grouped;
    return {
      all: data?.issues.length ?? 0,
      open: g?.open.length ?? 0,
      in_progress: g?.in_progress.length ?? 0,
      resolved: g?.resolved.length ?? 0,
    };
  }, [data]);

  const loading = projectLoading || issuesLoading;
  const isEmpty = !loading && (data?.issues.length ?? 0) === 0;

  return (
    <div className="flex h-full animate-fade-in">
      <div className="flex-1 overflow-y-auto px-10 py-8">
        <div className="mx-auto max-w-4xl">
          <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted animate-fade-up">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: project?.color ?? '#c0552d' }}
            />
            {project?.key ?? <SkeletonBlock className="h-3 w-10" />}
          </p>
          <div className="mt-1 flex items-start justify-between animate-fade-up [animation-delay:40ms]">
            <div>
              <h1 className="font-display text-3xl">
                {project?.name ?? <SkeletonBlock className="h-9 w-56" />}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                {project ? (
                  <>
                    <span>{counts.all} total issues</span>
                    <span className="h-1 w-1 rounded-full bg-muted/50" />
                    <span className="capitalize">AI context {project.contextStatus.replace('_', ' ')}</span>
                  </>
                ) : (
                  <SkeletonBlock className="h-4 w-64" />
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDetailsOpen(true)}
                disabled={!project}
                className="premium-focus flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-2 text-sm font-medium text-muted hover:border-rust/30 hover:text-ink active:scale-[0.99] disabled:opacity-50"
              >
                <FileText size={14} /> Project details
              </button>
              {!chatOpen && (
                <button
                  onClick={() => setChatOpen(true)}
                  className="premium-focus flex items-center gap-1.5 rounded-md bg-rust px-3 py-2 text-sm font-medium text-white hover:bg-rust-dark active:scale-[0.99]"
                >
                  <MessageSquare size={14} /> Add an issue
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 flex gap-1 border-b border-line pb-px animate-fade-up [animation-delay:80ms]">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`premium-focus flex items-center gap-1.5 rounded-t-md px-3 py-1.5 text-sm ${
                  filter === f.key ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:bg-surface/50 hover:text-ink'
                }`}
              >
                {f.label}
                <span className="text-xs text-muted">{counts[f.key]}</span>
              </button>
            ))}
          </div>

          {loading ? (
            <BoardSkeleton />
          ) : isEmpty ? (
            <div className="mt-16 text-center text-muted">
              <p className="font-display text-xl text-ink">No issues yet</p>
              <p className="mt-1 text-sm">
                Use the chat on the right to create your first issue.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-6 animate-fade-in">
              {(['open', 'in_progress', 'resolved'] as IssueStatus[])
                .filter((s) => filter === 'all' || filter === s)
                .map((status) => (
                  <IssueGroup
                    key={status}
                    status={status}
                    issues={data?.grouped[status] ?? []}
                    onPrefetch={(issueId) => {
                      void qc.prefetchQuery({
                        queryKey: ['issue', issueId],
                        queryFn: async () => (await api.get(`/api/issues/${issueId}`)).data.issue,
                        staleTime: 5_000,
                      });
                    }}
                  />
                ))}
            </div>
          )}
        </div>
      </div>

      <ChatDrawer
        projectId={projectId!}
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        emptyBoard={isEmpty}
      />

      {detailsOpen && project && (
        <ProjectDetailsModal
          project={project}
          issueCounts={{
            total: counts.all,
            open: counts.open,
            inProgress: counts.in_progress,
            resolved: counts.resolved,
          }}
          onClose={() => setDetailsOpen(false)}
        />
      )}
    </div>
  );
}

function IssueGroup({
  status,
  issues,
  onPrefetch,
}: {
  status: IssueStatus;
  issues: Issue[];
  onPrefetch: (issueId: string) => void;
}) {
  const navigate = useNavigate();
  const { projectId } = useParams();
  if (issues.length === 0) {
    return (
      <section>
        <GroupHeader status={status} count={0} />
        <p className="px-2 py-3 text-sm text-muted animate-fade-in">No issues here.</p>
      </section>
    );
  }
  return (
    <section>
      <GroupHeader status={status} count={issues.length} />
      <div className="mt-1">
        {issues.map((issue, index) => (
          <button
            key={issue.id}
            onMouseEnter={() => onPrefetch(issue.id)}
            onFocus={() => onPrefetch(issue.id)}
            onClick={() => navigate(`/projects/${projectId}/issues/${issue.id}`)}
            className="premium-focus flex w-full items-center gap-3 border-b border-line/60 px-2 py-2.5 text-left animate-fade-up hover:bg-surface active:scale-[0.997]"
            style={{ animationDelay: `${Math.min(index * 35, 180)}ms` }}
          >
            <span
              className="h-2 w-2 flex-shrink-0 rounded-full"
              style={{ background: STATUS_META[issue.status].dot }}
            />
            <span className="w-16 flex-shrink-0 text-xs text-muted">{issue.issueKey}</span>
            <span className="flex-1 truncate text-sm text-ink">{issue.title}</span>
            <span className="flex flex-shrink-0 items-center gap-2">
              {issue.labels.slice(0, 2).map((l) => (
                <Pill key={l.id}>{l.name}</Pill>
              ))}
              {(issue._count?.comments ?? 0) > 0 && (
                <span className="flex items-center gap-0.5 text-xs text-muted">
                  <MessageSquare size={12} /> {issue._count?.comments}
                </span>
              )}
              {(issue._count?.files ?? 0) > 0 && <Paperclip size={12} className="text-muted" />}
              <SeverityTag severity={issue.severity} />
              <span className="w-16 text-right text-xs text-muted">
                {formatDistanceToNowStrict(new Date(issue.createdAt))} ago
              </span>
              <Avatar name={issue.reporter?.name} size={22} />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function GroupHeader({ status, count }: { status: IssueStatus; count: number }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <ChevronDown size={14} className="text-muted" />
      <StatusDot status={status} />
      <span className="font-medium">{STATUS_META[status].label}</span>
      <span className="text-xs text-muted">{count}</span>
    </div>
  );
}
