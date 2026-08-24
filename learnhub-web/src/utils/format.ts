import { uiConfig } from '../config/uiConfig';

export const formatPrice = (price: number): string =>
  price === 0
    ? 'Miễn phí'
    : new Intl.NumberFormat(uiConfig.formatting.locale, {
      style: 'currency',
      currency: uiConfig.formatting.currency,
    }).format(price);

const parseServerDate = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const relativeTimeFormatter = new Intl.RelativeTimeFormat(uiConfig.formatting.locale, {
  numeric: 'auto',
});

const SECOND_MS = 1_000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const MONTH_MS = 30 * DAY_MS;
const YEAR_MS = 365 * DAY_MS;

const relativeTimeUnits = [
  { limitMs: 45 * SECOND_MS, divisorMs: SECOND_MS, unit: 'second' },
  { limitMs: 45 * MINUTE_MS, divisorMs: MINUTE_MS, unit: 'minute' },
  { limitMs: 22 * HOUR_MS, divisorMs: HOUR_MS, unit: 'hour' },
  { limitMs: 26 * DAY_MS, divisorMs: DAY_MS, unit: 'day' },
  { limitMs: 11 * MONTH_MS, divisorMs: MONTH_MS, unit: 'month' },
  { limitMs: Number.POSITIVE_INFINITY, divisorMs: YEAR_MS, unit: 'year' },
] as const;

export const formatDateTime = (value: string | null | undefined): string | null => {
  const date = parseServerDate(value);
  if (!date) return null;

  const time = new Intl.DateTimeFormat(uiConfig.formatting.locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
  const day = new Intl.DateTimeFormat(uiConfig.formatting.locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);

  return `${time} ${day}`;
};

export const formatLongDate = (value: string | null | undefined): string | null => {
  const date = parseServerDate(value);
  if (!date) return null;

  return new Intl.DateTimeFormat(uiConfig.formatting.locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
};

export const formatRelativeDate = (value: string | null | undefined): string | null => {
  const date = parseServerDate(value);
  if (!date) return null;

  const differenceMs = date.getTime() - Date.now();
  const absoluteDifferenceMs = Math.abs(differenceMs);
  const { divisorMs, unit } = relativeTimeUnits.find(
    ({ limitMs }) => absoluteDifferenceMs < limitMs
  ) ?? relativeTimeUnits[relativeTimeUnits.length - 1];
  const roundedValue =
    differenceMs === 0
      ? 0
      : Math.round(absoluteDifferenceMs / divisorMs) * Math.sign(differenceMs);

  return relativeTimeFormatter.format(roundedValue, unit);
};

export const toIsoDate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;

export const parseIsoDate = (value: string | null | undefined): Date | null => {
  if (!value) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const [, year, month, day] = match.map(Number);
  const date = new Date(year, month - 1, day);

  return date.getMonth() === month - 1 && date.getDate() === day ? date : null;
};

export const formatIsoDateVi = (value: string | null | undefined): string => {
  const date = parseIsoDate(value);
  if (!date) return '';

  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(
    2,
    '0'
  )}/${date.getFullYear()}`;
};

export const formatDuration = (seconds: number | null | undefined): string | null => {
  if (seconds == null || seconds < 0) return null;

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = Math.floor(seconds % 60);

  const pad = (value: number) => String(value).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(rest)}` : `${minutes}:${pad(rest)}`;
};
