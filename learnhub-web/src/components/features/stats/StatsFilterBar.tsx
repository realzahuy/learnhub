import { useCallback, useState } from 'react';
import { DatePicker, Dropdown, DropdownOption } from '../../common';
import {
  StatsGranularity,
  STATS_GRANULARITY_LABELS,
} from '../../../types/stats.types';
import { toIsoDate } from '../../../utils';
import { StatsFilterValue, StatsView } from './statsFormat';

const GRANULARITY_OPTIONS: DropdownOption[] = (
  ['day', 'month', 'quarter'] as StatsGranularity[]
).map((value) => ({ value, label: STATS_GRANULARITY_LABELS[value] }));

const VIEW_OPTIONS: DropdownOption[] = [
  { value: 'chart', label: 'Biểu đồ cột' },
  { value: 'table', label: 'Bảng số liệu' },
];

const MAX_BUCKETS: Record<StatsGranularity, number> = {
  day: 90,
  month: 120,
  quarter: 40,
};

interface StatsFilterBarProps<M extends string> {
  metricOptions: DropdownOption[];
  onApply: (value: StatsFilterValue<M>) => void;
  loading: boolean;
}

const countBuckets = (groupBy: StatsGranularity, from: string, to: string): number => {
  const [fromYear, fromMonth] = from.split('-').map(Number);
  const [toYear, toMonth] = to.split('-').map(Number);

  if (groupBy === 'month') {
    return (toYear - fromYear) * 12 + toMonth - fromMonth + 1;
  }
  if (groupBy === 'quarter') {
    const fromQuarter = Math.floor((fromMonth - 1) / 3);
    const toQuarter = Math.floor((toMonth - 1) / 3);
    return (toYear - fromYear) * 4 + toQuarter - fromQuarter + 1;
  }

  const fromTime = Date.parse(`${from}T00:00:00Z`);
  const toTime = Date.parse(`${to}T00:00:00Z`);
  return Math.floor((toTime - fromTime) / 86_400_000) + 1;
};

const StatsFilterBar = <M extends string>({
  metricOptions,
  onApply,
  loading,
}: StatsFilterBarProps<M>) => {
  const [draft, setDraft] = useState<StatsFilterValue<M>>({
    groupBy: 'day',
    from: '',
    to: '',
    metric: '',
    view: 'chart',
  });
  const [filterError, setFilterError] = useState<string | null>(null);

  const handleDateChange = useCallback((field: 'from' | 'to', value: string) => {
    setFilterError(null);
    setDraft((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleApply = useCallback(() => {
    const hasFrom = draft.from !== '';
    const hasTo = draft.to !== '';

    if (hasFrom !== hasTo) {
      setFilterError('Hãy chọn đủ cả ngày bắt đầu và ngày kết thúc, hoặc để trống cả hai.');
      return;
    }
    if (hasFrom && draft.from > draft.to) {
      setFilterError('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.');
      return;
    }
    if (hasFrom) {
      const bucketCount = countBuckets(draft.groupBy, draft.from, draft.to);
      if (bucketCount > MAX_BUCKETS[draft.groupBy]) {
        const limits: Record<StatsGranularity, string> = {
          day: '90 ngày',
          month: '120 tháng',
          quarter: '40 quý',
        };
        setFilterError(
          `Khoảng xem theo ${STATS_GRANULARITY_LABELS[draft.groupBy].toLowerCase()} ` +
            `không được vượt quá ${limits[draft.groupBy]}.`
        );
        return;
      }
    }

    setFilterError(null);
    onApply({ ...draft });
  }, [draft, onApply]);

  const today = toIsoDate(new Date());

  return (
    <>
      <div className="stats-controls">
        <div className="stats-field">
          <label className="stats-field-label" htmlFor="stats-from">
            Từ ngày
          </label>
          <DatePicker
            id="stats-from"
            className="stats-datepicker"
            value={draft.from}
            max={draft.to || today}
            onChange={(value) => handleDateChange('from', value)}
            ariaLabel="Từ ngày, không bắt buộc"
          />
        </div>

        <div className="stats-field">
          <label className="stats-field-label" htmlFor="stats-to">
            Đến ngày
          </label>
          <DatePicker
            id="stats-to"
            className="stats-datepicker"
            value={draft.to}
            min={draft.from || undefined}
            max={today}
            onChange={(value) => handleDateChange('to', value)}
            ariaLabel="Đến ngày, không bắt buộc"
          />
        </div>

        <div className="stats-field">
          <label className="stats-field-label" htmlFor="stats-group-by">
            Xem theo
          </label>
          <Dropdown
            id="stats-group-by"
            className="stats-dropdown"
            value={draft.groupBy}
            options={GRANULARITY_OPTIONS}
            onChange={(value) => {
              setFilterError(null);
              setDraft((prev) => ({ ...prev, groupBy: value as StatsGranularity }));
            }}
            ariaLabel="Gom thống kê theo ngày, tháng hoặc quý"
          />
        </div>

        <div className="stats-field">
          <label className="stats-field-label" htmlFor="stats-metric">
            Loại thống kê
          </label>
          <Dropdown
            id="stats-metric"
            className="stats-dropdown"
            value={draft.metric}
            options={metricOptions}
            onChange={(value) => setDraft((prev) => ({ ...prev, metric: value as M }))}
            ariaLabel="Loại thống kê"
            placeholder="Chọn loại thống kê"
          />
        </div>

        <div className="stats-field">
          <label className="stats-field-label" htmlFor="stats-view">
            Cách xem
          </label>
          <Dropdown
            id="stats-view"
            className="stats-dropdown"
            value={draft.view}
            options={VIEW_OPTIONS}
            onChange={(value) => setDraft((prev) => ({ ...prev, view: value as StatsView }))}
            ariaLabel="Cách xem số liệu"
          />
        </div>

        <button
          type="button"
          className="stats-filter-btn"
          onClick={handleApply}
          disabled={draft.metric === '' || loading}
        >
          <i className="bi bi-funnel" aria-hidden="true"></i>
          {loading ? 'Đang lọc...' : 'Lọc'}
        </button>
      </div>

      {filterError && <div className="stats-filter-error">{filterError}</div>}
    </>
  );
};

export default StatsFilterBar;
