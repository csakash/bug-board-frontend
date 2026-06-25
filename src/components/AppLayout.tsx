import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import { Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { api, deleteProject } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Avatar } from './ui';
import { SidebarProjectsSkeleton } from './Skeleton';
import { CreateProjectModal } from './CreateProjectModal';
import { SearchModal } from './SearchModal';
import type { ProjectSummary } from '../types';

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { projectId: activeProjectId } = useParams<{ projectId?: string }>();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ProjectSummary | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => (await api.get('/api/projects')).data.projects as ProjectSummary[],
    staleTime: 10_000,
  });

  // Open search with Cmd/Ctrl+K from anywhere in the app.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: ['projects'] });
      setPendingDelete(null);
      if (activeProjectId === id) navigate('/');
    },
  });

  return (
    <div className="flex h-full animate-fade-in">
      <aside className="flex w-60 flex-shrink-0 flex-col border-r border-line bg-canvas transition-colors duration-200 ease-premium">
        <div className="flex items-center gap-2 px-4 py-4 animate-fade-up">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-rust text-sm font-semibold text-white shadow-sm transition-transform duration-200 ease-premium hover:scale-[1.03]">
            B
          </span>
          <span className="font-display text-lg">Bug Board</span>
        </div>

        <div className="px-3">
          <button
            onClick={() => setShowSearch(true)}
            className="premium-focus flex w-full items-center gap-2 rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-muted hover:border-rust/30 hover:text-ink"
          >
            <Search size={14} />
            <span className="flex-1 text-left">Search issues</span>
            <kbd className="rounded border border-line bg-canvas px-1 text-[10px] font-medium text-muted">
              ⌘K
            </kbd>
          </button>
        </div>

        <div className="mt-5 flex items-center justify-between px-4 text-[11px] font-medium uppercase tracking-wide text-muted">
          <span>Projects</span>
          <button
            onClick={() => setShowCreate(true)}
            title="New project"
            className="premium-focus flex h-5 w-5 items-center justify-center rounded text-muted hover:bg-surface hover:text-ink active:scale-95"
          >
            <Plus size={14} />
          </button>
        </div>
        <nav className="mt-1 flex-1 space-y-0.5 px-2">
          {isLoading && <SidebarProjectsSkeleton />}
          {data?.map((p) => (
            <NavLink
              key={p.id}
              to={`/projects/${p.id}`}
              className={({ isActive }) =>
                `group premium-focus flex items-center justify-between rounded-md px-2 py-1.5 text-sm ${
                  isActive ? 'bg-surface text-ink shadow-sm' : 'text-ink/80 hover:bg-surface hover:text-ink'
                }`
              }
            >
              <span className="flex min-w-0 items-center gap-2 truncate">
                <span
                  className="h-2 w-2 flex-shrink-0 rounded-full"
                  style={{ background: p.color ?? '#c0552d' }}
                />
                <span className="truncate">{p.name}</span>
              </span>
              <span className="flex flex-shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setPendingDelete(p);
                  }}
                  title="Delete project"
                  className="premium-focus rounded p-0.5 text-muted opacity-0 transition-opacity hover:bg-canvas hover:text-rust focus:opacity-100 group-hover:opacity-100"
                >
                  <Trash2 size={13} />
                </button>
                <span className="text-xs text-muted">{p.activeCount || ''}</span>
              </span>
            </NavLink>
          ))}
        </nav>

        <button
          onClick={async () => {
            await logout();
            navigate('/login');
          }}
          className="premium-focus flex items-center gap-2 border-t border-line px-4 py-3 text-left hover:bg-surface"
        >
          <Avatar name={user?.name} size={28} />
          <span className="leading-tight">
            <span className="block text-sm">{user?.name}</span>
            <span className="block text-xs text-muted">Sign out</span>
          </span>
        </button>
      </aside>

      <main className="flex-1 overflow-hidden bg-canvas animate-fade-in">
        <Outlet />
      </main>

      {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} />}
      {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}
      {pendingDelete && (
        <DeleteProjectDialog
          project={pendingDelete}
          deleting={deleteMutation.isPending}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => deleteMutation.mutate(pendingDelete.id)}
        />
      )}
    </div>
  );
}

function DeleteProjectDialog({
  project,
  deleting,
  onCancel,
  onConfirm,
}: {
  project: ProjectSummary;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 animate-fade-in"
      onMouseDown={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-line bg-surface p-5 shadow-xl animate-slide-up-soft"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-lg text-ink">Delete project</h2>
        <p className="mt-2 text-sm text-muted">
          Delete <span className="font-medium text-ink">{project.name}</span> and all of its issues,
          attachments, and chat history? This can’t be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="premium-focus rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-muted hover:text-ink active:scale-[0.99] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="premium-focus flex items-center gap-1.5 rounded-md bg-rust px-3 py-1.5 text-sm font-medium text-white hover:bg-rust-dark active:scale-[0.99] disabled:opacity-60"
          >
            {deleting && <Loader2 size={14} className="animate-spin" />}
            Delete project
          </button>
        </div>
      </div>
    </div>
  );
}

