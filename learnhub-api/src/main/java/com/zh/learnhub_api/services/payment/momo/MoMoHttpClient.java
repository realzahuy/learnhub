package com.zh.learnhub_api.services.payment.momo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.service.annotation.HttpExchange;
import org.springframework.web.service.annotation.PostExchange;

@HttpExchange(
        contentType = MediaType.APPLICATION_JSON_VALUE,
        accept = MediaType.APPLICATION_JSON_VALUE)
public interface MoMoHttpClient {

    @PostExchange
    CreatePaymentResponse createPayment(@RequestBody CreatePaymentRequest request);

    @Getter
    @Builder
    @AllArgsConstructor
    class CreatePaymentRequest {
        private final String partnerCode;
        private final String accessKey;
        private final String requestId;
        private final String amount;
        private final String orderId;
        private final String orderInfo;
        private final String redirectUrl;
        private final String ipnUrl;
        private final String extraData;
        private final String requestType;
        private final String signature;
        private final String lang;
        private final Integer orderExpireTime;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    class CreatePaymentResponse {
        private String payUrl;
        private Integer resultCode;
        private String message;
    }
}
