import React from 'react';
import { CourseFormState } from '../../../utils/courseForm';
import { formatPrice } from '../../../utils';
import { Lesson, Video } from '../../../types/lesson.types';
import { Question } from '../../../types/question.types';

interface CourseReviewStepProps {
  title?: string;
  form: CourseFormState;
  categoryName?: string;
  currentThumbnail: string | null;
  lessons: Lesson[];
  videos: Record<number, Video[]>;
  questions: Record<number, Question[]>;
}

const CourseReviewStep: React.FC<CourseReviewStepProps> = ({
  title = 'Xem lại trước khi hoàn tất',
  form,
  categoryName,
  currentThumbnail,
  lessons,
  videos,
  questions,
}) => {
  return (
    <div className="course-create-card">
      <h2 className="course-create-section-title">{title}</h2>
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

      <ol className="course-review-lessons">
        {lessons.map((lesson) => {
          const lessonVideos = videos[lesson.id] ?? [];
          const lessonQuestions = questions[lesson.id] ?? [];
          const uploading = lessonVideos.filter((video) => video.status === 'UPLOADING').length;
          const processing = lessonVideos.filter((video) => video.status === 'PROCESSING').length;
          const failed = lessonVideos.filter((video) => video.status === 'FAILED').length;
          const contentCount = lessonVideos.length + lessonQuestions.length;
          const videoStates = [
            uploading > 0 ? `${uploading} đang tải lên` : '',
            processing > 0 ? `${processing} đang xử lý` : '',
            failed > 0 ? `${failed} lỗi` : '',
          ].filter(Boolean);
          const videoSummary = `${lessonVideos.length} video${
            videoStates.length > 0 ? ` (${videoStates.join(', ')})` : ''
          }`;
          const summary = contentCount === 0
            ? 'Chưa có nội dung'
            : `${videoSummary} · ${lessonQuestions.length} câu hỏi`;

          return (
            <li key={lesson.id}>
              <span className="course-review-lesson-title">{lesson.title}</span>
              <span className={`lesson-status ${
                contentCount === 0
                  ? 'lesson-status-empty'
                  : failed > 0
                    ? 'lesson-status-failed'
                    : uploading > 0 || processing > 0
                    ? 'lesson-status-processing'
                    : 'lesson-status-ready'
              }`}>
                {summary}
              </span>
            </li>
          );
        })}
      </ol>

    </div>
  );
};

export default CourseReviewStep;
