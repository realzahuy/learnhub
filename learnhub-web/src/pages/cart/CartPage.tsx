import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { PAYMENT_METHOD_MOMO, paymentService } from '../../services/api/payment.service';
import { formatPrice, getApiErrorMessage } from '../../utils';
import { ROUTE_PATHS, routeTo } from '../../routes/paths';
import './CartPage.css';

const EmptyCartIcon: React.FC = () => (
  <svg width="96" height="96" viewBox="0 0 24 24" fill="currentColor" className="empty-cart-icon">
    <path d="M19,7H16V6A4,4,0,0,0,8,6V7H5A1,1,0,0,0,4,8V19a3,3,0,0,0,3,3H17a3,3,0,0,0,3-3V8A1,1,0,0,0,19,7ZM10,6a2,2,0,0,1,4,0V7H10Zm8,13a1,1,0,0,1-1,1H7a1,1,0,0,1-1-1V9H8v1a1,1,0,0,0,2,0V9h4v1a1,1,0,0,0,2,0V9h2Z" />
  </svg>
);

const TrashIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20,6H16.5V5A3,3,0,0,0,13.5,2h-3A3,3,0,0,0,7.5,5V6H4a1,1,0,0,0,0,2H5V19a3,3,0,0,0,3,3h8a3,3,0,0,0,3-3V8h1a1,1,0,0,0,0-2ZM9.5,5a1,1,0,0,1,1-1h3a1,1,0,0,1,1,1V6h-5Zm7.5,14a1,1,0,0,1-1,1H8a1,1,0,0,1-1-1V8H17ZM10,17a1,1,0,0,0,1-1V12a1,1,0,0,0-2,0v4A1,1,0,0,0,10,17Zm4,0a1,1,0,0,0,1-1V12a1,1,0,0,0-2,0v4A1,1,0,0,0,14,17Z" />
  </svg>
);

const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { items, cartCount, totalPrice, removeFromCart, clearCart } = useCart();
  const { showToast } = useToast();
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

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
        paymentMethod: PAYMENT_METHOD_MOMO,
      });

      payment.freeEnrolled.forEach((free) => removeFromCart(free.courseId));

      if (payment.payUrl) {
        window.location.href = payment.payUrl;
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
              <EmptyCartIcon />
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
                    className="btn btn-link text-danger p-0 clear-cart-btn"
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
                          className="btn btn-link text-danger p-0 remove-item-btn"
                          onClick={() => removeFromCart(item.id)}
                          aria-label={`Xóa ${item.title} khỏi giỏ hàng`}
                        >
                          <TrashIcon />
                          <span className="ms-1">Xóa</span>
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
                        Đang chuyển tới MoMo...
                      </>
                    ) : (
                      'Thanh toán với MoMo'
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
