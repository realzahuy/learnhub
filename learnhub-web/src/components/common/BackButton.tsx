import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './BackButton.css';

interface BackButtonProps {
  fallback: string;
}

const BackButton: React.FC<BackButtonProps> = ({ fallback }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {

    if (location.key !== 'default') {
      navigate(-1);
      return;
    }

    navigate(fallback, { replace: true });
  };

  return (
    <button
      type="button"
      className="back-button"
      onClick={handleBack}
      aria-label="Quay lại"
      title="Quay lại"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M18 15l-6-6-6 6" />
      </svg>
    </button>
  );
};

export default BackButton;
