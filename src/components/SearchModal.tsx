import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Loader2, Search, X } from 'lucide-react';
import { searchIssues } from '../lib/api';
import { SeverityTag, STATUS_META } from './ui';
import type { SearchIssue } from '../types';

interface Props {
  onClose: () => void;
}

export function SearchModal({ onClose }: Props) {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce the typed value before hitting the API.
  useEffect(() => {
    const id = setTimeout(() => setQuery(input.trim()), 200);
    return () => clearTimeout(id);
  }, [input]);

  const { data, isFetching } = useQuery({
    queryKey: ['search', query],
    queryFn: () => searchIssues(query),
    enabled: query.length > 0,
    staleTime: 5_000,
  });

  const results = useMemo<SearchIssue[]>(() => data ?? [], [data]);

  useEffect(() => {
    setSelected(0);
  }, [results]);

  function openIssue(issue: SearchIssue) {
    navigate(`/projects/${issue.projectId}/issues/${issue.id}`);
    onClose();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === 'Enter' && results[selected]) {
      e.preventDefault();
      openIssue(results[selected]);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/35 px-4 pt-[12vh] animate-fade-in"
      onMouseDown={onClose}
    >
      <div
        className="flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xl animate-slide-up-soft"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <Search size={16} className="text-muted" />
          <input
            ref={inputRef}
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search issues by title, ID, severity, or status…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
          />
          {isFetching && <Loader2 size={14} className="animate-spin text-muted" />}
          <button
            onClick={onClose}
            className="premium-focus rounded p-1 text-muted hover:bg-canvas hover:text-ink active:scale-95"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto py-1">
          {query.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted">
              Try a title, an ID like <span className="text-ink">MOB-2</span>, or a keyword like{' '}
              <span className="text-ink">critical</span>.
            </p>
          ) : results.length === 0 && !isFetching ? (
            <p className="px-4 py-6 text-center text-sm text-muted">
              No issues match “{query}”.
            </p>
          ) : (
            results.map((issue, index) => (
              <button
                key={issue.id}
                onMouseEnter={() => setSelected(index)}
                onClick={() => openIssue(issue)}
                className={`premium-focus flex w-full items-center gap-3 px-4 py-2.5 text-left ${
                  index === selected ? 'bg-canvas' : 'hover:bg-canvas/60'
                }`}
              >
                <span
                  className="h-2 w-2 flex-shrink-0 rounded-full"
                  style={{ background: issue.project?.color ?? '#c0552d' }}
                />
                <span className="w-16 flex-shrink-0 text-xs text-muted">{issue.issueKey}</span>
                <span className="flex-1 truncate text-sm text-ink">{issue.title}</span>
                <span className="flex flex-shrink-0 items-center gap-2">
                  <SeverityTag severity={issue.severity} />
                  <span className="text-xs text-muted">{STATUS_META[issue.status].label}</span>
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
