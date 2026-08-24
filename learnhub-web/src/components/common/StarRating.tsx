import React, { useState } from 'react';
import { uiConfig } from '../../config/uiConfig';
import './StarRating.css';

interface StarRatingProps {

  value: number;

  onChange?: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';

  showValue?: boolean;

  count?: number;
  className?: string;
}

const SIZE_PX: Record<NonNullable<StarRatingProps['size']>, number> = {
  sm: 14,
  md: 18,
  lg: 24,
};

const StarRating: React.FC<StarRatingProps> = ({
  value,
  onChange,
  size = 'md',
  showValue = false,
  count,
  className = '',
}) => {

  const [hovered, setHovered] = useState(0);

  const isInput = typeof onChange === 'function';
  const px = SIZE_PX[size];

  const shown = isInput && hovered > 0 ? hovered : value;

  const star = (
    <svg viewBox="0 0 24 24" width={px} height={px} fill="currentColor" aria-hidden="true">
      <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  );

  return (
    <span
      className={`star-rating ${isInput ? 'star-rating--input' : ''} ${className}`}
      role={isInput ? 'radiogroup' : 'img'}
      aria-label={isInput ? 'Chọn số sao' : `${value} trên 5 sao`}
      onMouseLeave={isInput ? () => setHovered(0) : undefined}
    >
      {[1, 2, 3, 4, 5].map((position) => {

        const fillPercent = Math.max(0, Math.min(1, shown - position + 1)) * 100;

        const content = (
          <>
            {star}
            <span className="star-rating__fill" style={{ width: `${fillPercent}%` }}>
              {star}
            </span>
          </>
        );

        return isInput ? (
          <button
            key={position}
            type="button"
            className="star-rating__star"
            style={{ width: px, height: px }}
            onClick={() => onChange!(position)}
            onMouseEnter={() => setHovered(position)}
            role="radio"
            aria-checked={value === position}
            aria-label={`${position} sao`}
          >
            {content}
          </button>
        ) : (
          <span
            key={position}
            className="star-rating__star"
            style={{ width: px, height: px }}
          >
            {content}
          </span>
        );
      })}

      {showValue && <span className="star-rating__value">{value.toFixed(1)}</span>}
      {count !== undefined && (
        <span className="star-rating__count">
          ({count.toLocaleString(uiConfig.formatting.locale)})
        </span>
      )}
    </span>
  );
};

export default StarRating;
