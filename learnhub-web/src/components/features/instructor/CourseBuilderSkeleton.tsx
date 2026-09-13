import { Stepper } from '../../common';
import { CourseStatus } from '../../../types/course.types';
import CourseStepSkeleton from './CourseStepSkeleton';
import '../../../pages/instructor/InstructorCourseCreatePage.css';

export const COURSE_BUILD_STEPS = ['Tạo khóa học', 'Tạo bài giảng', 'Xem lại'];

const CourseBuilderSkeleton = ({
  reopening, step, status,
}: { reopening: boolean; step: number; status?: CourseStatus | null }) => {
  const readOnly = status != null && status !== 'DRAFT' && status !== 'REJECTED';
  const showSteps = !reopening || (status != null && !readOnly);
  return (
    <div className="course-create-page">
      <main className="course-create-main">
        <div className="container py-4">
          <div className="course-create-heading">
            <h1 className="course-create-title">
              {!reopening ? 'Tạo khóa học mới' : showSteps ? 'Soạn tiếp khóa học' : 'Nội dung khóa học'}
            </h1>
          </div>
          {showSteps && <Stepper steps={COURSE_BUILD_STEPS} current={step} />}
          {readOnly && <div className="alert alert-info">Khóa học đang ở trạng thái không cho phép sửa nội dung. Bạn vẫn có thể xem lại các bài giảng đã tạo bên dưới.</div>}
          <div className={step === 1 && !readOnly ? 'course-create-card' : undefined}>
            <CourseStepSkeleton step={step === 0 ? 'info' : step === 2 ? 'review' : 'lessons'} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default CourseBuilderSkeleton;
