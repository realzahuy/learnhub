import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Dropdown, { DropdownOption } from './Dropdown';
import { usePopoverPlacement } from '../../hooks/usePopoverPlacement';
import { formatIsoDateVi, parseIsoDate, toIsoDate } from '../../utils';
import './DatePicker.css';

const MONTH_OPTIONS: DropdownOption[] = Array.from({ length: 12 }, (_, index) => ({
  value: String(index),
  label: `Tháng ${index + 1}`,
}));

const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const CELL_COUNT = 42;

const YEAR_SPAN = 10;

const buildCells = (year: number, month: number): Date[] => {
  const first = new Date(year, month, 1);

  const offset = (first.getDay() + 6) % 7;

  return Array.from(
    { length: CELL_COUNT },
    (_, index) => new Date(year, month, 1 - offset + index)
  );
};

interface DatePickerProps {

  value: string;

  onChange: (value: string) => void;

  min?: string;
  max?: string;

  ariaLabel: string;

  placeholder?: string;
  className?: string;

  id?: string;
}

const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  min,
  max,
  ariaLabel,
  placeholder = 'dd/mm/yyyy',
  className = '',
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const { dropUp, flipped } = usePopoverPlacement(isOpen, toggleRef, panelRef, 'right');

  const today = useMemo(() => new Date(), []);
  const todayIso = toIsoDate(today);

  const selected = parseIsoDate(value);

  const [visible, setVisible] = useState(() => {
    const base = selected ?? today;
    return { year: base.getFullYear(), month: base.getMonth() };
  });

  useEffect(() => {
    if (!isOpen) return;

    const base = parseIsoDate(value) ?? new Date();
    setVisible({ year: base.getFullYear(), month: base.getMonth() });
  }, [isOpen, value]);

  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const yearOptions = useMemo<DropdownOption[]>(() => {
    const currentYear = new Date().getFullYear();
    const selectedYear = parseIsoDate(value)?.getFullYear() ?? currentYear;

    const lower = Math.min(
      parseIsoDate(min)?.getFullYear() ?? Math.min(currentYear, selectedYear) - YEAR_SPAN,
      visible.year
    );
    const upper = Math.max(
      parseIsoDate(max)?.getFullYear() ?? Math.max(currentYear, selectedYear) + YEAR_SPAN,
      visible.year
    );

    return Array.from({ length: upper - lower + 1 }, (_, index) => {
      const year = upper - index;
      return { value: String(year), label: String(year) };
    });
  }, [value, min, max, visible.year]);

  const cells = useMemo(() => buildCells(visible.year, visible.month), [visible]);

  const isDisabledIso = useCallback(
    (iso: string) => (min ? iso < min : false) || (max ? iso > max : false),
    [min, max]
  );

  const shiftMonth = useCallback((step: number) => {
    setVisible((prev) => {
      const next = new Date(prev.year, prev.month + step, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }, []);

  const prevDisabled = min ? toIsoDate(new Date(visible.year, visible.month, 0)) < min : false;
  const nextDisabled = max ? toIsoDate(new Date(visible.year, visible.month + 1, 1)) > max : false;

  const handlePick = useCallback(
    (iso: string) => {
      setIsOpen(false);
      onChange(iso);
    },
    [onChange]
  );

  return (
    <div className={`app-datepicker ${className}`} ref={rootRef}>
      <button
        type="button"
        id={id}
        ref={toggleRef}
        className={`app-datepicker-toggle ${isOpen ? 'is-open' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
      >
        <span className={`app-datepicker-value${value ? '' : ' is-empty'}`}>
          {value ? formatIsoDateVi(value) : placeholder}
        </span>
        <i className="bi bi-calendar3 app-datepicker-icon" aria-hidden="true"></i>
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          className={`app-datepicker-panel${dropUp ? ' is-drop-up' : ''}${
            flipped ? ' is-align-left' : ''
          }`}
          role="dialog"
          aria-label={ariaLabel}
        >
          <div className="app-datepicker-nav">
            <Dropdown
              className="app-datepicker-select is-month"
              value={String(visible.month)}
              options={MONTH_OPTIONS}
              onChange={(next) => setVisible((prev) => ({ ...prev, month: Number(next) }))}
              ariaLabel="Chọn tháng"
            />
            <Dropdown
              className="app-datepicker-select is-year"
              value={String(visible.year)}
              options={yearOptions}
              onChange={(next) => setVisible((prev) => ({ ...prev, year: Number(next) }))}
              ariaLabel="Chọn năm"
            />

            <div className="app-datepicker-steps">
              <button
                type="button"
                className="app-datepicker-step"
                onClick={() => shiftMonth(-1)}
                disabled={prevDisabled}
                aria-label="Tháng trước"
              >
                <i className="bi bi-chevron-left" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                className="app-datepicker-step"
                onClick={() => shiftMonth(1)}
                disabled={nextDisabled}
                aria-label="Tháng sau"
              >
                <i className="bi bi-chevron-right" aria-hidden="true"></i>
              </button>
            </div>
          </div>

          <div className="app-datepicker-weekdays" aria-hidden="true">
            {WEEKDAY_LABELS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>

          <div className="app-datepicker-grid">
            {cells.map((cell) => {
              const iso = toIsoDate(cell);
              const outside = cell.getMonth() !== visible.month;
              const isSelected = iso === value;

              const classes = ['app-datepicker-day'];
              if (outside) classes.push('is-outside');
              if (iso === todayIso) classes.push('is-today');
              if (isSelected) classes.push('is-selected');

              return (
                <button
                  key={iso}
                  type="button"
                  className={classes.join(' ')}
                  disabled={isDisabledIso(iso)}
                  aria-pressed={isSelected}
                  aria-label={formatIsoDateVi(iso)}
                  onClick={() => handlePick(iso)}
                >
                  {cell.getDate()}
                </button>
              );
            })}
          </div>

          <div className="app-datepicker-foot">
            <button
              type="button"
              className="app-datepicker-link"
              onClick={() => handlePick('')}
              disabled={!value}
            >
              Xóa
            </button>
            <button
              type="button"
              className="app-datepicker-link"
              onClick={() => handlePick(todayIso)}
              disabled={isDisabledIso(todayIso)}
            >
              Hôm nay
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;
