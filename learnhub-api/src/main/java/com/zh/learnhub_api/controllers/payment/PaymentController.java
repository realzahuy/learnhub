package com.zh.learnhub_api.controllers.payment;

import com.zh.learnhub_api.dtos.payment.CreatePaymentRequestDTO;
import com.zh.learnhub_api.dtos.payment.PayPalCaptureRequestDTO;
import com.zh.learnhub_api.dtos.payment.PaymentResponseDTO;
import com.zh.learnhub_api.enums.PaymentMethod;
import com.zh.learnhub_api.security.AuthenticatedUserPrincipal;
import com.zh.learnhub_api.services.payment.PaymentFactory;
import com.zh.learnhub_api.services.payment.momo.MoMoPaymentService;
import com.zh.learnhub_api.services.payment.paypal.PayPalPaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentFactory paymentFactory;

    @PostMapping
    public ResponseEntity<PaymentResponseDTO> createPayment(
            @Valid @RequestBody CreatePaymentRequestDTO request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ResponseEntity.ok(paymentFactory
                .getMethod(request.getPaymentMethod())
                .createPayment(request, principal.getUserId()));
    }

    @PostMapping("/momo/notify")
    public ResponseEntity<Void> momoNotify(@RequestBody Map<String, Object> data) {
        ((MoMoPaymentService) paymentFactory.getMethod(PaymentMethod.MOMO))
                .handleNotify(data);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/paypal/capture")
    public ResponseEntity<PaymentResponseDTO> capturePayPal(
            @PathVariable Long id,
            @Valid @RequestBody PayPalCaptureRequestDTO request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ResponseEntity.ok(((PayPalPaymentService) paymentFactory
                .getMethod(PaymentMethod.PAYPAL))
                .capturePayment(id, request.orderId(), principal.getUserId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PaymentResponseDTO> getPaymentStatus(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ResponseEntity.ok(paymentFactory.getMethod(PaymentMethod.MOMO)
                .getPaymentStatus(id, principal.getUserId()));
    }
}
