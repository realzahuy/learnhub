import { useLayoutEffect } from 'react';
import { suppressNetworkProgress } from '../../services/networkActivity';
import './PageSkeleton.css';

export type PageSkeletonVariant = 'cards' | 'table' | 'detail' | 'stats' | 'form' | 'list';

interface PageSkeletonProps {
  variant?: PageSkeletonVariant;
  count?: number;
  className?: string;
}

const Lines = ({ shortLast = false }: { shortLast?: boolean }) => (
  <div className="app-skeleton-lines">
    <span />
    <span />
    <span className={shortLast ? 'is-short' : undefined} />
  </div>
);

const PageSkeleton = ({
  variant = 'detail',
  count,
  className = '',
}: PageSkeletonProps) => {
  const itemCount = count ?? (variant === 'cards' ? 6 : 5);

  useLayoutEffect(() => suppressNetworkProgress(), []);

  return (
    <div
      className={`app-skeleton app-skeleton-${variant} ${className}`.trim()}
      role="status"
      aria-label="Đang tải nội dung"
      aria-busy="true"
    >
      {variant === 'cards' && (
        <div className="app-skeleton-card-grid">
          {Array.from({ length: itemCount }, (_, index) => (
            <div className="app-skeleton-card" key={index}>
              <span className="app-skeleton-media" />
              <div className="app-skeleton-card-body"><Lines shortLast /></div>
            </div>
          ))}
        </div>
      )}

      {variant === 'table' && (
        <div className="app-skeleton-table">
          <div className="app-skeleton-table-head" />
          {Array.from({ length: itemCount }, (_, index) => (
            <div className="app-skeleton-table-row" key={index}>
              <span className="app-skeleton-avatar" />
              <span />
              <span />
              <span />
              <span className="is-short" />
            </div>
          ))}
        </div>
      )}

      {variant === 'detail' && (
        <div className="app-skeleton-detail">
          <div className="app-skeleton-detail-main">
            <span className="app-skeleton-title" />
            <Lines />
            <span className="app-skeleton-wide-media" />
            <Lines shortLast />
          </div>
          <div className="app-skeleton-detail-side">
            <span className="app-skeleton-media" />
            <Lines shortLast />
          </div>
        </div>
      )}

      {variant === 'stats' && (
        <>
          <div className="app-skeleton-stat-grid">
            {Array.from({ length: 4 }, (_, index) => (
              <div className="app-skeleton-stat" key={index}>
                <span />
                <span className="is-value" />
              </div>
            ))}
          </div>
          <div className="app-skeleton-chart">
            {Array.from({ length: 9 }, (_, index) => (
              <span key={index} style={{ height: `${28 + ((index * 17) % 58)}%` }} />
            ))}
          </div>
        </>
      )}

      {variant === 'form' && (
        <div className="app-skeleton-form">
          <span className="app-skeleton-title" />
          {Array.from({ length: itemCount }, (_, index) => (
            <div className="app-skeleton-field" key={index}>
              <span />
              <span />
            </div>
          ))}
        </div>
      )}

      {variant === 'list' && (
        <div className="app-skeleton-list">
          {Array.from({ length: itemCount }, (_, index) => (
            <div className="app-skeleton-list-item" key={index}>
              <span className="app-skeleton-avatar" />
              <Lines shortLast />
            </div>
          ))}
        </div>
      )}

      <span className="visually-hidden">Đang tải...</span>
    </div>
  );
};

export default PageSkeleton;
