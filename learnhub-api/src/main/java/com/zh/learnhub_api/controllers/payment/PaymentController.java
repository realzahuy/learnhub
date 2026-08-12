package com.zh.learnhub_api.controllers.payment;

import com.zh.learnhub_api.dtos.payment.CreatePaymentRequestDTO;
import com.zh.learnhub_api.dtos.payment.PaymentResponseDTO;
import com.zh.learnhub_api.security.AuthenticatedUserPrincipal;
import com.zh.learnhub_api.services.payment.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping
    public ResponseEntity<PaymentResponseDTO> createPayment(
        @Valid @RequestBody CreatePaymentRequestDTO request,
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal
    ) {
        PaymentResponseDTO response = paymentService.createPayment(
                request, principal.getUserId());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/momo/notify")
    public ResponseEntity<Void> momoNotify(@RequestBody Map<String, Object> data) {
        Map<String, String> params = new HashMap<>();
        data.forEach((key, value) ->
                params.put(key, value == null ? "" : String.valueOf(value)));

        paymentService.handlePaymentCallback("MOMO", params);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}")
    public ResponseEntity<PaymentResponseDTO> getPaymentStatus(
        @PathVariable Long id,
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal
    ) {
        PaymentResponseDTO response = paymentService.getPaymentStatus(
                id, principal.getUserId());
        return ResponseEntity.ok(response);
    }

}
