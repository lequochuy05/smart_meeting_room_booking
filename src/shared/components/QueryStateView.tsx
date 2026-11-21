import type { ReactNode } from 'react';

import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import { StaleBanner } from '@/shared/components/StaleBanner';

interface QueryLike<TData> {
  data: TData | undefined;
  isPending: boolean;
  isError: boolean;
  isFetching: boolean;
  error: unknown;
  refetch: () => unknown;
}

interface QueryStateViewProps<TData> {
  query: QueryLike<TData>;
  isEmpty?: (data: TData) => boolean;
  empty: { title: string; message?: string; actionLabel?: string; onAction?: () => void };
  loadingMessage?: string;
  errorTitle?: string;
  children: (data: TData) => ReactNode;
}

/**
 * Applies the constitution's data-screen rules in one place: explicit loading,
 * empty, and retryable network-error states, and a stale banner when a refresh
 * fails while cached data is still on screen.
 */
export function QueryStateView<TData>({
  query,
  isEmpty,
  empty,
  loadingMessage,
  errorTitle,
  children,
}: QueryStateViewProps<TData>) {
  const retry = () => {
    void query.refetch();
  };

  if (query.data === undefined) {
    if (query.isError) {
      return <ErrorState error={query.error} title={errorTitle} onRetry={retry} retrying={query.isFetching} />;
    }
    if (query.isPending) return <LoadingState message={loadingMessage} />;
  }

  const data = query.data as TData;
  const staleBanner = query.isError ? <StaleBanner onRetry={retry} retrying={query.isFetching} /> : null;

  if (isEmpty?.(data)) {
    return (
      <>
        {staleBanner}
        <EmptyState {...empty} />
      </>
    );
  }
  return (
    <>
      {staleBanner}
      {children(data)}
    </>
  );
}
