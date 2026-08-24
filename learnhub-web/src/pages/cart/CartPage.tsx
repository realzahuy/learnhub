import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import {
  PAYMENT_METHOD_MOMO,
  PAYMENT_METHOD_PAYPAL,
  paymentService,
} from '../../services/api/payment.service';
import { PaymentMethod } from '../../types/payment.types';
import { formatPrice, getApiErrorMessage } from '../../utils';
import { ROUTE_PATHS, routeTo } from '../../routes/paths';
import './CartPage.css';

const EmptyCartIcon: React.FC = () => (
  <svg width="96" height="96" viewBox="0 0 24 24" fill="currentColor" className="empty-cart-icon">
    <path d="M19,7H16V6A4,4,0,0,0,8,6V7H5A1,1,0,0,0,4,8V19a3,3,0,0,0,3,3H17a3,3,0,0,0,3-3V8A1,1,0,0,0,19,7ZM10,6a2,2,0,0,1,4,0V7H10Zm8,13a1,1,0,0,1-1,1H7a1,1,0,0,1-1-1V9H8v1a1,1,0,0,0,2,0V9h4v1a1,1,0,0,0,2,0V9h2Z" />
  </svg>
);

const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { items, cartCount, totalPrice, removeFromCart, clearCart } = useCart();
  const { showToast } = useToast();
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PAYMENT_METHOD_MOMO);

  const handleConfirmClearCart = useCallback(() => {
    clearCart();
    setIsClearConfirmOpen(false);
  }, [clearCart]);

  const handleCancelClearCart = useCallback(() => {
    setIsClearConfirmOpen(false);
  }, []);

  const handleCheckout = async () => {
    if (!isAuthenticated) {

      navigate(ROUTE_PATHS.login, { state: { from: ROUTE_PATHS.cart } });
      return;
    }
    if (items.length === 0 || isCheckingOut) return;

    setIsCheckingOut(true);
    try {
      const payment = await paymentService.create({
        courseIds: items.map((item) => item.id),
        paymentMethod,
      });

      if (payment.payUrl) {
        window.location.assign(payment.payUrl);
        return;
      }

      showToast(payment.message || 'Đã thêm khóa học vào tài khoản.', 'success');
      navigate(ROUTE_PATHS.myCourses);
    } catch (err) {
      console.error('Không thể tạo đơn thanh toán:', err);
      showToast(getApiErrorMessage(err, 'Không tạo được đơn thanh toán. Vui lòng thử lại.'), 'error');
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="cart-page">

      <main className="cart-main">
        <div className="container py-5">
          {cartCount === 0 ? (
            <div className="cart-empty text-center py-5">
              <h2 className="h4 fw-bold mt-4 mb-2">Giỏ hàng của bạn đang trống</h2>
              <p className="text-muted mb-4">
                Hãy khám phá các khóa học và thêm vào giỏ hàng để bắt đầu học.
              </p>
              <Link to={ROUTE_PATHS.courses} className="btn btn-notion btn-lg px-4">
                Khám phá khóa học
              </Link>
            </div>
          ) : (
            <div className="row g-4">
              { }
              <div className="col-lg-8">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <p className="text-muted mb-0">
                    <span className="fw-semibold text-dark">{cartCount}</span> khóa học trong giỏ hàng
                  </p>
                  <button
                    className="btn btn-danger btn-sm clear-cart-btn"
                    onClick={() => setIsClearConfirmOpen(true)}
                  >
                    Xóa toàn bộ
                  </button>
                </div>

                <div className="cart-items">
                  {items.map((item) => (
                    <div key={item.id} className="cart-item">
                      <Link to={routeTo.courseDetail(item.slug)} className="cart-item-thumbnail">
                        {item.thumbnail ? (
                          <img
                            src={item.thumbnail}
                            alt={item.title}
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="cart-item-thumbnail-placeholder"></div>
                        )}
                      </Link>

                      <div className="cart-item-body">
                        <Link to={routeTo.courseDetail(item.slug)} className="cart-item-title">
                          {item.title}
                        </Link>
                        <p className="cart-item-instructor text-muted mb-0">{item.instructorName}</p>
                      </div>

                      <div className="cart-item-actions">
                        <span className="cart-item-price fw-bold text-notion">
                          {formatPrice(item.price)}
                        </span>
                        <button
                          className="btn btn-danger btn-sm remove-item-btn"
                          onClick={() => removeFromCart(item.id)}
                          aria-label={`Xóa ${item.title} khỏi giỏ hàng`}
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              { }
              <div className="col-lg-4">
                <div className="cart-summary">
                  <h2 className="h6 text-uppercase text-muted fw-semibold mb-2">Tổng cộng</h2>
                  <p className="cart-summary-total fw-bold text-notion mb-4">
                    {formatPrice(totalPrice)}
                  </p>

                  <fieldset className="payment-method-fieldset" disabled={isCheckingOut}>
                    <legend>Phương thức thanh toán</legend>
                    <label
                      className={`payment-method-option ${
                        paymentMethod === PAYMENT_METHOD_MOMO ? 'is-selected' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={PAYMENT_METHOD_MOMO}
                        checked={paymentMethod === PAYMENT_METHOD_MOMO}
                        onChange={() => setPaymentMethod(PAYMENT_METHOD_MOMO)}
                      />
                      <span className="payment-method-icon" aria-hidden="true">
                        <i className="bi bi-wallet2"></i>
                      </span>
                      <span>
                        <strong>MoMo</strong>
                        <small>Thẻ ATM Napas hoặc ví MoMo</small>
                      </span>
                    </label>

                    <label
                      className={`payment-method-option ${
                        paymentMethod === PAYMENT_METHOD_PAYPAL ? 'is-selected' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={PAYMENT_METHOD_PAYPAL}
                        checked={paymentMethod === PAYMENT_METHOD_PAYPAL}
                        onChange={() => setPaymentMethod(PAYMENT_METHOD_PAYPAL)}
                      />
                      <span className="payment-method-icon payment-method-icon-paypal" aria-hidden="true">
                        <i className="bi bi-paypal"></i>
                      </span>
                      <span>
                        <strong>PayPal</strong>
                        <small>Thanh toán bằng PayPal, quy đổi sang USD</small>
                      </span>
                    </label>
                  </fieldset>

                  <button
                    className="btn btn-notion w-100 btn-lg mb-2"
                    onClick={handleCheckout}
                    disabled={isCheckingOut}
                  >
                    {isCheckingOut ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                          aria-hidden="true"
                        ></span>
                        Đang chuyển tới trang thanh toán...
                      </>
                    ) : (
                      'Thanh toán'
                    )}
                  </button>
                  <button
                    className="btn btn-outline-notion w-100"
                    onClick={() => navigate(ROUTE_PATHS.courses)}
                  >
                    Tiếp tục xem khóa học
                  </button>

                  {!isAuthenticated && (
                    <p className="text-muted small mt-3 mb-0 text-center">
                      Bạn cần đăng nhập để thanh toán.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <ConfirmDialog
        isOpen={isClearConfirmOpen}
        title="Xóa toàn bộ giỏ hàng?"
        message={`${cartCount} khóa học sẽ bị xóa khỏi giỏ hàng của bạn.`}
        confirmLabel="Xóa toàn bộ"
        cancelLabel="Hủy"
        variant="danger"
        onConfirm={handleConfirmClearCart}
        onCancel={handleCancelClearCart}
      />
    </div>
  );
};

export default CartPage;
