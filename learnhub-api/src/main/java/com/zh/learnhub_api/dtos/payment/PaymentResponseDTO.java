package com.zh.learnhub_api.dtos.payment;

import com.zh.learnhub_api.enums.PaymentMethod;
import com.zh.learnhub_api.enums.PaymentStatus;
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
    private PaymentMethod paymentMethod;
    private PaymentStatus status;
    private String transactionId;
    private LocalDateTime createdAt;

    private List<Long> paidCourseIds;
    private String message;
}
