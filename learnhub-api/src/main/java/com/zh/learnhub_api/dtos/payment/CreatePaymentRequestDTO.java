package com.zh.learnhub_api.dtos.payment;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreatePaymentRequestDTO {

    public static final int MAX_COURSES_PER_CHECKOUT = 20;
    
    @NotEmpty(message = "Course IDs are required")
    @Size(max = MAX_COURSES_PER_CHECKOUT,
          message = "Mỗi lần chỉ được thanh toán tối đa 20 khóa học")
    private List<Long> courseIds;
    
    @NotNull(message = "Payment method is required")
    private String paymentMethod;
}
