import { Skeleton } from './ui/skeleton';

interface PageSkeletonProps {
  width?: number;
  height?: number;
  label?: string;
}

/** Skeleton placeholder mimicking a PDF page loading state. */
export function PageSkeleton({ width = 400, height = 560, label }: PageSkeletonProps) {
  return (
    <div
      role="status"
      aria-label={label ?? 'Loading page'}
      className="flex flex-col items-center justify-center gap-3"
      style={{ width, height }}
    >
      <Skeleton className="w-full h-full" />
      {label && <span className="text-xs text-gray-400 animate-pulse">{label}</span>}
    </div>
  );
}
