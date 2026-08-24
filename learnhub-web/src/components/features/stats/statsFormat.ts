import { StatsGranularity } from '../../../types/stats.types';
import { uiConfig } from '../../../config/uiConfig';

export const formatMoney = (value: number): string =>
  new Intl.NumberFormat(uiConfig.formatting.locale, {
    style: 'currency',
    currency: uiConfig.formatting.currency,
  }).format(value);

export const formatMoneyTick = (value: number): string =>
  value === 0
    ? '0'
    : new Intl.NumberFormat(uiConfig.formatting.locale, {
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(
        value
      );

export const formatCount = (value: number): string =>
  new Intl.NumberFormat(uiConfig.formatting.locale).format(value);

export const formatStatsPeriod = (
  label: string,
  granularity: StatsGranularity,
  compact = false
): string => {
  if (granularity === 'quarter') {
    const [, quarter] = label.split('-');
    return quarter;
  }

  const parts = label.split('-');
  if (granularity === 'month') {
    return `T${Number(parts[1])}`;
  }

  return compact
    ? `${Number(parts[2])}/${Number(parts[1])}`
    : `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const formatIsoDate = (value: string): string => {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
};

export const formatStatsRange = (from: string, to: string): string =>
  `${formatIsoDate(from)} – ${formatIsoDate(to)}`;

export interface StatsDelta {
  text: string;
  up: boolean;
}

export const describeDelta = (current: number, previous: number): StatsDelta | null => {
  if (current === previous) return null;
  if (previous === 0) return { text: 'mới phát sinh', up: true };

  const percent = Math.round(((current - previous) / previous) * 100);
  if (percent === 0) return null;
  return { text: `${percent > 0 ? '+' : ''}${percent}%`, up: percent > 0 };
};

export type StatsView = 'chart' | 'table';

export interface StatsFilterValue<M extends string> {
  groupBy: StatsGranularity;

  from: string;
  to: string;

  metric: M | '';
  view: StatsView;
}
