package com.zh.learnhub_api.services.payment;

import com.zh.learnhub_api.dtos.payment.CreatePaymentRequestDTO;
import com.zh.learnhub_api.dtos.payment.PaymentResponseDTO;
import com.zh.learnhub_api.enums.PaymentStatus;
import com.zh.learnhub_api.exceptions.ResourceNotFoundException;
import com.zh.learnhub_api.pojo.Enrollment;
import com.zh.learnhub_api.pojo.Payment;
import com.zh.learnhub_api.pojo.PaymentItem;
import com.zh.learnhub_api.repositories.learning.EnrollmentRepository;
import com.zh.learnhub_api.repositories.payment.PaymentItemRepository;
import com.zh.learnhub_api.repositories.payment.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final PaymentItemRepository paymentItemRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final PaymentGatewayRegistry paymentGatewayRegistry;
    private final PaymentLifecycle paymentLifecycle;
    private final PaymentCheckoutTransactionService checkoutTransactionService;
    private final PaymentExpirationService expirationService;

    public PaymentResponseDTO createPayment(CreatePaymentRequestDTO request, Long userId) {
        PaymentCheckoutTransactionService.CheckoutDraft draft =
                checkoutTransactionService.createPendingCheckout(request, userId);

        Payment payment = draft.payment();
        String payUrl;
        try {
            PaymentGateway paymentGateway =
                    paymentGatewayRegistry.getProvider(draft.paymentMethod());
            payUrl = paymentGateway.createPaymentUrl(payment);
        } catch (RuntimeException gatewayError) {

            try {
                checkoutTransactionService.markGatewayCreationFailed(payment.getId());
            } catch (RuntimeException statusUpdateError) {
                gatewayError.addSuppressed(statusUpdateError);
            }
            throw gatewayError;
        }

        return PaymentResponseDTO.builder()
                .paymentId(payment.getId())
                .payUrl(payUrl)
                .totalPrice(draft.totalPrice())
                .paymentMethod(draft.paymentMethod())
                .status(PaymentStatus.PENDING.name())
                .paidCourseIds(draft.paidCourseIds())
                .message("Tiếp tục thanh toán " + draft.paidCourseIds().size() + " khóa học.")
                .build();
    }

    @Transactional(noRollbackFor = SecurityException.class)
    public void handlePaymentCallback(String providerName, Map<String, String> params) {
        PaymentGateway paymentGateway = paymentGatewayRegistry.getProvider(providerName);

        if (!paymentGateway.verifyCallback(params)) {
            throw new SecurityException("Chữ ký thanh toán không hợp lệ");
        }

        PaymentGateway.CallbackResult result = paymentGateway.parseCallback(params);
        Payment payment = paymentRepository.findByIdForUpdate(result.paymentId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Không tìm thấy đơn thanh toán"));

        if (!paymentLifecycle.isPending(payment)) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        if (!result.successful()) {
            paymentLifecycle.markFailed(payment, now);
            return;
        }

        BigDecimal expectedAmount = payment.getTotalPrice();
        BigDecimal actualAmount = result.amount();
        if (actualAmount.compareTo(expectedAmount) != 0) {
            paymentLifecycle.markFailed(payment, now);
            throw new SecurityException(
                    "Số tiền không khớp: mong đợi " + expectedAmount
                            + " nhưng nhận " + actualAmount);
        }

        paymentLifecycle.markSuccessful(payment, result.transactionId(), now);

        List<PaymentItem> items = paymentItemRepository.findByPaymentId(payment);
        if (items.isEmpty()) {
            return;
        }

        List<Long> courseIds = items.stream()
                .map(item -> item.getCourseId().getId())
                .toList();
        Set<Long> enrolledCourseIds = enrollmentRepository
                .findCourseIdsByUserAndCourseIds(payment.getUserId(), courseIds);

        List<Enrollment> newEnrollments = items.stream()
                .filter(item -> !enrolledCourseIds.contains(item.getCourseId().getId()))
                .map(item -> {
                    Enrollment enrollment = new Enrollment();
                    enrollment.setUserId(payment.getUserId());
                    enrollment.setCourseId(item.getCourseId());
                    enrollment.setEnrolledAt(now);
                    return enrollment;
                })
                .toList();
        if (!newEnrollments.isEmpty()) {
            enrollmentRepository.saveAll(newEnrollments);
        }
    }

    @Transactional
    public PaymentResponseDTO getPaymentStatus(Long paymentId, Long userId) {
        Payment payment = paymentRepository.findByIdAndUserId_Id(paymentId, userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Không tìm thấy đơn thanh toán"));

        payment = expirationService.expireIfOverdue(payment);

        List<Long> paidCourseIds = paymentItemRepository.findByPaymentId(payment)
                .stream()
                .map(item -> item.getCourseId().getId())
                .collect(Collectors.toList());

        return PaymentResponseDTO.builder()
                .paymentId(payment.getId())
                .totalPrice(payment.getTotalPrice())
                .paymentMethod(payment.getMethod())
                .status(payment.getStatus())
                .transactionId(payment.getTransactionId())
                .createdAt(payment.getCreatedAt())
                .paidCourseIds(paidCourseIds)
                .build();
    }

}
