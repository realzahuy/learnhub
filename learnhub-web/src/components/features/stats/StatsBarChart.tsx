import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StatsGranularity } from '../../../types/stats.types';
import { formatStatsPeriod } from './statsFormat';
import './StatsBarChart.css';

interface StatsBarChartProps<P extends { label: string }> {
  title: string;
  points: P[];
  granularity: StatsGranularity;
  rangeLabel: string;

  getValue: (point: P) => number;

  color: string;

  formatValue: (value: number) => string;

  formatTick: (value: number) => string;

  unitLabel: string;
}

const TIP_X_VAR = '--stats-tip-x';
const TIP_Y_VAR = '--stats-tip-y';

const TICK_COUNT = 4;

const DAY_SLOT_MIN_WIDTH = 48;
const LONG_LABEL_SLOT_MIN_WIDTH = 72;

const niceCeil = (value: number): number => {
  if (value <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
};

const StatsBarChart = <P extends { label: string }>({
  title,
  points,
  granularity,
  rangeLabel,
  getValue,
  color,
  formatValue,
  formatTick,
  unitLabel,
}: StatsBarChartProps<P>) => {

  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const bodyRef = useRef<HTMLDivElement>(null);

  const track = useCallback((index: number, clientX: number, clientY: number) => {
    const body = bodyRef.current;
    if (!body) return;

    const box = body.getBoundingClientRect();
    body.style.setProperty(TIP_X_VAR, `${clientX - box.left}px`);
    body.style.setProperty(TIP_Y_VAR, `${clientY - box.top}px`);

    setActiveIndex(index);
  }, []);

  const clear = useCallback(() => setActiveIndex(null), []);

  const handleBlur = useCallback((event: React.FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setActiveIndex(null);
  }, []);

  const { values, axisMax, ticks, total } = useMemo(() => {
    const vals = points.map(getValue);

    const rawMax = Math.max(...vals, 0);
    const step = niceCeil(rawMax / TICK_COUNT);
    const max = step * TICK_COUNT;

    const tickValues: number[] = [];
    for (let i = TICK_COUNT; i >= 0; i--) tickValues.push(step * i);

    return {
      values: vals,
      axisMax: max,
      ticks: tickValues,
      total: vals.reduce((sum, v) => sum + v, 0),
    };
  }, [points, getValue]);

  const tip =
    activeIndex !== null && points[activeIndex]
      ? { label: points[activeIndex].label, value: values[activeIndex] }
      : null;

  const isEmpty = total === 0;
  const slotMinWidth =
    granularity === 'day' ? DAY_SLOT_MIN_WIDTH : LONG_LABEL_SLOT_MIN_WIDTH;
  const chartMinWidth = `${points.length * slotMinWidth}px`;

  return (
    <section className="stats-chart" style={{ ['--stats-series' as string]: color }}>
      <header className="stats-chart-head">
        <h2 className="stats-chart-title">{title}</h2>
        <p className="stats-chart-total">Tổng {formatValue(total)}</p>
        <p className="stats-chart-range">Từ {rangeLabel}</p>
      </header>

      <div className="stats-chart-body" ref={bodyRef}>
        <div className="stats-chart-yaxis" aria-hidden="true">
          {ticks.map((tick) => (
            <span key={tick} className="stats-chart-tick">
              {formatTick(tick)}
            </span>
          ))}
        </div>

        <div className="stats-chart-scroll">
          <div className="stats-chart-plot" style={{ minWidth: chartMinWidth }}>
            <div className="stats-chart-grid" aria-hidden="true">
              {ticks.map((tick) => (
                <span key={tick} className="stats-chart-gridline" />
              ))}
            </div>

            <div className="stats-chart-bars" onMouseLeave={clear} onBlur={handleBlur}>
              {points.map((point, index) => {
                const value = values[index];

                const heightPercent = axisMax > 0 ? (value / axisMax) * 100 : 0;

                return (
                  <div
                    key={point.label}
                    className={`stats-chart-slot${activeIndex === index ? ' is-active' : ''}`}
                    tabIndex={0}
                    role="img"
                    aria-label={`${formatStatsPeriod(point.label, granularity)}: ${formatValue(
                      value
                    )} ${unitLabel}`}
                    onMouseEnter={(event) => track(index, event.clientX, event.clientY)}

                    onMouseMove={(event) => track(index, event.clientX, event.clientY)}

                    onFocus={(event) => {
                      const rect = event.currentTarget.getBoundingClientRect();
                      track(index, rect.left + rect.width / 2, rect.top + rect.height / 2);
                    }}
                  >
                    <span className="stats-chart-bar" style={{ height: `${heightPercent}%` }} />
                  </div>
                );
              })}
            </div>

            {isEmpty && <p className="stats-chart-empty">Chưa có dữ liệu trong kỳ này</p>}
          </div>

          <div className="stats-chart-xaxis" style={{ minWidth: chartMinWidth }}>
            {points.map((point) => (
              <span key={point.label} className="stats-chart-xlabel">
                {formatStatsPeriod(point.label, granularity, true)}
              </span>
            ))}
          </div>
        </div>

        {tip && (
          <div className="stats-chart-tip" aria-hidden="true">
            <span className="stats-chart-tip-when">
              {formatStatsPeriod(tip.label, granularity)}
            </span>
            <span className="stats-chart-tip-series">
              <span className="stats-chart-dot" />
              <span className="stats-chart-tip-value">{formatValue(tip.value)}</span>
            </span>
          </div>
        )}
      </div>
    </section>
  );
};

export default StatsBarChart;
