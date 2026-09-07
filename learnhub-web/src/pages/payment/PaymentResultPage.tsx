import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { uiConfig } from '../../config/uiConfig';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { paymentService } from '../../services/api/payment.service';
import { getAuthGeneration } from '../../services/api/tokenStore';
import { queryClient } from '../../query/queryClient';
import { queryKeys } from '../../query/queryKeys';
import {
  PaymentMethod,
  PaymentResponse,
  PaymentStatus,
} from '../../types/payment.types';
import { formatPrice } from '../../utils';
import { ROUTE_PATHS } from '../../routes/paths';
import './PaymentResultPage.css';

const parsePaymentId = (rawValue: string | null): number | null => {
  if (!rawValue || !/^\d+$/.test(rawValue)) return null;
  const parsed = Number(rawValue);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

interface PaymentResultPageContentProps {
  attemptedCaptures: Set<string>;
}

const PaymentResultPageContent = ({ attemptedCaptures }: PaymentResultPageContentProps) => {
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { removeManyFromCart } = useCart();

  const provider = searchParams.get('provider')?.toUpperCase() ?? null;
  const paypalOrderId = searchParams.get('token');
  const paypalCancelled = searchParams.get('cancelled') === 'true';
  const isPayPal = provider === 'PAYPAL' || paypalOrderId !== null || paypalCancelled;

  const momoOrderId = searchParams.get('orderId');
  const momoPaymentId = parsePaymentId(momoOrderId?.split('_')[0] ?? null);
  const paypalPaymentId = parsePaymentId(searchParams.get('paymentId'));
  const paymentId = isPayPal ? paypalPaymentId : momoPaymentId;

  const momoFailed = !isPayPal
    && searchParams.has('resultCode')
    && searchParams.get('resultCode') !== '0';
  const momoMessage = !isPayPal ? searchParams.get('message') : null;

  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    isPayPal ? 'PAYPAL' : null
  );
  const [totalPrice, setTotalPrice] = useState<number | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const clearedPaymentsRef = useRef(new Set<number>());
  const attemptedActionsRef = useRef(new Set<string>());
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);

  const handleSuccess = useCallback(
    (successfulPaymentId: number, paidCourseIds: number[]) => {
      if (clearedPaymentsRef.current.has(successfulPaymentId)) return;
      clearedPaymentsRef.current.add(successfulPaymentId);
      removeManyFromCart(paidCourseIds);
      void queryClient.invalidateQueries({ queryKey: queryKeys.enrollments.all });
    },
    [removeManyFromCart]
  );

  const applyPayment = useCallback(
    (payment: PaymentResponse) => {
      setStatus(payment.status);
      setPaymentMethod(payment.paymentMethod);
      setTotalPrice(payment.totalPrice);

      if (payment.status === 'SUCCESS') {
        const successfulPaymentId = payment.paymentId ?? paymentId;
        if (successfulPaymentId !== null) {
          handleSuccess(successfulPaymentId, payment.paidCourseIds);
        }
      }
    },
    [handleSuccess, paymentId]
  );

  const checkPaymentStatus = useCallback(async () => {
    if (!isAuthenticated || paymentId === null) return;

    setIsChecking(true);
    setHasError(false);
    const requestGeneration = getAuthGeneration();
    try {
      const payment = await paymentService.getStatus(paymentId);
      if (activeRef.current && getAuthGeneration() === requestGeneration) applyPayment(payment);
    } catch {
      if (activeRef.current && getAuthGeneration() === requestGeneration) setHasError(true);
    } finally {
      if (activeRef.current && getAuthGeneration() === requestGeneration) setIsChecking(false);
    }
  }, [applyPayment, isAuthenticated, paymentId]);

  const processPayPalReturn = useCallback(async () => {
    if (!isAuthenticated || paymentId === null) return;
    if (paypalCancelled) {
      setStatus('CANCELLED');
      return;
    }
    if (!paypalOrderId) return;

    setIsChecking(true);
    setHasError(false);
    const requestGeneration = getAuthGeneration();
    try {
      const payment = await paymentService.capturePayPal(paymentId, paypalOrderId);
      if (activeRef.current && getAuthGeneration() === requestGeneration) applyPayment(payment);
    } catch {
      if (activeRef.current && getAuthGeneration() === requestGeneration) setHasError(true);
    } finally {
      if (activeRef.current && getAuthGeneration() === requestGeneration) setIsChecking(false);
    }
  }, [applyPayment, isAuthenticated, paymentId, paypalCancelled, paypalOrderId]);

  useEffect(() => {
    if (!isAuthenticated || paymentId === null) return;

    const actionKey = isPayPal
      ? `${paypalCancelled ? 'cancel' : 'capture'}:${paymentId}:${paypalOrderId ?? ''}`
      : `status:${paymentId}`;
    if (isPayPal && paypalOrderId && !paypalCancelled) {
      if (attemptedCaptures.has(actionKey)) {
        void checkPaymentStatus();
        return;
      }
      attemptedCaptures.add(actionKey);
    }
    if (attemptedActionsRef.current.has(actionKey)) return;
    attemptedActionsRef.current.add(actionKey);

    if (isPayPal && (paypalCancelled || paypalOrderId)) {
      void processPayPalReturn();
    } else {
      void checkPaymentStatus();
    }
  }, [
    checkPaymentStatus,
    attemptedCaptures,
    isAuthenticated,
    isPayPal,
    paymentId,
    paypalCancelled,
    paypalOrderId,
    processPayPalReturn,
  ]);

  useEffect(() => {
    if (
      !isAuthenticated
      || isPayPal
      || paymentId === null
      || status !== 'PENDING'
      || momoFailed
    ) {
      return;
    }

    let cancelled = false;
    let timeoutId: number | undefined;
    let attempts = 0;

    const poll = () => {
      timeoutId = window.setTimeout(async () => {
        if (cancelled) return;
        attempts += 1;
        await checkPaymentStatus();
        if (!cancelled && attempts < uiConfig.payment.momoMaxPollAttempts) {
          poll();
        }
      }, uiConfig.payment.momoPollMs);
    };

    poll();
    return () => {
      cancelled = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [checkPaymentStatus, isAuthenticated, isPayPal, momoFailed, paymentId, status]);

  const retry = isPayPal && paypalOrderId && !paypalCancelled
    ? processPayPalReturn
    : checkPaymentStatus;
  const providerLabel = paymentMethod === 'PAYPAL' || isPayPal ? 'PayPal' : 'MoMo';
  const renderBody = () => {
    if (isAuthLoading) {
      return <p className="payment-result-text">Đang tải...</p>;
    }

    if (!isAuthenticated) {
      return (
        <>
          <h1 className="payment-result-title">Cần đăng nhập</h1>
          <p className="payment-result-text">
            Đăng nhập để xem trạng thái đơn thanh toán.
          </p>
        </>
      );
    }

    if (paymentId === null) {
      return (
        <>
          <i className="bi bi-receipt payment-result-icon"></i>
          <h1 className="payment-result-title">Không có đơn nào để hiển thị</h1>
          <p className="payment-result-text">
            Đường dẫn kết quả thanh toán không chứa mã đơn hợp lệ.
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
            {totalPrice != null && `Đã thanh toán ${formatPrice(totalPrice)} qua ${providerLabel}. `}
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

    if (status === 'FAILED' || status === 'EXPIRED' || status === 'CANCELLED' || momoFailed) {
      const failureMessage = status === 'CANCELLED'
        ? 'Bạn đã hủy giao dịch. Các khóa học vẫn được giữ nguyên trong giỏ hàng.'
        : momoMessage
          || 'Giao dịch chưa được xác nhận thành công. Các khóa học vẫn được giữ nguyên trong giỏ hàng.';
      return (
        <>
          <i className="bi bi-x-circle-fill payment-result-icon payment-result-icon-danger"></i>
          <h1 className="payment-result-title">Thanh toán chưa hoàn tất</h1>
          <p className="payment-result-text">{failureMessage}</p>
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

    if (hasError && !isChecking) {
      return (
        <>
          <i className="bi bi-exclamation-circle payment-result-icon payment-result-icon-warning"></i>
          <h1 className="payment-result-title">Chưa xác nhận được thanh toán</h1>
          <p className="payment-result-text">
            Giỏ hàng chưa bị thay đổi. Hãy thử xác nhận lại trạng thái giao dịch.
          </p>
          <div className="payment-result-actions">
            <button type="button" className="btn btn-notion" onClick={() => void retry()}>
              Xác nhận lại
            </button>
            <Link className="btn btn-outline-notion" to={ROUTE_PATHS.cart}>
              Về giỏ hàng
            </Link>
          </div>
        </>
      );
    }

    if (status === 'PENDING') {
      return (
        <>
          <h1 className="payment-result-title">Đơn vẫn đang chờ xác nhận</h1>
          <p className="payment-result-text">
            {providerLabel} chưa xác nhận giao dịch hoàn tất. Nếu bạn vừa thanh toán,
            hãy chờ một chút rồi kiểm tra lại.
          </p>
          <div className="payment-result-actions">
            <button
              type="button"
              className="btn btn-notion"
              onClick={() => void retry()}
              disabled={isChecking}
            >
              {isChecking ? 'Đang kiểm tra...' : 'Kiểm tra lại'}
            </button>
            <Link className="btn btn-outline-notion" to={ROUTE_PATHS.cart}>
              Về giỏ hàng
            </Link>
          </div>
        </>
      );
    }

    return (
      <>
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
          {renderBody()}
        </div>
      </main>
    </div>
  );
};

const PaymentResultPage = () => {
  const location = useLocation();
  const { userId } = useAuth();
  const attemptedCaptures = useRef(new Set<string>()).current;
  return (
    <PaymentResultPageContent
      key={`${userId ?? 'anonymous'}:${location.search}`}
      attemptedCaptures={attemptedCaptures}
    />
  );
};

export default PaymentResultPage;
