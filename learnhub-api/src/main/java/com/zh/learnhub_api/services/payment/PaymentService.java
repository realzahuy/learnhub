package com.zh.learnhub_api.services.payment;

import com.zh.learnhub_api.dtos.payment.CreatePaymentRequestDTO;
import com.zh.learnhub_api.dtos.payment.PaymentResponseDTO;
import com.zh.learnhub_api.enums.PaymentStatus;
import com.zh.learnhub_api.exceptions.PaymentGatewayException;
import com.zh.learnhub_api.exceptions.ResourceNotFoundException;
import com.zh.learnhub_api.pojo.Enrollment;
import com.zh.learnhub_api.pojo.Payment;
import com.zh.learnhub_api.pojo.PaymentItem;
import com.zh.learnhub_api.pojo.User;
import com.zh.learnhub_api.projections.payment.CheckoutCourseProjection;
import com.zh.learnhub_api.repositories.account.UserRepository;
import com.zh.learnhub_api.repositories.course.CourseRepository;
import com.zh.learnhub_api.repositories.learning.EnrollmentRepository;
import com.zh.learnhub_api.repositories.payment.PaymentItemRepository;
import com.zh.learnhub_api.repositories.payment.PaymentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClientException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

public abstract class PaymentService {

    @Autowired
    protected UserRepository userRepository;

    @Autowired
    protected CourseRepository courseRepository;

    @Autowired
    protected EnrollmentRepository enrollmentRepository;

    @Autowired
    protected PaymentRepository paymentRepository;

    @Autowired
    protected PaymentItemRepository paymentItemRepository;

    @Autowired
    protected PaymentExpirationService expirationService;

    public abstract String getProviderName();

    protected abstract String createPaymentUrl(Payment payment);

    @Transactional(noRollbackFor = {PaymentGatewayException.class, RestClientException.class})
    public PaymentResponseDTO createPayment(CreatePaymentRequestDTO request, Long userId) {
        List<Long> requestCourseIds = request.getCourseIds().stream()
                .distinct()
                .toList();
        List<CheckoutCourseProjection> courses = courseRepository.findCheckoutCourses(requestCourseIds, userId);
        if (courses.isEmpty()) {
            throw new IllegalArgumentException("Không có khóa học nào cần thanh toán");
        }

        List<Long> courseIds = courses.stream()
                .map(CheckoutCourseProjection::getCourseId)
                .toList();
        BigDecimal totalPrice = courses.stream()
                .map(CheckoutCourseProjection::getPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        User user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));
        LocalDateTime now = LocalDateTime.now();

        Payment payment = new Payment();
        payment.setUserId(user);
        payment.setTotalPrice(totalPrice);
        payment.setMethod(getProviderName());
        payment.setStatus(PaymentStatus.PENDING.name());
        payment.setCreatedAt(now);
        payment.setUpdatedAt(now);
        payment = paymentRepository.save(payment);

        Payment savedPayment = payment;
        List<PaymentItem> items = courses.stream()
                .map(course -> {
                    PaymentItem item = new PaymentItem();
                    item.setPaymentId(savedPayment);
                    item.setCourseId(courseRepository.getReferenceById(course.getCourseId()));
                    item.setPrice(course.getPrice());
                    return item;
                })
                .toList();
        paymentItemRepository.saveAll(items);

        String payUrl;
        try {
            payUrl = createPaymentUrl(payment);
        } catch (PaymentGatewayException | RestClientException exception) {
            failPayment(payment);
            throw exception;
        }
        return PaymentResponseDTO.builder()
                .paymentId(payment.getId())
                .payUrl(payUrl)
                .totalPrice(totalPrice)
                .paymentMethod(getProviderName())
                .status(PaymentStatus.PENDING.name())
                .paidCourseIds(courseIds)
                .message("Tiếp tục thanh toán " + courseIds.size() + " khóa học.")
                .build();
    }

    @Transactional
    public PaymentResponseDTO getPaymentStatus(Long paymentId, Long userId) {
        Payment payment = paymentRepository.findByIdAndUserId_Id(paymentId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn thanh toán"));
        payment = expirationService.expireIfOverdue(payment, userId);
        return toPaymentResponse(payment);
    }

    protected void completePayment(Payment payment, String transactionId) {
        LocalDateTime now = LocalDateTime.now();
        payment.setStatus(PaymentStatus.SUCCESS.name());
        payment.setTransactionId(transactionId);
        payment.setUpdatedAt(now);
        List<PaymentItem> items = paymentItemRepository.findByPaymentId(payment);
        if (items.isEmpty()) {
            return;
        }
        List<Long> courseIds = items.stream()
                .map(item -> item.getCourseId().getId())
                .toList();
        Set<Long> enrolledCourseIds = enrollmentRepository.findCourseIdsByUserAndCourseIds(payment.getUserId(), courseIds);
        List<Enrollment> enrollments = items.stream()
                .filter(item -> !enrolledCourseIds.contains(item.getCourseId().getId()))
                .map(item -> {
                    Enrollment enrollment = new Enrollment();
                    enrollment.setUserId(payment.getUserId());
                    enrollment.setCourseId(item.getCourseId());
                    enrollment.setEnrolledAt(now);
                    return enrollment;
                })
                .toList();
        enrollmentRepository.saveAll(enrollments);
    }

    protected void failPayment(Payment payment) {
        payment.setStatus(PaymentStatus.FAILED.name());
        payment.setUpdatedAt(LocalDateTime.now());
    }

    protected PaymentResponseDTO toPaymentResponse(Payment payment) {
        List<Long> courseIds = paymentItemRepository.findByPaymentId(payment).stream()
                .map(item -> item.getCourseId().getId())
                .toList();
        return PaymentResponseDTO.builder()
                .paymentId(payment.getId())
                .totalPrice(payment.getTotalPrice())
                .paymentMethod(payment.getMethod())
                .status(payment.getStatus())
                .transactionId(payment.getTransactionId())
                .createdAt(payment.getCreatedAt())
                .paidCourseIds(courseIds)
                .build();
    }
}
