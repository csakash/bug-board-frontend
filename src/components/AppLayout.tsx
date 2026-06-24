import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Avatar } from './ui';
import { SidebarProjectsSkeleton } from './Skeleton';
import { CreateProjectModal } from './CreateProjectModal';
import type { ProjectSummary } from '../types';

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => (await api.get('/api/projects')).data.projects as ProjectSummary[],
    staleTime: 10_000,
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
          <div className="premium-focus flex items-center gap-2 rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-muted hover:border-rust/30 hover:text-ink">
            <Search size={14} />
            <span>Search issues</span>
          </div>
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
                `premium-focus flex items-center justify-between rounded-md px-2 py-1.5 text-sm ${
                  isActive ? 'bg-surface text-ink shadow-sm' : 'text-ink/80 hover:bg-surface hover:text-ink'
                }`
              }
            >
              <span className="flex items-center gap-2 truncate">
                <span
                  className="h-2 w-2 flex-shrink-0 rounded-full"
                  style={{ background: p.color ?? '#c0552d' }}
                />
                <span className="truncate">{p.name}</span>
              </span>
              <span className="premium-focus text-xs text-muted">{p.activeCount || ''}</span>
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
    </div>
  );
}
