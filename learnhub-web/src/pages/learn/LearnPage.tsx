import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { HlsPlayer, LoadingScreen, PageSkeleton } from '../../components/common';
import {
  LearnCourseSidebar,
  LearnCourseTabs,
  LearnTab,
  QuizPanel,
} from '../../components/features/learn';
import { useAuth } from '../../context/AuthContext';
import { useLearningCourse } from '../../hooks/useLearningCourse';
import { learningService } from '../../services/api/learning.service';
import { RecommendationCard } from '../../types/course.types';
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

  const { course, viewing, setViewing, loading, error } = useLearningCourse(
    isAuthenticated,
    slug,
    videoId,
    quizLessonId
  );
  const [activeTab, setActiveTab] = useState<LearnTab>('overview');
  const [recommendations, setRecommendations] = useState<RecommendationCard[]>([]);
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

    const controller = new AbortController();
    setRecommendationsLoading(true);

    learningService
      .getRecommendations(courseId, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setRecommendations(data);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setRecommendations([]);
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setRecommendationsLoading(false);
        setRecommendationsLoaded(true);
      });

    return () => controller.abort();
  }, [recommendationsActivated, course?.id, recommendationsLoaded]);

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

  if (isAuthLoading) {
    return <LoadingScreen variant="detail" />;
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
        <PageSkeleton variant="detail" />
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
            <section className="learn-stage">
              {viewing?.kind === 'quiz' ? (
                <QuizPanel
                  key={viewing.lessonId}
                  lessonId={viewing.lessonId}
                />
              ) : (
                <div className={`learn-video-frame${
                  viewing?.video.playbackUrl ? '' : ' is-empty'
                }`}>
                  {viewing?.video.playbackUrl ? (
                    <HlsPlayer
                      key={viewing.video.id}
                      playbackUrl={viewing.video.playbackUrl}
                      className="learn-video"
                      onEnded={handleVideoEnded}
                    />
                  ) : (
                    <div className="learn-video-empty">
                      <p>Chọn bài giảng để bắt đầu.</p>
                    </div>
                  )}
                </div>
              )}

              <LearnCourseTabs
                course={course}
                slug={slug}
                activeTab={activeTab}
                recommendations={recommendations}
                recommendationsLoading={recommendationsLoading}
                reviewsActivated={reviewsActivated}
                onTabChange={handleTabChange}
              />
            </section>

            <LearnCourseSidebar
              course={course}
              viewing={viewing}
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
