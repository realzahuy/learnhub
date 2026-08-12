import React from 'react';
import './Stepper.css';

interface StepperProps {

  steps: string[];

  current: number;

  onStepClick?: (index: number) => void;
}

const Stepper: React.FC<StepperProps> = ({ steps, current, onStepClick }) => {
  return (
    <ol className="app-stepper" aria-label="Tiến độ">
      {steps.map((label, index) => {
        const isDone = index < current;
        const isActive = index === current;

        const canJump = Boolean(onStepClick) && isDone;

        const state = isDone ? 'is-done' : isActive ? 'is-active' : '';

        return (
          <li
            key={label}
            className={`app-stepper-item ${state}`}
            aria-current={isActive ? 'step' : undefined}
          >
            { }
            <button
              type="button"
              className="app-stepper-button"
              onClick={canJump ? () => onStepClick?.(index) : undefined}
              disabled={!canJump}

              aria-label={`Bước ${index + 1}: ${label}`}
            >
              <span className="app-stepper-dot" aria-hidden="true">
                {isDone ? <i className="bi bi-check-lg"></i> : index + 1}
              </span>
              <span className="app-stepper-label">{label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
};

export default Stepper;
