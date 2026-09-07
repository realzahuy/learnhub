package com.zh.learnhub_api.services.payment;

import com.zh.learnhub_api.dtos.payment.PaymentResponseDTO;
import com.zh.learnhub_api.exceptions.ResourceNotFoundException;
import com.zh.learnhub_api.mappers.PaymentMapper;
import com.zh.learnhub_api.pojo.Payment;
import com.zh.learnhub_api.repositories.payment.PaymentItemRepository;
import com.zh.learnhub_api.repositories.payment.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PaymentStatusService {

    private final PaymentRepository paymentRepository;
    private final PaymentItemRepository paymentItemRepository;
    private final PaymentExpirationService expirationService;

    @Transactional
    public PaymentResponseDTO getPaymentStatus(Long paymentId, Long userId) {
        Payment payment = paymentRepository
                .findByIdAndUserId_Id(paymentId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn thanh toán"));
        payment = expirationService.expireIfOverdue(payment, userId);
        return PaymentMapper.toDTO(payment, paymentItemRepository.findByPaymentId(payment));
    }
}
