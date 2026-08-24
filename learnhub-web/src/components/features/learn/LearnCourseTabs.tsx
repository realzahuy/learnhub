import { Link } from 'react-router-dom';
import { RecommendationCard } from '../../../types/course.types';
import { LearnCourse } from '../../../types/learn.types';
import { CourseThumbnail, PageSkeleton } from '../../common';
import { CourseReviewSection } from '../review';
import { formatPrice } from '../../../utils';
import { LearnTab, Viewing } from './learnView.types';
import { routeTo } from '../../../routes/paths';

interface LearnCourseTabsProps {
  course: LearnCourse;
  slug: string;
  viewing: Viewing | null;
  activeTab: LearnTab;
  recommendations: RecommendationCard[];
  recommendationsLoading: boolean;
  reviewsActivated: boolean;
  onTabChange: (tab: LearnTab) => void;
}

const LearnCourseTabs = ({
  course,
  slug,
  viewing,
  activeTab,
  recommendations,
  recommendationsLoading,
  reviewsActivated,
  onTabChange,
}: LearnCourseTabsProps) => (
  <div className="learn-tabs">
    <div className="learn-tab-list" role="tablist" aria-label="Nội dung khóa học">
      {(['overview', 'recommendations', 'reviews'] as LearnTab[]).map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={activeTab === tab}
          className={`learn-tab${activeTab === tab ? ' is-active' : ''}`}
          onClick={() => onTabChange(tab)}
        >
          {tab === 'overview' ? 'Tổng quan' : tab === 'recommendations' ? 'Đề xuất' : 'Đánh giá'}
        </button>
      ))}
    </div>

    {activeTab === 'overview' && (
      <div className="learn-tab-panel">
        <div className="learn-stage-info">
          <h1 className="learn-course-title">{course.title}</h1>
          {viewing?.kind === 'video' && <p className="learn-video-title">{viewing.video.title}</p>}
          <p className="learn-instructor">Giảng viên: {course.instructorName}</p>
        </div>
      </div>
    )}

    {activeTab === 'recommendations' && (
      <div className="learn-tab-panel learn-recommendation-panel">
        {recommendationsLoading ? (
          <PageSkeleton variant="cards" count={3} />
        ) : recommendations.length === 0 ? (
          <p className="learn-recommendation-empty" role="status">
            Không có khóa học đề xuất
          </p>
        ) : (
          <div className="learn-recommendation-grid motion-stagger">
            {recommendations.map((recommendation) => (
              <Link
                key={recommendation.slug}
                to={routeTo.courseDetail(recommendation.slug)}
                className="learn-recommendation-card"
              >
                <div className="learn-recommendation-thumb">
                  <CourseThumbnail
                    src={recommendation.thumbnail}
                    alt={recommendation.title}
                    placeholder={<div className="learn-recommendation-thumb-placeholder" />}
                  />
                </div>
                <div className="learn-recommendation-body">
                  <h3>{recommendation.title}</h3>
                  <strong>{formatPrice(recommendation.price)}</strong>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    )}

    {reviewsActivated && course.slug === slug && (
      <div className="learn-tab-panel learn-review-panel" hidden={activeTab !== 'reviews'}>
        <CourseReviewSection slug={slug} isEnrolled />
      </div>
    )}
  </div>
);

export default LearnCourseTabs;
