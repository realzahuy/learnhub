package com.zh.learnhub_api.services.payment;

import com.zh.learnhub_api.dtos.payment.CreatePaymentRequestDTO;
import com.zh.learnhub_api.enums.PaymentStatus;
import com.zh.learnhub_api.exceptions.DuplicateResourceException;
import com.zh.learnhub_api.exceptions.ResourceNotFoundException;
import com.zh.learnhub_api.pojo.Payment;
import com.zh.learnhub_api.pojo.PaymentItem;
import com.zh.learnhub_api.pojo.User;
import com.zh.learnhub_api.projections.payment.CheckoutCourseProjection;
import com.zh.learnhub_api.repositories.course.CourseRepository;
import com.zh.learnhub_api.repositories.learning.EnrollmentRepository;
import com.zh.learnhub_api.repositories.payment.PaymentItemRepository;
import com.zh.learnhub_api.repositories.payment.PaymentRepository;
import com.zh.learnhub_api.repositories.account.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class PaymentCheckoutTransactionService {

    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final PaymentRepository paymentRepository;
    private final PaymentItemRepository paymentItemRepository;
    private final PaymentLifecycle paymentLifecycle;

    @Transactional
    public CheckoutDraft createPendingCheckout(CreatePaymentRequestDTO request,
                                                Long authenticatedUserId) {
        List<Long> courseIds = request.getCourseIds();
        validateCourseIds(courseIds);

        List<CheckoutCourseProjection> courses = courseRepository.findCheckoutCoursesByIds(courseIds);
        if (courses.size() != courseIds.size()) {
            throw new ResourceNotFoundException("Một số khóa học không tồn tại");
        }
        validatePurchasableCourses(courses);

        User lockedUser = userRepository.findByIdForUpdate(authenticatedUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));

        Set<Long> enrolledCourseIds = enrollmentRepository
                .findCourseIdsByUserAndCourseIds(lockedUser, courseIds);
        validatePaidCourses(courses, enrolledCourseIds);

        BigDecimal totalPrice = courses.stream()
                .map(CheckoutCourseProjection::getPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        LocalDateTime now = LocalDateTime.now();

        Payment pendingPayment = new Payment();
        pendingPayment.setUserId(lockedUser);
        pendingPayment.setTotalPrice(totalPrice);
        pendingPayment.setMethod(request.getPaymentMethod());
        pendingPayment.setStatus(PaymentStatus.PENDING.name());
        pendingPayment.setCreatedAt(now);
        pendingPayment.setUpdatedAt(now);
        Payment payment = paymentRepository.save(pendingPayment);

        List<PaymentItem> items = courses.stream().map(course -> {
            PaymentItem item = new PaymentItem();
            item.setPaymentId(payment);
            item.setCourseId(courseRepository.getReferenceById(course.getCourseId()));
            item.setPrice(course.getPrice());
            return item;
        }).toList();
        paymentItemRepository.saveAll(items);

        return new CheckoutDraft(
                payment,
                courses.stream().map(CheckoutCourseProjection::getCourseId).toList(),
                totalPrice,
                request.getPaymentMethod());
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markGatewayCreationFailed(Long paymentId) {
        Payment payment = paymentRepository.findByIdForUpdate(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn thanh toán"));
        if (paymentLifecycle.isPending(payment)) {
            paymentLifecycle.markFailed(payment, LocalDateTime.now());
        }
    }

    private void validateCourseIds(List<Long> courseIds) {
        if (courseIds == null || courseIds.isEmpty()) {
            throw new IllegalArgumentException("Danh sách khóa học trống");
        }
        if (courseIds.size() > CreatePaymentRequestDTO.MAX_COURSES_PER_CHECKOUT) {
            throw new IllegalArgumentException(
                    "Mỗi lần chỉ được thanh toán tối đa "
                            + CreatePaymentRequestDTO.MAX_COURSES_PER_CHECKOUT
                            + " khóa học");
        }
        if (courseIds.size() != courseIds.stream().distinct().count()) {
            throw new IllegalArgumentException("Danh sách khóa học có ID trùng lặp");
        }
    }

    private void validatePurchasableCourses(List<CheckoutCourseProjection> courses) {
        for (CheckoutCourseProjection course : courses) {
            if (!"PUBLISHED".equals(course.getStatus())) {
                throw new IllegalStateException(
                        "Khóa học không khả dụng để mua: " + course.getTitle());
            }
            if (course.getPrice() == null) {
                throw new IllegalStateException("Khóa học chưa có giá: " + course.getTitle());
            }
            if (course.getPrice().compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalStateException("Giá khóa học không hợp lệ: " + course.getTitle());
            }
            if (course.getPrice().compareTo(BigDecimal.ZERO) == 0) {
                throw new IllegalArgumentException(
                        "Khóa học miễn phí phải được đăng ký trực tiếp: " + course.getTitle());
            }
        }
    }

    private void validatePaidCourses(
            List<CheckoutCourseProjection> paidCourses, Set<Long> enrolledCourseIds) {
        for (CheckoutCourseProjection course : paidCourses) {
            if (enrolledCourseIds.contains(course.getCourseId())) {
                throw new DuplicateResourceException(
                        "Đã đăng ký khóa học: " + course.getTitle());
            }
        }

    }

    public record CheckoutDraft(
            Payment payment,
            List<Long> paidCourseIds,
            BigDecimal totalPrice,
            String paymentMethod) {
    }
}
