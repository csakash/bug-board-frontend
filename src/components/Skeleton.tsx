import clsx from 'clsx';

export function SkeletonBlock({
  className,
  rounded = 'rounded-md',
}: {
  className?: string;
  rounded?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={clsx('skeleton-shimmer animate-shimmer', rounded, className)}
    />
  );
}

export function AppShellSkeleton() {
  return (
    <div className="flex h-full animate-fade-in bg-canvas">
      <aside className="w-60 flex-shrink-0 border-r border-line p-4">
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-7 w-7" rounded="rounded-md" />
          <SkeletonBlock className="h-5 w-24" />
        </div>
        <SkeletonBlock className="mt-5 h-9 w-full" />
        <SkeletonBlock className="mt-7 h-3 w-16" />
        <div className="mt-3 space-y-2">
          {[0, 1, 2].map((item) => (
            <SkeletonBlock key={item} className="h-8 w-full" />
          ))}
        </div>
      </aside>
      <main className="flex-1 px-10 py-8">
        <SkeletonBlock className="h-3 w-28" />
        <SkeletonBlock className="mt-3 h-9 w-48" />
        <SkeletonBlock className="mt-3 h-5 w-96 max-w-full" />
        <div className="mt-8 grid max-w-4xl grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((item) => (
            <SkeletonBlock key={item} className="h-36 w-full" rounded="rounded-xl" />
          ))}
        </div>
      </main>
    </div>
  );
}

export function SidebarProjectsSkeleton() {
  return (
    <div className="space-y-1 px-2">
      {[0, 1, 2].map((item) => (
        <SkeletonBlock key={item} className="h-8 w-full" />
      ))}
    </div>
  );
}

export function ProjectsGridSkeleton() {
  return (
    <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
      {[0, 1, 2, 3].map((item) => (
        <SkeletonBlock
          key={item}
          className="h-36 w-full"
          rounded="rounded-xl"
        />
      ))}
    </div>
  );
}

export function BoardSkeleton() {
  return (
    <div className="mt-4 space-y-6 animate-fade-in">
      {[0, 1, 2].map((group) => (
        <section key={group}>
          <div className="flex items-center gap-2">
            <SkeletonBlock className="h-3 w-3" rounded="rounded-full" />
            <SkeletonBlock className="h-4 w-28" />
          </div>
          <div className="mt-2 space-y-1">
            {[0, 1].map((row) => (
              <SkeletonBlock key={row} className="h-10 w-full" />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function IssueDetailSkeleton() {
  return (
    <div className="h-full overflow-y-auto px-10 py-8 animate-fade-in">
      <div className="mx-auto grid max-w-4xl grid-cols-[1fr_220px] gap-10">
        <div>
          <SkeletonBlock className="h-4 w-24" />
          <SkeletonBlock className="mt-5 h-3 w-16" />
          <SkeletonBlock className="mt-2 h-16 w-4/5" />
          <div className="mt-4 flex gap-2">
            {[0, 1, 2, 3].map((item) => (
              <SkeletonBlock key={item} className="h-6 w-20" />
            ))}
          </div>
          <SkeletonBlock className="mt-8 h-3 w-28" />
          <SkeletonBlock className="mt-3 h-24 w-full" rounded="rounded-lg" />
          <SkeletonBlock className="mt-8 h-3 w-32" />
          <SkeletonBlock className="mt-3 h-28 w-full" rounded="rounded-lg" />
          <SkeletonBlock className="mt-8 h-40 w-full" rounded="rounded-lg" />
        </div>
        <aside className="space-y-6">
          {[0, 1, 2, 3].map((item) => (
            <div key={item}>
              <SkeletonBlock className="h-3 w-20" />
              <SkeletonBlock className="mt-2 h-7 w-full" />
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}

export function ChatMessageSkeleton() {
  return (
    <div className="flex animate-message-in-left gap-1 rounded-lg border border-line bg-canvas px-3 py-2 text-muted">
      {[0, 1, 2].map((dot) => (
        <span
          key={dot}
          className="h-1.5 w-1.5 rounded-full bg-muted animate-typing-dot"
          style={{ animationDelay: `${dot * 120}ms` }}
        />
      ))}
    </div>
  );
}

export function AttachmentUploadSkeleton({ label = 'Uploading' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded border border-line bg-canvas px-2 py-1 text-[11px] text-muted animate-fade-in">
      <SkeletonBlock className="h-3 w-3" rounded="rounded-sm" />
      {label}
    </span>
  );
}