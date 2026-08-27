import React, { useEffect, useState } from 'react';
import { HlsPlayer, PageSkeleton } from '../../components/common';
import { adminService } from '../../services/api/admin.service';
import { AdminCourseContent, AdminLessonContent } from '../../types/learn.types';
import { formatDuration, getApiErrorMessage } from '../../utils';
import './AdminCourseContentPanel.css';

interface AdminCourseContentPanelProps {
  courseId: number;
}

const describeContent = (lesson: AdminLessonContent): string => {
  if (lesson.questions.length > 0) return `${lesson.questions.length} câu hỏi`;
  if (lesson.videos.length > 0) return `${lesson.videos.length} video`;
  return 'Chưa có nội dung';
};

const LessonBlock: React.FC<{ lesson: AdminLessonContent }> = ({ lesson }) => {
  const [expanded, setExpanded] = useState(false);

  const [playingId, setPlayingId] = useState<number | null>(null);

  const playing = lesson.videos.find((video) => video.id === playingId) ?? null;

  return (
    <li className="admin-content-lesson">
      <button
        type="button"
        className={`admin-content-lesson-head${expanded ? ' is-open' : ''}`}
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
      >
        <span className="admin-content-lesson-title">{lesson.title}</span>

        {lesson.isPreview && <span className="admin-content-preview">Xem thử</span>}

        <span className="admin-content-lesson-meta">{describeContent(lesson)}</span>

        <i className={`bi bi-chevron-down admin-content-chevron${expanded ? ' is-open' : ''}`}></i>
      </button>

      {expanded && (
        <div className="admin-content-lesson-body">
          {lesson.videos.map((video) => (
            <div key={video.id} className="admin-content-video">
              <button
                type="button"
                className="admin-content-video-row"
                onClick={() => setPlayingId(playingId === video.id ? null : video.id)}

                disabled={!video.playbackUrl}
                title={
                  video.playbackUrl
                    ? 'Bấm để xem video'
                    : 'Video đang được xử lý, chưa xem được'
                }
              >
                <i
                  className={`bi ${
                    playingId === video.id ? 'bi-pause-circle' : 'bi-play-circle'
                  }`}
                ></i>
                <span className="admin-content-video-title">{video.title}</span>
                <span className="admin-content-video-meta">
                  {video.playbackUrl
                    ? video.durationSeconds
                      ? formatDuration(video.durationSeconds)
                      : ''
                    : 'Đang xử lý'}
                </span>
              </button>

              {playing?.id === video.id && video.playbackUrl && (
                <div className="admin-content-player">
                  <HlsPlayer playbackUrl={video.playbackUrl} className="admin-content-video-el" />
                </div>
              )}
            </div>
          ))}

          {lesson.questions.map((question, qIndex) => (
            <div key={question.id} className="admin-content-question">
              <p className="admin-content-question-text">
                <span className="admin-content-question-no">Câu {qIndex + 1}.</span>
                {question.question}
              </p>
              <ul className="admin-content-answers">
                {question.answers.map((answer) => (

                  <li
                    key={answer.id}
                    className={answer.isCorrect ? 'is-correct' : undefined}
                  >
                    <i className={`bi ${answer.isCorrect ? 'bi-check-circle-fill' : 'bi-circle'}`}></i>
                    {answer.answer}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {lesson.videos.length === 0 && lesson.questions.length === 0 && (
            <p className="admin-content-empty-lesson">Bài giảng này chưa có nội dung nào.</p>
          )}
        </div>
      )}
    </li>
  );
};

const AdminCourseContentPanel: React.FC<AdminCourseContentPanelProps> = ({ courseId }) => {
  const [content, setContent] = useState<AdminCourseContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    adminService
      .getCourseContent(courseId, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setContent(data);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(getApiErrorMessage(err, 'Không tải được nội dung khóa học.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [courseId]);

  if (loading) {
    return <PageSkeleton variant="list" count={4} />;
  }

  if (error) {
    return <div className="alert alert-warning py-2 mb-0">{error}</div>;
  }

  if (!content) return null;

  return (
    <div className="admin-content-panel">
      <p className="admin-content-summary">{content.lessons.length} bài giảng</p>

      <ul className="admin-content-lessons">
        {content.lessons.map((lesson) => (
          <LessonBlock key={lesson.id} lesson={lesson} />
        ))}
      </ul>
    </div>
  );
};

export default AdminCourseContentPanel;
