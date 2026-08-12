import React from 'react';
import { StatsDelta } from './statsFormat';

interface StatTileProps {
  label: string;

  value: string;
  hint?: string;
  delta?: StatsDelta | null;
}

const StatTile: React.FC<StatTileProps> = ({ label, value, hint, delta }) => (
  <div className="stat-tile">
    <p className="stat-tile-label">{label}</p>
    <p className="stat-tile-value">{value}</p>
    <p className="stat-tile-foot">
      {delta && (
        <span className={`stat-tile-delta ${delta.up ? 'is-up' : 'is-down'}`}>
          <span aria-hidden="true">{delta.up ? '▲' : '▼'}</span> {delta.text}
        </span>
      )}
      {hint && <span className="stat-tile-hint">{hint}</span>}
    </p>
  </div>
);

export default StatTile;
