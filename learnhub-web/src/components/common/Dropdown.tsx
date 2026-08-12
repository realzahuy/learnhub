import React, { useState, useRef, useEffect, useCallback } from 'react';
import { usePopoverPlacement } from '../../hooks/usePopoverPlacement';
import './Dropdown.css';

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;

  ariaLabel: string;

  placeholder?: string;
  className?: string;

  id?: string;
  disabled?: boolean;
}

const Dropdown: React.FC<DropdownProps> = ({
  value,
  options,
  onChange,
  ariaLabel,
  placeholder = 'Chọn...',
  className = '',
  id,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const { dropUp } = usePopoverPlacement(isOpen, toggleRef, menuRef);

  const selected = options.find((option) => option.value === value);

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

  const handleSelect = useCallback(
    (next: string) => {
      setIsOpen(false);
      if (next !== value) onChange(next);
    },
    [onChange, value]
  );

  return (
    <div className={`app-dropdown ${className}`} ref={rootRef}>
      <button
        type="button"
        id={id}
        ref={toggleRef}
        className={`app-dropdown-toggle ${isOpen ? 'is-open' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
      >
        <span className="app-dropdown-value">{selected ? selected.label : placeholder}</span>
        <i className="bi bi-chevron-down app-dropdown-caret"></i>
      </button>

      {isOpen && !disabled && (
        <ul
          ref={menuRef}
          className={`app-dropdown-menu${dropUp ? ' is-drop-up' : ''}`}
          role="listbox"
          aria-label={ariaLabel}
        >
          {options.length === 0 ? (
            <li className="app-dropdown-empty">Không có lựa chọn</li>
          ) : (
            options.map((option) => {
              const isSelected = option.value === value;

              return (
                <li
                  key={option.value || '__all__'}
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={0}
                  className={`app-dropdown-item${isSelected ? ' is-selected' : ''}`}
                  onClick={() => handleSelect(option.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleSelect(option.value);
                    }
                  }}
                >
                  <span>{option.label}</span>
                  {isSelected && <i className="bi bi-check-lg" aria-hidden="true"></i>}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
};

export default Dropdown;
