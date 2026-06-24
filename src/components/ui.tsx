import clsx from 'clsx';
import type { IssueStatus, Severity } from '../types';

export function initials(name?: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const AVATAR_COLORS = ['#c0552d', '#3f6f4e', '#5b5bd6', '#b8860b', '#9a3b6e'];

export function avatarColor(seed?: string | null): string {
  if (!seed) return AVATAR_COLORS[0];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = seed.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export function Avatar({ name, size = 24 }: { name?: string | null; size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-medium text-white transition-transform duration-200 ease-premium hover:scale-[1.04]"
      style={{
        width: size,
        height: size,
        background: avatarColor(name),
        fontSize: size * 0.4,
      }}
      title={name ?? ''}
    >
      {initials(name)}
    </span>
  );
}

export const STATUS_META: Record<IssueStatus, { label: string; dot: string }> = {
  open: { label: 'Open', dot: '#c0552d' },
  in_progress: { label: 'In Progress', dot: '#d39a2b' },
  resolved: { label: 'Resolved', dot: '#3f6f4e' },
};

export function StatusDot({ status }: { status: IssueStatus }) {
  return (
    <span
      className="inline-block h-2 w-2 rounded-full transition-transform duration-200 ease-premium"
      style={{ background: STATUS_META[status].dot }}
    />
  );
}

const SEVERITY_COLORS: Record<Severity, string> = {
  low: '#8a857c',
  medium: '#d39a2b',
  high: '#c0552d',
  critical: '#b0281f',
};

export function SeverityTag({ severity }: { severity?: Severity | null }) {
  if (!severity) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs animate-fade-in" style={{ color: SEVERITY_COLORS[severity] }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: SEVERITY_COLORS[severity] }} />
      {severity[0].toUpperCase() + severity.slice(1)}
    </span>
  );
}

export function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded border border-line bg-surface px-1.5 py-0.5 text-[11px] text-muted',
        'transition-colors duration-200 ease-premium',
        className,
      )}
    >
      {children}
    </span>
  );
}
