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

  const pages: (number | 'start-gap' | 'end-gap')[] = [];
  if (totalPages <= 7) {
    for (let page = 0; page < totalPages; page++) pages.push(page);
  } else if (currentPage <= 3) {
    pages.push(0, 1, 2, 3, 4, 'end-gap', totalPages - 1);
  } else if (currentPage >= totalPages - 4) {
    pages.push(0, 'start-gap');
    for (let page = totalPages - 5; page < totalPages; page++) pages.push(page);
  } else {
    pages.push(0, 'start-gap', currentPage - 1, currentPage, currentPage + 1, 'end-gap', totalPages - 1);
  }

  return (
    <div className="d-flex justify-content-center mt-5">
      <nav aria-label="Phân trang">
        <ul className="pagination">
          <li className={`page-item ${isFirst ? 'disabled' : ''}`}>
            <button
              type="button"
              className="page-link"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={isFirst}
              aria-label={isFirst ? 'Trang trước' : `Trang trước, trang ${currentPage}`}
            >
              Trước
            </button>
          </li>

          {pages.map((page) => typeof page === 'number' ? (
            <li key={page} className={`page-item ${page === currentPage ? 'active' : ''}`}>
              <button
                type="button"
                className="page-link"
                onClick={() => onPageChange(page)}
                aria-label={`Trang ${page + 1}`}
                aria-current={page === currentPage ? 'page' : undefined}
              >
                {page + 1}
              </button>
            </li>
          ) : (
            <li key={page} className="page-item disabled" aria-hidden="true">
              <span className="page-link">…</span>
            </li>
          ))}

          <li className={`page-item ${isLast ? 'disabled' : ''}`}>
            <button
              type="button"
              className="page-link"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={isLast}
              aria-label={isLast ? 'Trang sau' : `Trang sau, trang ${currentPage + 2}`}
            >
              Sau
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Pagination;
