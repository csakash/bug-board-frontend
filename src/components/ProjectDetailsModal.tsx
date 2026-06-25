import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, FileText, Image as ImageIcon, Layers, Tag, X } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { api } from '../lib/api';
import type { ProjectDetail, ProjectFileRef } from '../types';

type DetailTab = 'overview' | 'screenshots' | 'context';

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
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {tab === 'overview' && (
            <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
              <section className="rounded-lg border border-line bg-white p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-medium text-ink">
                  <FileText size={15} className="text-rust" /> Project brief
                </div>
                <MarkdownView content={project.description} />
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
            <section className="grid gap-4 lg:grid-cols-2">
              {project.context ? (
                <>
                  <ContextCard title="Summary" items={[project.context.summary]} paragraph />
                  <ContextCard title="Audience" items={project.context.audience ? [project.context.audience] : []} paragraph />
                  <ContextCard title="Components" items={project.context.components} />
                  <ContextCard title="Flows" items={project.context.flows} />
                  <ContextCard title="Terminology" items={project.context.terminology} />
                  <ContextCard title="Risks" items={project.context.risks} icon={<AlertTriangle size={14} />} />
                  <ContextCard title="Open questions" items={project.context.openQuestions} />
                  <ContextCard title="Suggested labels" items={project.context.suggestedLabels} />
                </>
              ) : (
                <EmptyState icon={<Layers size={22} />} title="AI context is still being generated" />
              )}
            </section>
          )}
        </div>
      </div>
    </div>
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

function EmptyState({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-lg border border-dashed border-line bg-white text-muted">
      {icon}
      <p className="mt-2 text-sm">{title}</p>
    </div>
  );
}

function MarkdownView({ content }: { content: string }) {
  const lines = content.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const className = level === 1 ? 'text-2xl' : level === 2 ? 'text-xl' : 'text-lg';
      blocks.push(
        <h3 key={index} className={`mt-5 font-display ${className} text-ink first:mt-0`}>
          {renderInline(heading[2])}
        </h3>,
      );
      index += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quote.push(lines[index].replace(/^>\s?/, ''));
        index += 1;
      }
      blocks.push(
        <blockquote key={index} className="border-l-2 border-rust/50 bg-canvas px-4 py-3 text-sm text-ink/80">
          {quote.map((q) => renderInline(q))}
        </blockquote>,
      );
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*[-*]\s+/, ''));
        index += 1;
      }
      blocks.push(
        <ul key={index} className="my-3 list-disc space-y-1 pl-5 text-sm leading-6 text-ink/80">
          {items.map((item) => (
            <li key={item}>{renderInline(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*\d+\.\s+/, ''));
        index += 1;
      }
      blocks.push(
        <ol key={index} className="my-3 list-decimal space-y-1 pl-5 text-sm leading-6 text-ink/80">
          {items.map((item) => (
            <li key={item}>{renderInline(item)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    const paragraph: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{1,3})\s+/.test(lines[index]) &&
      !/^>\s?/.test(lines[index]) &&
      !/^\s*[-*]\s+/.test(lines[index]) &&
      !/^\s*\d+\.\s+/.test(lines[index])
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }
    blocks.push(
      <p key={index} className="my-3 text-sm leading-7 text-ink/80">
        {renderInline(paragraph.join(' '))}
      </p>,
    );
  }

  return <div className="prose max-w-none">{blocks}</div>;
}

function renderInline(text: string) {
  const parts: React.ReactNode[] = [];
  const pattern = /(\[[^\]]+\]\([^\)]+\)|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const token = match[0];
    if (token.startsWith('[')) {
      const link = /^\[([^\]]+)\]\(([^\)]+)\)$/.exec(token);
      if (link) {
        parts.push(
          <a key={`${token}-${match.index}`} href={link[2]} target="_blank" rel="noreferrer" className="text-rust underline underline-offset-2">
            {link[1]}
          </a>,
        );
      }
    } else if (token.startsWith('`')) {
      parts.push(
        <code key={`${token}-${match.index}`} className="rounded bg-canvas px-1 py-0.5 text-xs text-ink">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith('**')) {
      parts.push(<strong key={`${token}-${match.index}`}>{token.slice(2, -2)}</strong>);
    } else {
      parts.push(<em key={`${token}-${match.index}`}>{token.slice(1, -1)}</em>);
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}
