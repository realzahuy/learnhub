import React from 'react';
import { CourseFormState } from '../../../utils/courseForm';
import { formatPrice } from '../../../utils';
import { Lesson, LessonKind, Video } from '../../../types/lesson.types';
import { Question } from '../../../types/question.types';

interface CourseReviewStepProps {
  form: CourseFormState;
  categoryName?: string;
  currentThumbnail: string | null;
  lessons: Lesson[];
  lessonKinds: Record<number, LessonKind>;
  videos: Record<number, Video[]>;
  questions: Record<number, Question[]>;
}

const CourseReviewStep: React.FC<CourseReviewStepProps> = ({
  form,
  categoryName,
  currentThumbnail,
  lessons,
  lessonKinds,
  videos,
  questions,
}) => {
  return (
    <div className="course-create-card">
      <h2 className="course-create-section-title">Xem lại trước khi hoàn tất</h2>
      <div className="course-review">
        <div className="course-review-thumb">
          {currentThumbnail ? (
            <img src={currentThumbnail} alt={form.title} />
          ) : (
            <div className="course-create-thumb-empty">Chưa có ảnh</div>
          )}
        </div>
        <dl className="course-review-fields">
          <dt>Tiêu đề</dt><dd>{form.title}</dd>
          <dt>Danh mục</dt><dd>{categoryName ?? '-'}</dd>
          <dt>Giá</dt><dd>{formatPrice(Number(form.price))}</dd>
          <dt>Mô tả ngắn</dt><dd>{form.shortDescription}</dd>
          <dt>Số bài giảng</dt><dd>{lessons.length}</dd>
        </dl>
      </div>

      {lessons.length > 0 && (
        <ol className="course-review-lessons">
          {lessons.map((lesson) => {
            const kind = lessonKinds[lesson.id] ?? 'VIDEO';
            const lessonVideos = videos[lesson.id] ?? [];
            const lessonQuestions = questions[lesson.id] ?? [];
            const processing = lessonVideos.filter((video) => video.status !== 'READY').length;
            const count = kind === 'QUIZ' ? lessonQuestions.length : lessonVideos.length;
            const summary = count === 0
              ? (kind === 'QUIZ' ? 'Chưa có câu hỏi' : 'Chưa có video')
              : kind === 'QUIZ'
                ? `${count} câu hỏi`
                : processing > 0
                  ? `${count} video (${processing} đang xử lý)`
                  : `${count} video`;

            return (
              <li key={lesson.id}>
                <span className="course-review-lesson-title">{lesson.title}</span>
                <span className={`lesson-status ${
                  count === 0
                    ? 'lesson-status-empty'
                    : processing > 0
                      ? 'lesson-status-processing'
                      : 'lesson-status-ready'
                }`}>
                  {summary}
                </span>
              </li>
            );
          })}
        </ol>
      )}

    </div>
  );
};

export default CourseReviewStep;
