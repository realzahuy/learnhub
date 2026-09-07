package com.zh.learnhub_api.mappers;

import com.zh.learnhub_api.dtos.payment.PaymentResponseDTO;
import com.zh.learnhub_api.pojo.Payment;
import com.zh.learnhub_api.pojo.PaymentItem;

import java.util.List;

public final class PaymentMapper {

    private PaymentMapper() {}

    public static PaymentResponseDTO toDTO(Payment payment, List<PaymentItem> items) {
        return PaymentResponseDTO.builder()
                .paymentId(payment.getId())
                .totalPrice(payment.getTotalPrice())
                .paymentMethod(payment.getMethod())
                .status(payment.getStatus())
                .transactionId(payment.getTransactionId())
                .createdAt(payment.getCreatedAt())
                .paidCourseIds(items.stream().map(item -> item.getCourseId().getId()).toList())
                .build();
    }
}
