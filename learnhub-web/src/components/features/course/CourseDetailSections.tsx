import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CourseDetail, PublicLesson } from '../../../types/course.types';
import { formatDuration } from '../../../utils';
import { StarRating } from '../../common';
import { routeTo } from '../../../routes/paths';

export const CourseHero = ({
  course,
  averageRating,
  reviewCount,
  thumbnailFailed,
  onBrowseCourses,
  onBrowseCategory,
  onScrollToReviews,
  onThumbnailError,
}: {
  course: CourseDetail;
  averageRating: number;
  reviewCount: number;
  thumbnailFailed: boolean;
  onBrowseCourses: () => void;
  onBrowseCategory: () => void;
  onScrollToReviews: () => void;
  onThumbnailError: () => void;
}) => (
  <div className="course-hero bg-dark text-white">
    <div className="container py-5">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <button onClick={onBrowseCourses} className="btn btn-link text-white-50 p-0">Khóa học</button>
          </li>
          <li className="breadcrumb-item">
            <button onClick={onBrowseCategory} className="btn btn-link text-white-50 p-0">
              {course.categoryName}
            </button>
          </li>
          <li className="breadcrumb-item active text-white" aria-current="page">{course.title}</li>
        </ol>
      </nav>

      <div className="row align-items-center">
        <div className="col-lg-7">
          <h1 className="display-5 fw-bold mb-3">{course.title}</h1>
          <p className="lead mb-4">{course.shortDescription}</p>
          <div className="d-flex align-items-center gap-3 mb-3 flex-wrap">
            <span className="badge bg-notion px-3 py-2 d-inline-flex align-items-center">
              <i className="bi bi-tag me-2" />{course.categoryName}
            </span>
            {reviewCount > 0 && (
              <button type="button" className="course-rating-link" onClick={onScrollToReviews}>
                <StarRating value={averageRating} size="sm" showValue count={reviewCount} />
              </button>
            )}
          </div>
        </div>
        <div className="col-lg-5">
          <div className="course-preview-card">
            <div className="video-thumbnail">
              {course.thumbnail && !thumbnailFailed ? (
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="w-100 rounded"
                  onError={onThumbnailError}
                />
              ) : (
                <div className="video-thumbnail-empty" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const CourseCurriculum = ({
  lessons,
  onOpenPreview,
}: {
  lessons: PublicLesson[];
  onOpenPreview: (lesson: PublicLesson, videoId: number) => void;
}) => {
  const [openLessonIds, setOpenLessonIds] = useState<number[]>([]);
  const toggleLesson = (lessonId: number) => setOpenLessonIds((previous) => (
    previous.includes(lessonId)
      ? previous.filter((id) => id !== lessonId)
      : [...previous, lessonId]
  ));

  if (lessons.length === 0) return null;
  return (
    <div className="course-content-card mb-4">
      <h2 className="h4 fw-bold mb-3">Nội dung khóa học</h2>
      <ul className="curriculum-list">
        {lessons.map((lesson) => {
          const hasVideos = lesson.videos.length > 0;
          const hasQuiz = lesson.questionCount > 0;
          const isQuiz = !hasVideos && hasQuiz;
          const canExpand = hasVideos || hasQuiz;
          const expanded = openLessonIds.includes(lesson.id);
          return (
            <li key={lesson.id} className="curriculum-item">
              <button
                type="button"
                className="curriculum-row"
                onClick={() => canExpand && toggleLesson(lesson.id)}
                aria-expanded={canExpand ? expanded : undefined}
                aria-disabled={canExpand ? undefined : true}
              >
                <i className={`bi bi-chevron-down curriculum-chevron${
                  expanded ? '' : ' is-collapsed'
                }${canExpand ? '' : ' is-hidden'}`} />
                <i className={`bi ${isQuiz ? 'bi-patch-question' : 'bi-play-btn'} curriculum-icon`} />
                <span className="curriculum-title">{lesson.title}</span>
                {hasQuiz && <span className="curriculum-meta">{lesson.questionCount} câu hỏi</span>}
                {lesson.isPreview && hasVideos && <span className="curriculum-preview">Xem thử</span>}
              </button>

              {expanded && (
                <ul className="curriculum-sublist">
                  {lesson.videos.map((video) => (
                    <li key={video.id} className="curriculum-subitem">
                      {video.previewUrl ? (
                        <button
                          type="button"
                          className="curriculum-subrow is-playable"
                          onClick={() => onOpenPreview(lesson, video.id)}
                        >
                          <i className="bi bi-play-circle curriculum-subicon" />
                          <span className="curriculum-subtitle">{video.title}</span>
                          {video.durationSeconds != null && (
                            <span className="curriculum-duration">{formatDuration(video.durationSeconds)}</span>
                          )}
                        </button>
                      ) : (
                        <div className="curriculum-subrow">
                          <span className="curriculum-subtitle">{video.title}</span>
                          {video.durationSeconds != null && (
                            <span className="curriculum-duration">{formatDuration(video.durationSeconds)}</span>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                  {hasQuiz && (
                    <li className="curriculum-subitem">
                      <div className="curriculum-subrow">
                        <i className="bi bi-patch-question curriculum-subicon" />
                        <span className="curriculum-subtitle">Bài kiểm tra</span>
                        <span className="curriculum-duration">{lesson.questionCount} câu hỏi</span>
                      </div>
                    </li>
                  )}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export const InstructorCard = ({ course }: { course: CourseDetail }) => (
  <Link
    to={routeTo.profileInstructor(course.instructorId)}
    className="course-content-card instructor-card mb-4"
  >
    <h2 className="h4 fw-bold mb-3">Giảng viên</h2>
    <div className="d-flex align-items-center gap-3">
      <div className="instructor-avatar">
        {course.instructorAvatar ? (
          <img src={course.instructorAvatar} alt={course.instructorName} className="avatar-image" />
        ) : (
          <i className="bi bi-person-circle avatar-circle" aria-hidden="true" />
        )}
      </div>
      <div>
        <h5 className="mb-1">{course.instructorName}</h5>
        {course.instructorReviewCount > 0 && (
          <StarRating
            value={course.instructorAverageRating}
            size="sm"
            showValue
            count={course.instructorReviewCount}
          />
        )}
        <div className="instructor-card__hint">Xem hồ sơ giảng viên</div>
      </div>
    </div>
  </Link>
);
