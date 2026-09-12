import './PageSkeleton.css';

export type PageSkeletonVariant = 'cards' | 'table' | 'course-table' | 'detail' | 'stats' | 'form' | 'list' | 'lessons' | 'learning' | 'profile' | 'instructor-profile' | 'course-form' | 'categories';

interface PageSkeletonProps {
  variant?: PageSkeletonVariant;
  count?: number;
  className?: string;
  cardColumnClassName?: string;
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
  cardColumnClassName = 'col-12 col-sm-6 col-lg-4',
}: PageSkeletonProps) => {
  const itemCount = count ?? (variant === 'cards' ? 6 : 5);

  return (
    <div
      className={`app-skeleton app-skeleton-${variant} ${className}`.trim()}
      role="status"
      aria-label="Đang tải nội dung"
      aria-busy="true"
    >
      {variant === 'cards' && (
        <div className="row g-4">
          {Array.from({ length: itemCount }, (_, index) => (
            <div className={cardColumnClassName} key={index}>
              <div className="app-skeleton-card h-100">
                <span className="app-skeleton-media" />
                <div className="app-skeleton-card-body"><Lines shortLast /></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(variant === 'table' || variant === 'course-table') && (
        <div className="app-skeleton-table">
          <div className="app-skeleton-table-head" />
          {Array.from({ length: itemCount }, (_, index) => (
            <div className="app-skeleton-table-row" key={index}>
              {variant === 'course-table' ? (
                <span className="app-skeleton-table-thumb" />
              ) : (
                <div className="app-skeleton-user-cell">
                  <span className="app-skeleton-avatar" />
                  <Lines shortLast />
                </div>
              )}
              <span />
              <span />
              <span />
              <span className="is-short" />
              {variant === 'course-table' && <span />}
            </div>
          ))}
        </div>
      )}

      {variant === 'detail' && (
        <>
          <div className="course-hero app-skeleton-hero">
            <div className="container py-5">
              <span className="app-skeleton-breadcrumb mb-4" />
              <div className="row align-items-center g-4">
                <div className="col-lg-7"><span className="app-skeleton-title mb-3" /><Lines shortLast /></div>
                <div className="col-lg-5"><span className="app-skeleton-wide-media" /></div>
              </div>
            </div>
          </div>
          <div className="container my-5">
            <div className="row g-4">
              <div className="col-lg-8">
                <div className="app-skeleton-panel mb-4"><span className="app-skeleton-title mb-3" /><Lines /></div>
                <div className="app-skeleton-panel"><Lines /><div className="mt-4"><Lines /></div></div>
              </div>
              <div className="col-lg-4"><div className="app-skeleton-panel"><span className="app-skeleton-title mb-4" /><Lines shortLast /></div></div>
            </div>
          </div>
        </>
      )}

      {variant === 'stats' && (
        <>
          <div className="app-skeleton-stat-grid">
            {Array.from({ length: count ?? 4 }, (_, index) => (
              <div className="app-skeleton-stat" key={index}>
                <span />
                <span className="is-value" />
                <span />
              </div>
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

      {variant === 'course-form' && (
        <div className="row g-4">
          <div className="col-lg-8">
            <div className="app-skeleton-form">
              <div className="app-skeleton-field"><span /><span /></div>
              <div className="app-skeleton-field"><span /><span /></div>
              <div className="row g-3">
                <div className="col-md-6"><div className="app-skeleton-field"><span /><span /></div></div>
                <div className="col-md-6"><div className="app-skeleton-field"><span /><span /></div></div>
              </div>
              <div className="app-skeleton-field app-skeleton-textarea"><span /><span /></div>
              <div className="app-skeleton-field app-skeleton-description"><span /><span /></div>
            </div>
          </div>
          <div className="col-lg-4">
            <div className="app-skeleton-panel">
              <span className="app-skeleton-title mb-3" />
              <span className="app-skeleton-wide-media mb-3" />
              <Lines shortLast />
            </div>
          </div>
        </div>
      )}

      {variant === 'learning' && (
        <div className="learn-main">
          <div>
            <span className="app-skeleton-learning-video" />
            <div className="app-skeleton-panel mt-3"><span className="app-skeleton-title mb-4" /><Lines shortLast /></div>
          </div>
          <div className="app-skeleton-panel">
            <span className="app-skeleton-title mb-4" />
            {Array.from({ length: itemCount }, (_, index) => (
              <div className="app-skeleton-lesson" key={index}><Lines shortLast /></div>
            ))}
          </div>
        </div>
      )}

      {variant === 'profile' && (
        <>
        <div className="profile-card">
          <div className="row g-4">
            <div className="col-lg-3">
              <div className="profile-avatar-col"><span className="app-skeleton-profile-avatar" /><Lines shortLast /></div>
            </div>
            <div className="col-lg-9">
              <span className="app-skeleton-title mb-4" />
              {Array.from({ length: count ?? 4 }, (_, index) => (
                <div className="app-skeleton-profile-field" key={index}><Lines shortLast /></div>
              ))}
            </div>
          </div>
        </div>
        <div className="profile-card mt-4">
          <span className="app-skeleton-title mb-4" />
          <div className="app-skeleton-field app-skeleton-description"><span /><span /></div>
        </div>
        </>
      )}

      {variant === 'instructor-profile' && (
        <div className="instructor-hero">
          <div className="instructor-hero__top">
            <span className="app-skeleton-instructor-avatar" />
            <div className="app-skeleton-instructor-name"><span className="app-skeleton-title mb-3" /><Lines shortLast /></div>
          </div>
          <div className="mt-4"><Lines /></div>
          <div className="instructor-stats">
            {Array.from({ length: 4 }, (_, index) => (
              <div className="instructor-stat" key={index}><Lines shortLast /></div>
            ))}
          </div>
        </div>
      )}

      {variant === 'categories' && (
        <div className="admin-category-list">
          {Array.from({ length: itemCount }, (_, index) => (
            <div className="admin-category-row" key={index}>
              <span className="app-skeleton-category-name" /><span className="app-skeleton-category-action" />
            </div>
          ))}
        </div>
      )}

      {variant === 'lessons' && (
        <div className="app-skeleton-lessons">
          {Array.from({ length: itemCount }, (_, index) => (
            <div key={index} className="app-skeleton-lesson">
              <Lines shortLast />
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
