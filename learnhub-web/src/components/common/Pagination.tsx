import React from 'react';

interface PaginationProps {

  currentPage: number;
  totalPages: number;
  isFirst: boolean;
  isLast: boolean;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  isFirst,
  isLast,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  return (
    <div className="d-flex justify-content-center mt-5">
      <nav aria-label="Phân trang">
        <ul className="pagination">
          <li className={`page-item ${isFirst ? 'disabled' : ''}`}>
            <button className="page-link" onClick={() => onPageChange(currentPage - 1)} disabled={isFirst}>
              Trước
            </button>
          </li>

          {Array.from({ length: totalPages }, (_, i) => (
            <li key={i} className={`page-item ${i === currentPage ? 'active' : ''}`}>
              <button className="page-link" onClick={() => onPageChange(i)}>
                {i + 1}
              </button>
            </li>
          ))}

          <li className={`page-item ${isLast ? 'disabled' : ''}`}>
            <button className="page-link" onClick={() => onPageChange(currentPage + 1)} disabled={isLast}>
              Sau
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Pagination;
