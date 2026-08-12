package com.zh.learnhub_api.services.payment;

import com.zh.learnhub_api.dtos.payment.PaymentResponseDTO.FreeEnrolledItemDTO;
import com.zh.learnhub_api.dtos.payment.CreatePaymentRequestDTO;
import com.zh.learnhub_api.enums.PaymentStatus;
import com.zh.learnhub_api.exceptions.DuplicateResourceException;
import com.zh.learnhub_api.exceptions.ResourceNotFoundException;
import com.zh.learnhub_api.pojo.Course;
import com.zh.learnhub_api.pojo.Enrollment;
import com.zh.learnhub_api.pojo.Payment;
import com.zh.learnhub_api.pojo.PaymentItem;
import com.zh.learnhub_api.pojo.User;
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
import java.util.ArrayList;
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
    private final PaymentExpirationService expirationService;

    @Transactional
    public CheckoutDraft createPendingCheckout(CreatePaymentRequestDTO request,
                                                Long authenticatedUserId) {
        List<Long> courseIds = request.getCourseIds();
        validateCourseIds(courseIds);

        List<Course> courses = courseRepository.findAllById(courseIds);
        if (courses.size() != courseIds.size()) {
            throw new ResourceNotFoundException("Một số khóa học không tồn tại");
        }
        validatePurchasableCourses(courses);

        List<Course> freeCourses = courses.stream()
                .filter(course -> course.getPrice().compareTo(BigDecimal.ZERO) == 0)
                .toList();
        List<Course> paidCourses = courses.stream()
                .filter(course -> course.getPrice().compareTo(BigDecimal.ZERO) > 0)
                .toList();

        User lockedUser = userRepository.findByIdForUpdate(authenticatedUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));

        Set<Long> enrolledCourseIds = enrollmentRepository
                .findCourseIdsByUserAndCourseIds(lockedUser, courseIds);
        List<FreeEnrolledItemDTO> freeEnrolled = enrollFreeCourses(
                lockedUser, freeCourses, enrolledCourseIds);

        if (paidCourses.isEmpty()) {
            return new CheckoutDraft(null, freeEnrolled, List.of(), BigDecimal.ZERO,
                    request.getPaymentMethod());
        }

        validatePaidCourses(lockedUser, paidCourses, enrolledCourseIds);

        BigDecimal totalPrice = paidCourses.stream()
                .map(Course::getPrice)
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

        List<PaymentItem> items = paidCourses.stream().map(course -> {
            PaymentItem item = new PaymentItem();
            item.setPaymentId(payment);
            item.setCourseId(course);
            item.setPrice(course.getPrice());
            return item;
        }).toList();
        paymentItemRepository.saveAll(items);

        return new CheckoutDraft(
                payment,
                freeEnrolled,
                paidCourses.stream().map(Course::getId).toList(),
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

    private void validatePurchasableCourses(List<Course> courses) {
        for (Course course : courses) {
            if (!"PUBLISHED".equals(course.getStatus())) {
                throw new IllegalStateException(
                        "Khóa học không khả dụng để mua: " + course.getTitle());
            }
            if (course.getPrice() == null) {
                throw new IllegalStateException("Khóa học chưa có giá: " + course.getTitle());
            }
        }
    }

    private List<FreeEnrolledItemDTO> enrollFreeCourses(
            User user, List<Course> freeCourses, Set<Long> enrolledCourseIds) {
        List<FreeEnrolledItemDTO> result = new ArrayList<>();
        List<Enrollment> newEnrollments = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        for (Course course : freeCourses) {
            if (enrolledCourseIds.contains(course.getId())) {
                continue;
            }

            Enrollment enrollment = new Enrollment();
            enrollment.setUserId(user);
            enrollment.setCourseId(course);
            enrollment.setEnrolledAt(now);
            newEnrollments.add(enrollment);

            result.add(FreeEnrolledItemDTO.builder()
                    .courseId(course.getId())
                    .title(course.getTitle())
                    .slug(course.getSlug())
                    .build());
        }

        if (!newEnrollments.isEmpty()) {
            enrollmentRepository.saveAll(newEnrollments);
        }
        return result;
    }

    private void validatePaidCourses(
            User user, List<Course> paidCourses, Set<Long> enrolledCourseIds) {
        for (Course course : paidCourses) {
            if (enrolledCourseIds.contains(course.getId())) {
                throw new DuplicateResourceException(
                        "Đã đăng ký khóa học: " + course.getTitle());
            }
        }

        List<Long> paidCourseIds = paidCourses.stream().map(Course::getId).toList();

        expirationService.expireOverdueForCourses(user, paidCourseIds);
        Set<Long> pendingCourseIds = paymentRepository.findPendingCourseIds(user, paidCourseIds);
        if (pendingCourseIds.isEmpty()) {
            return;
        }

        Course pendingCourse = paidCourses.stream()
                .filter(course -> pendingCourseIds.contains(course.getId()))
                .findFirst()
                .orElseThrow();
        throw new DuplicateResourceException(
                "Đơn thanh toán trước đó cho \"" + pendingCourse.getTitle()
                        + "\" đang chờ xác nhận. "
                        + "Nếu bạn đã trả tiền, khóa học sẽ vào tài khoản trong giây lát. "
                        + "Nếu chưa, hãy đợi tối đa "
                        + expirationService.getExpireMinutes()
                        + " phút rồi thử lại.");
    }

    public record CheckoutDraft(
            Payment payment,
            List<FreeEnrolledItemDTO> freeEnrolled,
            List<Long> paidCourseIds,
            BigDecimal totalPrice,
            String paymentMethod) {

        public boolean requiresGateway() {
            return payment != null;
        }
    }
}
