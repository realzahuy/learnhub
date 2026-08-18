
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'CANCELLED';

export interface CreatePaymentRequest {
  courseIds: number[];
  paymentMethod: string;
}

export interface PaymentResponse {
  paymentId: number | null;
  payUrl: string | null;
  totalPrice: number;
  paymentMethod: string;
  status: PaymentStatus;
  transactionId: string | null;
  createdAt: string | null;
  paidCourseIds: number[];
  message: string;
}
