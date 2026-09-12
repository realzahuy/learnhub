import PageSkeleton from '../../common/PageSkeleton';

const CourseStepSkeleton = ({ step }: { step: 'info' | 'lessons' | 'review' }) => (
  <div className="course-step-loading" role="status" aria-label="Đang mở nội dung bước">
    <h2 className="course-create-section-title">
      {step === 'info' ? 'Thông tin khóa học' : step === 'lessons' ? 'Bài giảng của khóa học' : 'Xem lại trước khi hoàn tất'}
    </h2>
    <PageSkeleton variant={step === 'info' ? 'form' : 'lessons'} count={step === 'info' ? 5 : 3} />
  </div>
);

export default CourseStepSkeleton;
