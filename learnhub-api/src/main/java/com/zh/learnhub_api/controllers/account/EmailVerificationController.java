package com.zh.learnhub_api.controllers.account;

import com.zh.learnhub_api.dtos.account.EmailVerificationStatusDTO;
import com.zh.learnhub_api.dtos.account.VerifyEmailRequestDTO;
import com.zh.learnhub_api.security.AuthenticatedUserPrincipal;
import com.zh.learnhub_api.services.account.EmailVerificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users/email-verification")
@RequiredArgsConstructor
public class EmailVerificationController {

    private final EmailVerificationService emailVerificationService;

    @PostMapping("/send")
    public ResponseEntity<EmailVerificationStatusDTO> sendCode(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {

        return ResponseEntity.ok(emailVerificationService.sendCode(principal.getUsername()));
    }

    @PostMapping("/confirm")
    public ResponseEntity<Void> confirm(
            @Valid @RequestBody VerifyEmailRequestDTO request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {

        emailVerificationService.verifyCode(principal.getUsername(), request.getCode());
        return ResponseEntity.noContent().build();
    }
}
