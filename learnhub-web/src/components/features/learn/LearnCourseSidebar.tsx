import { LearnCourse, LearnVideo } from '../../../types/learn.types';
import { formatDuration } from '../../../utils';
import { Viewing } from './learnView.types';

interface LearnCourseSidebarProps {
  course: LearnCourse;
  viewing: Viewing | null;
  onOpenVideo: (lessonId: number, video: LearnVideo) => void;
  onOpenQuiz: (lessonId: number) => void;
}

const LearnCourseSidebar = ({
  course,
  viewing,
  onOpenVideo,
  onOpenQuiz,
}: LearnCourseSidebarProps) => (
  <aside className="learn-sidebar">
    <div className="learn-sidebar-head">
      <h2>Nội dung khóa học</h2>
    </div>

    <ul className="learn-lesson-list">
      {course.lessons.map((lesson) => (
        <li key={lesson.id} className="learn-lesson">
          <div className="learn-lesson-head">
            <span className="learn-lesson-title">{lesson.title}</span>
          </div>

          <ul className="learn-video-list">
            {lesson.videos.map((video) => {
              const active = viewing?.kind === 'video' && viewing.video.id === video.id;
              const ready = Boolean(video.playbackUrl);
              return (
                <li key={video.id}>
                  <button
                    type="button"
                    className={`learn-video-item${active ? ' is-active' : ''}`}
                    onClick={() => ready && onOpenVideo(lesson.id, video)}
                    disabled={!ready}
                    title={ready ? undefined : 'Video đang được xử lý'}
                  >
                    <i className={`bi ${active ? 'bi-play-fill' : 'bi-play-btn'}`} />
                    <span className="learn-video-name">{video.title}</span>
                    <span className="learn-video-time">
                      {ready ? formatDuration(video.durationSeconds) ?? '' : 'Đang xử lý'}
                    </span>
                  </button>
                </li>
              );
            })}

            {lesson.questionCount > 0 && (
              <li>
                <button
                  type="button"
                  className={`learn-video-item${
                    viewing?.kind === 'quiz' && viewing.lessonId === lesson.id ? ' is-active' : ''
                  }`}
                  onClick={() => onOpenQuiz(lesson.id)}
                >
                  <i className="bi bi-patch-question" />
                  <span className="learn-video-name">Bài kiểm tra {lesson.questionCount} câu hỏi</span>
                </button>
              </li>
            )}

            {lesson.videos.length === 0 && lesson.questionCount === 0 && (
              <li className="learn-quiz-note">Bài giảng chưa có nội dung</li>
            )}
          </ul>
        </li>
      ))}
    </ul>
  </aside>
);

export default LearnCourseSidebar;
