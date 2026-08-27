package com.zh.learnhub_api.dtos.payment;

import com.zh.learnhub_api.enums.PaymentMethod;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
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

    @NotEmpty(message = "Danh sách mã khóa học không được để trống")
    @Size(max = MAX_COURSES_PER_CHECKOUT, message = "Mỗi lần chỉ được thanh toán tối đa 20 khóa học")
    private List<
                    @NotNull(message = "Mã khóa học không được để trống")
                    @Positive(message = "Mã khóa học phải lớn hơn 0") Long>
            courseIds;

    @NotNull(message = "Phương thức thanh toán không được để trống")
    private PaymentMethod paymentMethod;
}
