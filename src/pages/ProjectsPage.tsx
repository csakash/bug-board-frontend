import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import { ProjectsGridSkeleton } from '../components/Skeleton';
import { CreateProjectModal } from '../components/CreateProjectModal';
import type { ProjectSummary } from '../types';

export function ProjectsPage() {
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => (await api.get('/api/projects')).data.projects as ProjectSummary[],
    staleTime: 10_000,
    // Poll so newly accepted memberships and cross-user activity appear.
    refetchInterval: 7000,
    refetchOnWindowFocus: true,
  });

  return (
    <div className="h-full overflow-y-auto px-10 py-8 animate-fade-in">
      <div className="mx-auto max-w-4xl">
        <p className="text-[11px] font-medium uppercase tracking-wide text-rust animate-fade-up">
          Your workspace
        </p>
        <h1 className="mt-1 font-display text-3xl animate-fade-up [animation-delay:40ms]">Projects</h1>
        <p className="mt-2 max-w-lg text-sm text-muted animate-fade-up [animation-delay:80ms]">
          Each project keeps its own bug board. Open one to triage issues, or start a chat
          to file a new issue in seconds.
        </p>

        {isLoading ? <ProjectsGridSkeleton /> : <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {projects?.map((p) => (
            <button
              key={p.id}
              onMouseEnter={() => {
                void qc.prefetchQuery({
                  queryKey: ['project', p.id],
                  queryFn: async () => (await api.get(`/api/projects/${p.id}`)).data.project,
                  staleTime: 10_000,
                });
                void qc.prefetchQuery({
                  queryKey: ['issues', p.id],
                  queryFn: async () => (await api.get(`/api/projects/${p.id}/issues`)).data,
                  staleTime: 5_000,
                });
              }}
              onClick={() => navigate(`/projects/${p.id}`)}
              className="premium-focus flex h-[230px] flex-col rounded-xl border border-line bg-surface p-5 text-left shadow-sm animate-fade-up hover:-translate-y-0.5 hover:border-rust/40 hover:shadow-md active:translate-y-0"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted">
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ background: p.color ?? '#c0552d' }}
                  />
                  {p.key}
                </span>
                <span className="text-xs text-muted">{p.issueCount} issues</span>
              </div>
              <h3 className="mt-3 font-display text-xl">{p.name}</h3>
              <p className="mt-2 h-[4.5rem] overflow-hidden text-sm leading-6 text-muted [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]">
                {getProjectCardSummary(p)}
              </p>
              <div className="mt-auto flex items-center justify-between pt-5">
                <span className="flex items-center gap-1.5 text-xs text-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-rust" />
                  {p.activeCount} active
                  {p.contextStatus !== 'ready' && (
                    <span className="ml-2 inline-flex items-center gap-1 text-muted">
                      <Loader2 size={11} className="animate-spin" /> context
                    </span>
                  )}
                </span>
              </div>
            </button>
          ))}

          <button
            onClick={() => setShowModal(true)}
            className="premium-focus flex min-h-[160px] flex-col items-center justify-center rounded-xl border border-dashed border-line text-muted animate-fade-up hover:-translate-y-0.5 hover:border-rust/50 hover:text-ink active:translate-y-0"
          >
            <Plus size={20} />
            <span className="mt-2 text-sm">New project</span>
          </button>
        </div>}
      </div>

      {showModal && <CreateProjectModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

function getProjectCardSummary(project: ProjectSummary): string {
  if (project.summary?.trim()) return shortenPlainText(project.summary, 170);
  return shortenPlainText(project.description, 170);
}

function shortenPlainText(value: string, maxLength: number): string {
  const cleaned = value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_~|\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length <= maxLength) return cleaned;
  const clipped = cleaned.slice(0, maxLength).replace(/\s+\S*$/, '').trim();
  return `${clipped}...`;
}

