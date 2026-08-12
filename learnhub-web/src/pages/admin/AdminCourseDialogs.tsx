import { InstructorCourse, COURSE_STATUS_LABELS } from '../../types/course.types';
import { formatLongDate, formatPrice } from '../../utils';
import AdminCourseContentPanel from './AdminCourseContentPanel';

interface AdminCourseDialogsProps {
  detailCourse: InstructorCourse | null;
  rejectingCourse: InstructorCourse | null;
  processingId: number | null;
  rejectComment: string;
  rejectError: string | null;
  onCloseDetail: () => void;
  onApprove: (course: InstructorCourse) => void;
  onOpenReject: (course: InstructorCourse) => void;
  onRejectCommentChange: (comment: string) => void;
  onCloseReject: () => void;
  onSubmitReject: () => void;
}

const AdminCourseDialogs = ({
  detailCourse,
  rejectingCourse,
  processingId,
  rejectComment,
  rejectError,
  onCloseDetail,
  onApprove,
  onOpenReject,
  onRejectCommentChange,
  onCloseReject,
  onSubmitReject,
}: AdminCourseDialogsProps) => (
  <>
    {detailCourse && (
      <div
        className="modal show d-block admin-detail-modal"
        tabIndex={-1}
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        onClick={(event) => event.target === event.currentTarget && onCloseDetail()}
      >
        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title mb-0">Chi tiết khóa học</h5>
              <button type="button" className="btn-close" aria-label="Đóng" onClick={onCloseDetail} />
            </div>
            <div className="modal-body">
              <div className="admin-detail-thumb">
                {detailCourse.thumbnail ? (
                  <img src={detailCourse.thumbnail} alt={detailCourse.title} />
                ) : (
                  <div className="admin-detail-thumb-empty" />
                )}
              </div>
              <div className="admin-detail-headline">
                <h3 className="admin-detail-title">{detailCourse.title}</h3>
                <span className={`admin-course-status admin-course-status-${detailCourse.status.toLowerCase()}`}>
                  {COURSE_STATUS_LABELS[detailCourse.status]}
                </span>
              </div>
              <dl className="admin-detail-fields">
                <dt>Giảng viên</dt><dd>{detailCourse.instructorName}</dd>
                <dt>Danh mục</dt><dd>{detailCourse.categoryName}</dd>
                <dt>Giá</dt><dd>{formatPrice(detailCourse.price)}</dd>
                {detailCourse.createdAt && <><dt>Ngày tạo</dt><dd>{formatLongDate(detailCourse.createdAt)}</dd></>}
              </dl>
              {detailCourse.shortDescription && (
                <div className="admin-detail-section"><h6>Mô tả ngắn</h6><p>{detailCourse.shortDescription}</p></div>
              )}
              {detailCourse.description && (
                <div className="admin-detail-section">
                  <h6>Mô tả chi tiết</h6><p className="admin-detail-desc">{detailCourse.description}</p>
                </div>
              )}
              <div className="admin-detail-section">
                <h6>Nội dung khóa học</h6>
                <AdminCourseContentPanel courseId={detailCourse.id} />
              </div>
            </div>
            {detailCourse.status === 'PENDING' && (
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-admin-reject"
                  onClick={() => onOpenReject(detailCourse)}
                  disabled={processingId === detailCourse.id}
                >Từ chối</button>
                <button
                  type="button"
                  className="btn-admin-approve"
                  onClick={() => onApprove(detailCourse)}
                  disabled={processingId === detailCourse.id}
                >{processingId === detailCourse.id ? 'Đang duyệt...' : 'Duyệt'}</button>
              </div>
            )}
          </div>
        </div>
      </div>
    )}

    {rejectingCourse && (
      <div
        className="modal show d-block admin-reject-modal"
        tabIndex={-1}
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        onClick={(event) => {
          if (event.target === event.currentTarget && processingId === null) onCloseReject();
        }}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content p-4">
            <h2 className="h5 fw-bold mb-1">Từ chối khóa học</h2>
            <p className="text-muted mb-3">{rejectingCourse.title}</p>
            {rejectError && <div className="alert alert-danger py-2">{rejectError}</div>}
            <label className="form-label" htmlFor="reject-comment">Lý do từ chối</label>
            <textarea
              id="reject-comment"
              className="form-control mb-1"
              rows={4}
              value={rejectComment}
              onChange={(event) => onRejectCommentChange(event.target.value)}
              maxLength={2000}
              disabled={processingId !== null}
              placeholder="Giảng viên sẽ thấy lý do này để chỉnh sửa khóa học"
              autoFocus
            />
            <small className="text-muted d-block mb-3">{rejectComment.length}/2000 ký tự</small>
            <div className="admin-modal-actions">
              <button type="button" className="btn-admin-neutral" onClick={onCloseReject} disabled={processingId !== null}>Hủy</button>
              <button type="button" className="btn-admin-danger" onClick={onSubmitReject} disabled={processingId !== null}>
                {processingId !== null ? 'Đang xử lý...' : 'Xác nhận từ chối'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
  </>
);

export default AdminCourseDialogs;
