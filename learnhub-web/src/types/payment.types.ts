
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'CANCELLED';
export type PaymentMethod = 'MOMO' | 'PAYPAL';

export interface CreatePaymentRequest {
  courseIds: number[];
  paymentMethod: PaymentMethod;
}

export interface PaymentResponse {
  paymentId: number | null;
  payUrl: string | null;
  totalPrice: number;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  transactionId: string | null;
  createdAt: string | null;
  paidCourseIds: number[];
  message: string | null;
}

export interface PayPalCaptureRequest {
  orderId: string;
}
