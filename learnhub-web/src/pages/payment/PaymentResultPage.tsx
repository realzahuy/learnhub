import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { paymentService } from '../../services/api/payment.service';
import { PaymentStatus } from '../../types/payment.types';
import { formatPrice, getApiErrorMessage } from '../../utils';
import { ROUTE_PATHS } from '../../routes/paths';
import './PaymentResultPage.css';

const POLL_INTERVAL_MS = 2000;

const MAX_POLLS = 12;

const PaymentResultPage = () => {
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { removeFromCart } = useCart();

  const orderId = searchParams.get('orderId');
  const rawPaymentId = orderId?.split('_')[0];
  const paymentId = rawPaymentId && /^\d+$/.test(rawPaymentId) ? Number(rawPaymentId) : null;

  const momoFailed = searchParams.has('resultCode') && searchParams.get('resultCode') !== '0';
  const momoMessage = searchParams.get('message');

  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [totalPrice, setTotalPrice] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  const clearedRef = useRef(false);

  const handleSuccess = useCallback(
    (paidCourseIds: number[]) => {
      if (clearedRef.current) return;
      clearedRef.current = true;

      paidCourseIds.forEach((courseId) => removeFromCart(courseId));
    },
    [removeFromCart]
  );

  useEffect(() => {
    if (!isAuthenticated || paymentId === null) return;

    let cancelled = false;
    let polls = 0;
    let timer: number | undefined;

    const check = async () => {
      try {
        const payment = await paymentService.getStatus(paymentId);
        if (cancelled) return;

        setStatus(payment.status);
        setTotalPrice(payment.totalPrice);
        setError(null);

        if (payment.status === 'SUCCESS') {
          handleSuccess(payment.paidCourseIds);
          return;
        }
        if (payment.status !== 'PENDING') return;

        polls += 1;
        if (polls >= MAX_POLLS) {
          setTimedOut(true);
          return;
        }
        timer = window.setTimeout(check, POLL_INTERVAL_MS);
      } catch (err) {
        if (cancelled) return;
        console.error('Không thể tải trạng thái thanh toán:', err);
        setError(getApiErrorMessage(err, 'Không đọc được trạng thái đơn thanh toán.'));
      }
    };

    check();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [isAuthenticated, paymentId, handleSuccess]);

  const renderBody = () => {
    if (isAuthLoading) {
      return <div className="spinner-border text-notion" role="status" aria-label="Đang tải" />;
    }

    if (!isAuthenticated) {
      return (
        <>
          <i className="bi bi-person-lock payment-result-icon payment-result-icon-warning"></i>
          <h1 className="payment-result-title">Cần đăng nhập</h1>
          <p className="payment-result-text">
            Hãy đăng nhập để xem kết quả đơn thanh toán. Đơn của bạn không bị mất - MoMo báo
            về máy chủ độc lập với trình duyệt.
          </p>
          <div className="payment-result-actions">
            <Link className="btn btn-notion" to={ROUTE_PATHS.login} state={{ from: ROUTE_PATHS.paymentResult }}>
              Đăng nhập
            </Link>
          </div>
        </>
      );
    }

    if (paymentId === null) {
      return (
        <>
          <i className="bi bi-receipt payment-result-icon"></i>
          <h1 className="payment-result-title">Không có đơn nào để hiển thị</h1>
          <p className="payment-result-text">
            Trang này hiện kết quả sau khi bạn thanh toán qua MoMo.
          </p>
          <div className="payment-result-actions">
            <Link className="btn btn-notion" to={ROUTE_PATHS.courses}>
              Xem khóa học
            </Link>
          </div>
        </>
      );
    }

    if (status === 'SUCCESS') {
      return (
        <>
          <i className="bi bi-check-circle-fill payment-result-icon payment-result-icon-success"></i>
          <h1 className="payment-result-title">Thanh toán thành công</h1>
          <p className="payment-result-text">
            {totalPrice != null && `Đã thanh toán ${formatPrice(totalPrice)}. `}
            Khóa học đã được thêm vào tài khoản của bạn.
          </p>
          <div className="payment-result-actions">
            <Link className="btn btn-notion" to={ROUTE_PATHS.myCourses}>
              Khóa học của tôi
            </Link>
            <Link className="btn btn-outline-notion" to={ROUTE_PATHS.courses}>
              Tiếp tục xem khóa học
            </Link>
          </div>
        </>
      );
    }

    if (status === 'FAILED' || status === 'EXPIRED' || momoFailed) {
      return (
        <>
          <i className="bi bi-x-circle-fill payment-result-icon payment-result-icon-danger"></i>
          <h1 className="payment-result-title">Thanh toán chưa hoàn tất</h1>
          <p className="payment-result-text">
            {momoMessage || 'Giao dịch bị hủy hoặc không thành công. Bạn chưa bị trừ tiền.'}
          </p>
          <div className="payment-result-actions">
            <Link className="btn btn-notion" to={ROUTE_PATHS.cart}>
              Về giỏ hàng
            </Link>
            <Link className="btn btn-outline-notion" to={ROUTE_PATHS.courses}>
              Xem khóa học
            </Link>
          </div>
        </>
      );
    }

    if (timedOut) {
      return (
        <>
          <i className="bi bi-hourglass-split payment-result-icon payment-result-icon-warning"></i>
          <h1 className="payment-result-title">Đơn vẫn đang chờ xác nhận</h1>
          <p className="payment-result-text">
            MoMo chưa báo kết quả về hệ thống. Nếu bạn đã trả tiền, khóa học sẽ xuất hiện
            ngay khi xác nhận về - tải lại trang này sau ít phút để kiểm tra.
          </p>
          <div className="payment-result-actions">
            <button type="button" className="btn btn-notion" onClick={() => window.location.reload()}>
              Kiểm tra lại
            </button>
            <Link className="btn btn-outline-notion" to={ROUTE_PATHS.courses}>
              Xem khóa học
            </Link>
          </div>
        </>
      );
    }

    return (
      <>
        <div className="spinner-border text-notion mb-3" role="status" aria-hidden="true" />
        <h1 className="payment-result-title">Đang xác nhận thanh toán...</h1>
        <p className="payment-result-text">
          Vui lòng đợi trong giây lát, đừng đóng trang này.
        </p>
      </>
    );
  };

  return (
    <div className="payment-result-page">

      <main className="payment-result-main">
        <div className="payment-result-card">
          {error && <div className="alert alert-danger">{error}</div>}
          {renderBody()}
        </div>
      </main>

    </div>
  );
};

export default PaymentResultPage;
