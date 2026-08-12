import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { HlsPlayer } from '../../components/common';
import {
  LearnCourseSidebar,
  LearnCourseTabs,
  LearnTab,
  QuizPanel,
} from '../../components/features/learn';
import { useAuth } from '../../context/AuthContext';
import { useLearningCourse } from '../../hooks/useLearningCourse';
import { learningService } from '../../services/api/learning.service';
import { Course } from '../../types/course.types';
import { LearnVideo } from '../../types/learn.types';
import { ROUTE_PATHS, routeTo } from '../../routes/paths';
import './LearnPage.css';

const LearnPage = () => {
  const { slug, videoId, quizLessonId } = useParams<{
    slug: string;
    videoId?: string;
    quizLessonId?: string;
  }>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const { course, setCourse, viewing, setViewing, loading, error } = useLearningCourse(
    isAuthenticated,
    slug,
    videoId,
    quizLessonId
  );
  const [activeTab, setActiveTab] = useState<LearnTab>('overview');
  const [recommendations, setRecommendations] = useState<Course[]>([]);
  const [recommendationsActivated, setRecommendationsActivated] = useState(false);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [recommendationsLoaded, setRecommendationsLoaded] = useState(false);
  const [reviewsActivated, setReviewsActivated] = useState(false);

  const handleTabChange = useCallback((tab: LearnTab) => {
    if (tab === 'recommendations') setRecommendationsActivated(true);
    if (tab === 'reviews') setReviewsActivated(true);
    setActiveTab(tab);
  }, []);

  const openVideo = useCallback(
    (lessonId: number, video: LearnVideo) => {
      if (!slug) return;
      setViewing({ kind: 'video', lessonId, video });
      navigate(routeTo.learningLecture(slug, video.id), { replace: true });
    },
    [navigate, setViewing, slug]
  );

  const openQuiz = useCallback(
    (lessonId: number) => {
      if (!slug) return;
      setViewing({ kind: 'quiz', lessonId });
      navigate(routeTo.learningQuiz(slug, lessonId), { replace: true });
    },
    [navigate, setViewing, slug]
  );

  useEffect(() => {
    setActiveTab('overview');
    setRecommendations([]);
    setRecommendationsActivated(false);
    setRecommendationsLoading(false);
    setRecommendationsLoaded(false);
    setReviewsActivated(false);
  }, [slug]);

  useEffect(() => {
    const courseId = course?.id;
    if (!recommendationsActivated || !courseId || recommendationsLoaded) return;

    let cancelled = false;
    setRecommendationsLoading(true);

    learningService
      .getRecommendations(courseId)
      .then((data) => {
        if (!cancelled) setRecommendations(data);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Không thể tải đề xuất khóa học:', err);
        setRecommendations([]);
      })
      .finally(() => {
        if (cancelled) return;
        setRecommendationsLoading(false);
        setRecommendationsLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [recommendationsActivated, course?.id, recommendationsLoaded]);

  const toggleCompleted = useCallback(
    async (lessonId: number, completed: boolean) => {
      setCourse((prev) => {
        if (!prev) return prev;
        const lessons = prev.lessons.map((lesson) =>
          lesson.id === lessonId ? { ...lesson, completed } : lesson
        );
        return {
          ...prev,
          lessons,
          completedLessons: lessons.filter((lesson) => lesson.completed).length,
        };
      });

      try {
        await learningService.setLessonCompleted(lessonId, completed);
      } catch (err) {
        console.error('Không thể lưu tiến độ học:', err);

        setCourse((prev) => {
          if (!prev) return prev;
          const lessons = prev.lessons.map((lesson) =>
            lesson.id === lessonId ? { ...lesson, completed: !completed } : lesson
          );
          return {
            ...prev,
            lessons,
            completedLessons: lessons.filter((lesson) => lesson.completed).length,
          };
        });
      }
    },
    [setCourse]
  );

  const handleVideoWatched = useCallback(() => {
    if (!course || viewing?.kind !== 'video') return;

    const lesson = course.lessons.find((item) => item.id === viewing.lessonId);
    if (!lesson || lesson.completed) return;

    if (lesson.questionCount > 0) return;

    const videoIndex = lesson.videos.findIndex((video) => video.id === viewing.video.id);
    if (videoIndex === lesson.videos.length - 1) {
      toggleCompleted(lesson.id, true);
    }
  }, [course, viewing, toggleCompleted]);

  const handleVideoEnded = useCallback(() => {
    if (!course || viewing?.kind !== 'video') return;

    const lessonIndex = course.lessons.findIndex((lesson) => lesson.id === viewing.lessonId);
    if (lessonIndex === -1) return;

    const lesson = course.lessons[lessonIndex];
    const videoIndex = lesson.videos.findIndex((video) => video.id === viewing.video.id);

    const nextInLesson = lesson.videos.slice(videoIndex + 1).find((video) => video.playbackUrl);
    if (nextInLesson) {
      openVideo(lesson.id, nextInLesson);
      return;
    }

    if (lesson.questionCount > 0) {
      openQuiz(lesson.id);
      return;
    }

    for (const nextLesson of course.lessons.slice(lessonIndex + 1)) {
      const nextVideo = nextLesson.videos.find((video) => video.playbackUrl);
      if (nextVideo) {
        openVideo(nextLesson.id, nextVideo);
        return;
      }
    }
  }, [course, viewing, openVideo, openQuiz]);

  const handleQuizPassed = useCallback((lessonId: number) => {
    setCourse((prev) => {
      if (!prev) return prev;
      const lessons = prev.lessons.map((lesson) =>
        lesson.id === lessonId ? { ...lesson, completed: true } : lesson
      );
      return {
        ...prev,
        lessons,
        completedLessons: lessons.filter((lesson) => lesson.completed).length,
      };
    });
  }, [setCourse]);

  const handleQuizScored = useCallback((lessonId: number, bestScorePercent: number) => {
    setCourse((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        lessons: prev.lessons.map((lesson) =>
          lesson.id === lessonId ? { ...lesson, quizBestScorePercent: bestScorePercent } : lesson
        ),
      };
    });
  }, [setCourse]);

  const progressPercent = useMemo(() => {
    if (!course || course.totalLessons === 0) return 0;
    return Math.round((course.completedLessons / course.totalLessons) * 100);
  }, [course]);

  if (isAuthLoading) {
    return (
      <div className="learn-page">
        <div className="learn-center">
          <div className="spinner-border text-notion" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!slug) {
    return <Navigate to={ROUTE_PATHS.myCourses} replace />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTE_PATHS.login} replace state={{ from: routeTo.learning(slug) }} />;
  }

  return (
    <div className="learn-page">

      {loading ? (
        <div className="learn-center">
          <div className="spinner-border text-notion" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
        </div>
      ) : error ? (
        <div className="learn-center learn-error">
          <p>{error}</p>
          <Link className="btn btn-notion" to={ROUTE_PATHS.myCourses}>
            Về khóa học của tôi
          </Link>
        </div>
      ) : (
        course && (
          <main className="learn-main motion-content-enter">
            { }
            <section className="learn-stage">
              {viewing?.kind === 'quiz' ? (
                <QuizPanel

                  key={viewing.lessonId}
                  lessonId={viewing.lessonId}
                  onLessonCompleted={handleQuizPassed}
                  onBestScoreChanged={handleQuizScored}
                />
              ) : (
                <div className="learn-video-frame">
                  {viewing?.video.playbackUrl ? (
                    <HlsPlayer
                      key={viewing.video.id}
                      playbackUrl={viewing.video.playbackUrl}
                      className="learn-video"
                      onWatched={handleVideoWatched}
                      onEnded={handleVideoEnded}
                    />
                  ) : (
                    <div className="learn-video-empty">
                      <i className="bi bi-play-btn"></i>
                      <p>Chọn một mục ở mục lục bên phải để bắt đầu học.</p>
                    </div>
                  )}
                </div>
              )}

              <LearnCourseTabs
                course={course}
                slug={slug}
                viewing={viewing}
                activeTab={activeTab}
                recommendations={recommendations}
                recommendationsLoading={recommendationsLoading}
                reviewsActivated={reviewsActivated}
                onTabChange={handleTabChange}
              />
            </section>

            { }
            <LearnCourseSidebar
              course={course}
              viewing={viewing}
              progressPercent={progressPercent}
              onToggleCompleted={toggleCompleted}
              onOpenVideo={openVideo}
              onOpenQuiz={openQuiz}
            />
          </main>
        )
      )}

    </div>
  );
};

export default LearnPage;
