import moment from 'moment';
import 'moment/locale/vi';

moment.locale('vi');

export const formatPrice = (price: number): string =>
  price === 0
    ? 'Miễn phí'
    : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

const parseServerDate = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatDateTime = (value: string | null | undefined): string | null => {
  const date = parseServerDate(value);
  if (!date) return null;

  const time = new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
  const day = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);

  return `${time} ${day}`;
};

export const formatLongDate = (value: string | null | undefined): string | null => {
  const date = parseServerDate(value);
  if (!date) return null;

  return new Intl.DateTimeFormat('vi-VN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
};

export const formatRelativeDate = (value: string | null | undefined): string | null => {
  if (!value) return null;

  const date = moment(value);
  return date.isValid() ? date.fromNow() : null;
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
