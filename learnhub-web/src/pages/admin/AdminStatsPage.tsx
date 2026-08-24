import React, { useCallback } from 'react';
import { DropdownOption, LoadingScreen } from '../../components/common';
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
import { adminStatsService } from '../../services/api/adminStats.service';
import {
  AdminOverview,
  AdminStatsPoint,
  AdminTimeSeries,
  STATS_GRANULARITY_LABELS,
} from '../../types/stats.types';
import '../../components/features/stats/statsShared.css';
import './AdminStatsPage.css';

const USER_COLOR = '#2383e2';
const INSTRUCTOR_COLOR = '#0f9d58';
const REVENUE_COLOR = '#eb6834';

type AdminMetric = 'users' | 'instructors' | 'revenue';

const METRIC_LABELS: Record<AdminMetric, string> = {
  users: 'Người dùng mới',
  instructors: 'Giảng viên mới',
  revenue: 'Doanh thu',
};

const METRIC_OPTIONS: DropdownOption[] = (
  ['users', 'instructors', 'revenue'] as AdminMetric[]
).map((value) => ({ value, label: METRIC_LABELS[value] }));

const METRIC_UNITS: Record<AdminMetric, string> = {
  users: 'người dùng mới',
  instructors: 'giảng viên mới',
  revenue: 'đồng',
};

const formatPointValue = (metric: AdminMetric, point: AdminStatsPoint): string =>
  metric === 'revenue' ? formatMoney(point.revenue) : formatCount(point[metric]);

const AdminStatsPage: React.FC = () => {
  const {
    overview,
    series,
    applied,
    setApplied,
    loadingOverview,
    loadingSeries,
    error,
  } = useStatsDashboard<AdminOverview, AdminTimeSeries, AdminMetric>({
    dataSource: adminStatsService,
    queryScope: 'admin',
    logLabel: 'quản trị',
  });

  const selectUsers = useCallback((point: AdminStatsPoint) => point.users, []);
  const selectInstructors = useCallback((point: AdminStatsPoint) => point.instructors, []);
  const selectRevenue = useCallback((point: AdminStatsPoint) => point.revenue, []);

  const periodLabel = overview ? `${overview.periodDays} ngày qua` : '';

  const activeMetric = applied?.metric ?? '';
  const seriesRangeLabel = series ? formatStatsRange(series.from, series.to) : '';

  const chartConfig =
    activeMetric === 'revenue'
      ? {
          getValue: selectRevenue,
          color: REVENUE_COLOR,
          formatValue: formatMoney,
          formatTick: formatMoneyTick,
        }
      : activeMetric === 'instructors'
        ? {
            getValue: selectInstructors,
            color: INSTRUCTOR_COLOR,
            formatValue: formatCount,
            formatTick: formatCount,
          }
        : {
            getValue: selectUsers,
            color: USER_COLOR,
            formatValue: formatCount,
            formatTick: formatCount,
          };

  return (
      <div className="admin-stats">
        {error && <div className="alert alert-danger">{error}</div>}

        { }
        {loadingOverview && !overview && !error && <LoadingScreen variant="stats" />}

        {overview && (
          <>
            <div className="stats-tiles">
              <StatTile
                label="Tổng người dùng"
                value={formatCount(overview.totalUsers)}
                delta={describeDelta(
                  overview.newUsersCurrentPeriod,
                  overview.newUsersPreviousPeriod
                )}

                hint={`${formatCount(overview.newUsersCurrentPeriod)} mới trong ${periodLabel}`}
              />
              <StatTile label="Giảng viên" value={formatCount(overview.totalInstructors)} />
              {

}
              <StatTile
                label="Khóa học đang xuất bản"
                value={formatCount(overview.publishedCourses)}
              />
              <StatTile
                label="Tổng doanh thu"
                value={formatMoney(overview.totalRevenue)}
                hint="đơn đã thanh toán"
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

            <StatsFilterBar<AdminMetric>
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
              ) : (
                <StatsBarChart
                  title={METRIC_LABELS[activeMetric]}
                  points={series.points}
                  granularity={series.granularity}
                  rangeLabel={seriesRangeLabel}
                  unitLabel={METRIC_UNITS[activeMetric]}
                  {...chartConfig}
                />
              )}
            </div>

            {

}
            {activeMetric === 'instructors' && (
              <p className="admin-stats-note">
                Mốc thời gian là ngày tạo tài khoản, không phải ngày được cấp quyền giảng
                viên - hệ thống không lưu thời điểm cấp quyền. Người đăng ký từ trước rồi
                sau này mới mở khóa học sẽ được tính vào kỳ họ đăng ký.
              </p>
            )}
          </>
        )}
      </div>
  );
};

export default AdminStatsPage;
