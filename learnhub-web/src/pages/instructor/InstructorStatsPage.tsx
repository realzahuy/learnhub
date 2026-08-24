import React, { useCallback } from 'react';
import { DropdownOption, PageSkeleton } from '../../components/common';
import {
  StatsBarChart,
  StatsFilterBar,
  StatTile,
  formatMoney,
  formatMoneyTick,
  formatCount,
  formatStatsPeriod,
  formatStatsRange,
  describeDelta,
} from '../../components/features/stats';
import { useStatsDashboard } from '../../hooks/useStatsDashboard';
import { instructorStatsService } from '../../services/api/instructorStats.service';
import {
  InstructorOverview,
  InstructorTimeSeries,
  StatsPoint,
  STATS_GRANULARITY_LABELS,
} from '../../types/stats.types';
import '../../components/features/stats/statsShared.css';
import './InstructorStatsPage.css';

const STUDENT_COLOR = '#0f9d58';
const REVENUE_COLOR = '#eb6834';

type StatsMetric = 'students' | 'revenue';

const METRIC_LABELS: Record<StatsMetric, string> = {
  students: 'Học viên mới',
  revenue: 'Doanh thu',
};

const METRIC_OPTIONS: DropdownOption[] = (['students', 'revenue'] as StatsMetric[]).map(
  (value) => ({ value, label: METRIC_LABELS[value] })
);

const formatPointValue = (metric: StatsMetric, point: StatsPoint): string =>
  metric === 'revenue' ? formatMoney(point.revenue) : formatCount(point.students);

const InstructorStatsPage: React.FC = () => {
  const {
    overview,
    series,
    applied,
    setApplied,
    loadingOverview,
    loadingSeries,
    error,
  } = useStatsDashboard<InstructorOverview, InstructorTimeSeries, StatsMetric>({
    dataSource: instructorStatsService,
    queryScope: 'instructor',
    logLabel: 'giảng viên',
  });

  const selectStudents = useCallback((point: StatsPoint) => point.students, []);
  const selectRevenue = useCallback((point: StatsPoint) => point.revenue, []);

  const periodLabel = overview ? `${overview.periodDays} ngày qua` : '';

  const activeMetric = applied?.metric ?? '';
  const seriesRangeLabel = series ? formatStatsRange(series.from, series.to) : '';

  return (
    <div className="instructor-stats-page">

      <main className="instructor-stats-main">
        <div className="container py-4">
          {error && <div className="alert alert-danger">{error}</div>}

          { }
          {loadingOverview && !overview && !error && (
            <PageSkeleton variant="stats" />
          )}

          {overview && (
            <div className="stats-content">
              <div className="stats-tiles">
                <StatTile
                  label="Tổng học viên"
                  value={formatCount(overview.totalStudents)}
                  hint="không tính trùng người"
                />
                <StatTile
                  label="Tổng doanh thu"
                  value={formatMoney(overview.totalRevenue)}
                  hint="đơn đã thanh toán"
                />
                <StatTile
                  label={`Lượt ghi danh ${periodLabel}`}
                  value={formatCount(overview.enrollmentsCurrentPeriod)}
                  delta={describeDelta(
                    overview.enrollmentsCurrentPeriod,
                    overview.enrollmentsPreviousPeriod
                  )}
                  hint={`so với ${periodLabel} trước đó`}
                />
                <StatTile
                  label={`Doanh thu ${periodLabel}`}
                  value={formatMoney(overview.revenueCurrentPeriod)}
                  delta={describeDelta(
                    overview.revenueCurrentPeriod,
                    overview.revenuePreviousPeriod
                  )}
                  hint={`so với ${periodLabel} trước đó`}
                />
              </div>

              <div className="stats-courses">
                <span>
                  <strong>{overview.publishedCourses}</strong> khóa đang xuất bản
                </span>
                {overview.pendingCourses > 0 && (
                  <span>
                    <strong>{overview.pendingCourses}</strong> chờ duyệt
                  </span>
                )}
                {overview.draftCourses > 0 && (
                  <span>
                    <strong>{overview.draftCourses}</strong> bản nháp
                  </span>
                )}
                {overview.rejectedCourses > 0 && (
                  <span className="is-rejected">
                    <strong>{overview.rejectedCourses}</strong> bị từ chối
                  </span>
                )}
              </div>

              <StatsFilterBar<StatsMetric>
                metricOptions={METRIC_OPTIONS}
                onApply={setApplied}
                loading={loadingSeries}
              />

              {
}
              <div className={`stats-result${loadingSeries ? ' is-refetching' : ''}`}>
                {activeMetric === '' || !series ? (

                  <div className="stats-placeholder">
                    <p>Chọn loại thống kê rồi bấm “Lọc” để xem số liệu</p>
                  </div>
                ) : applied?.view === 'table' ? (

                  <div className="stats-table-wrap">
                    <table className="stats-table">
                      <caption>
                        {METRIC_LABELS[activeMetric]} theo{' '}
                        {STATS_GRANULARITY_LABELS[series.granularity].toLowerCase()},{' '}
                        từ {seriesRangeLabel}
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">Kỳ</th>
                          <th scope="col">{METRIC_LABELS[activeMetric]}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {series.points.map((point) => (
                          <tr key={point.label}>
                            <th scope="row">
                              {formatStatsPeriod(point.label, series.granularity)}
                            </th>
                            <td>{formatPointValue(activeMetric, point)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : activeMetric === 'revenue' ? (
                  <StatsBarChart
                    title={METRIC_LABELS.revenue}
                    points={series.points}
                    granularity={series.granularity}
                    rangeLabel={seriesRangeLabel}
                    getValue={selectRevenue}
                    color={REVENUE_COLOR}
                    formatValue={formatMoney}
                    formatTick={formatMoneyTick}
                    unitLabel="đồng"
                  />
                ) : (
                  <StatsBarChart
                    title={METRIC_LABELS.students}
                    points={series.points}
                    granularity={series.granularity}
                    rangeLabel={seriesRangeLabel}
                    getValue={selectStudents}
                    color={STUDENT_COLOR}
                    formatValue={formatCount}
                    formatTick={formatCount}

                    unitLabel="học viên mới"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </main>

    </div>
  );
};

export default InstructorStatsPage;
