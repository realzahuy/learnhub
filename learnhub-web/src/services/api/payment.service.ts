import apiClient from './config';
import { CreatePaymentRequest, PaymentResponse } from '../../types/payment.types';

export const PAYMENT_METHOD_MOMO = 'MOMO';

export const paymentService = {

  create: async (payload: CreatePaymentRequest): Promise<PaymentResponse> => {
    const response = await apiClient.post<PaymentResponse>('/payments', payload);
    return response.data;
  },

  getStatus: async (paymentId: number): Promise<PaymentResponse> => {
    const response = await apiClient.get<PaymentResponse>(`/payments/${paymentId}`);
    return response.data;
  },
};
