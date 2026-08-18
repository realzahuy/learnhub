package com.zh.learnhub_api.dtos.payment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentResponseDTO {

    private Long paymentId;
    private String payUrl;
    private BigDecimal totalPrice;
    private String paymentMethod;
    private String status;
    private String transactionId;
    private LocalDateTime createdAt;

    private List<Long> paidCourseIds;
    private String message;
}
