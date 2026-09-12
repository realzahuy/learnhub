import PageSkeleton from '../../common/PageSkeleton';

const CourseStepSkeleton = ({ step }: { step: 'info' | 'lessons' | 'review' }) => (
  <div className="course-step-loading" role="status" aria-label="Đang tải dữ liệu khóa học">
    {step === 'lessons' && <h2 className="course-create-section-title">Bài giảng của khóa học</h2>}
    {step === 'review' ? (
      <div className="course-create-card app-skeleton">
        <h2 className="course-create-section-title">Xem lại trước khi hoàn tất</h2>
        <div className="course-review">
          <span className="course-review-thumb app-skeleton-wide-media" />
          <div className="app-skeleton-lines">
            {Array.from({ length: 5 }, (_, index) => <span key={index} />)}
          </div>
        </div>
        <PageSkeleton variant="lessons" count={3} className="mt-4" />
      </div>
    ) : (
      <PageSkeleton variant={step === 'info' ? 'course-form' : 'lessons'} count={3} />
    )}
  </div>
);

export default CourseStepSkeleton;
