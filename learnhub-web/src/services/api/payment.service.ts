import apiClient from './config';
import {
  CreatePaymentRequest,
  PayPalCaptureRequest,
  PaymentResponse,
} from '../../types/payment.types';

export const PAYMENT_METHOD_MOMO = 'MOMO';
export const PAYMENT_METHOD_PAYPAL = 'PAYPAL';

export const paymentService = {

  create: async (payload: CreatePaymentRequest): Promise<PaymentResponse> => {
    const response = await apiClient.post<PaymentResponse>('/payments', payload);
    return response.data;
  },

  getStatus: async (paymentId: number): Promise<PaymentResponse> => {
    const response = await apiClient.get<PaymentResponse>(`/payments/${paymentId}`, {
      showTopProgress: false,
    });
    return response.data;
  },

  capturePayPal: async (paymentId: number, orderId: string): Promise<PaymentResponse> => {
    const payload: PayPalCaptureRequest = { orderId };
    const response = await apiClient.post<PaymentResponse>(
      `/payments/${paymentId}/paypal/capture`,
      payload
    );
    return response.data;
  },
};
