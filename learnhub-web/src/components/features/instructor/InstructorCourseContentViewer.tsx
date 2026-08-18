import React, { useState } from 'react';
import { formatDuration } from '../../../utils';
import {
  Lesson,
  Video,
  VIDEO_STATUS_LABELS,
} from '../../../types/lesson.types';
import { Question } from '../../../types/question.types';
import VideoPreviewModal from './VideoPreviewModal';
import './InstructorCourseContentViewer.css';

interface InstructorCourseContentViewerProps {
  lessons: Lesson[];
  videos: Record<number, Video[]>;
  questions: Record<number, Question[]>;
}

const InstructorCourseContentViewer: React.FC<InstructorCourseContentViewerProps> = ({
  lessons,
  videos,
  questions,
}) => {
  const [previewVideo, setPreviewVideo] = useState<Video | null>(null);

  return (
    <section className="instructor-content-viewer">
      <h2 className="instructor-content-title">Bài giảng đã tạo</h2>

      {lessons.length === 0 ? (
        <p className="instructor-content-empty">Khóa học chưa có bài giảng nào.</p>
      ) : (
        <ol className="instructor-content-lessons">
          {lessons.map((lesson) => {
            const lessonVideos = videos[lesson.id] ?? [];
            const lessonQuestions = questions[lesson.id] ?? [];

            return (
              <li key={lesson.id} className="instructor-content-lesson">
                <details open>
                  <summary className="instructor-content-summary">
                    <span className="instructor-content-lesson-title">{lesson.title}</span>
                    <span className="instructor-content-kind">
                      {lessonVideos.length} video · {lessonQuestions.length} câu hỏi
                    </span>
                  </summary>

                  <div className="instructor-content-body">
                    {lessonVideos.length > 0 && (
                      <div className="instructor-content-section">
                        <h3>Video</h3>
                        <ol className="instructor-content-items">
                          {lessonVideos.map((video) => (
                            <li key={video.id}>
                              <div>
                                <span className="instructor-content-item-title">{video.title}</span>
                                <span className="instructor-content-item-meta">
                                  {video.status !== 'READY' && VIDEO_STATUS_LABELS[video.status]}
                                  {video.durationSeconds != null
                                    ? `${video.status !== 'READY' ? ' · ' : ''}${formatDuration(video.durationSeconds)}`
                                    : ''}
                                </span>
                              </div>
                              {video.status === 'READY' && video.playbackUrl && (
                                <button
                                  type="button"
                                  className="btn-course-create-outline instructor-content-preview"
                                  onClick={() => setPreviewVideo(video)}
                                >
                                  Xem video
                                </button>
                              )}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {lessonQuestions.length > 0 && (
                      <div className="instructor-content-section">
                        <h3>Câu hỏi trắc nghiệm</h3>
                        <ol className="instructor-content-questions">
                          {lessonQuestions.map((question, questionIndex) => (
                            <li key={question.id}>
                              <p className="instructor-content-question">
                                Câu {questionIndex + 1}: {question.question}
                              </p>
                              <ul className="instructor-content-answers">
                                {question.answers.map((answer) => (
                                  <li key={answer.id} className={answer.isCorrect ? 'is-correct' : ''}>
                                    <span>{answer.answer}</span>
                                    {answer.isCorrect && (
                                      <span
                                        className="instructor-content-correct-icon"
                                        role="img"
                                        aria-label="Đáp án đúng"
                                        title="Đáp án đúng"
                                      >
                                        ✓
                                      </span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {lessonVideos.length === 0 && lessonQuestions.length === 0 && (
                      <p className="instructor-content-empty">Bài giảng chưa có nội dung.</p>
                    )}
                  </div>
                </details>
              </li>
            );
          })}
        </ol>
      )}

      {previewVideo && (
        <VideoPreviewModal video={previewVideo} onClose={() => setPreviewVideo(null)} />
      )}
    </section>
  );
};

export default InstructorCourseContentViewer;
