package com.zh.learnhub_api.services.payment.paypal;

import com.zh.learnhub_api.configs.AppProperties;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.Map;
import java.util.Set;

@Service
public class PayPalWebhookService {
    private static final Set<String> EVENTS = Set.of(
            "CHECKOUT.ORDER.APPROVED", "PAYMENT.CAPTURE.COMPLETED",
            "PAYMENT.CAPTURE.DENIED", "PAYMENT.CAPTURE.DECLINED");

    private final AppProperties.Paypal properties;
    private final ObjectMapper objectMapper;
    private final PayPalPaymentService paymentService;
    private final RestClient client;

    public PayPalWebhookService(AppProperties.Paypal properties, ObjectMapper objectMapper,
                                PayPalPaymentService paymentService,
                                @Qualifier("paypalWebhookClient") RestClient client) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.paymentService = paymentService;
        this.client = client;
    }

    public void handleNotify(String body, HttpHeaders headers) {
        JsonNode event = objectMapper.readTree(body);
        Map<String, String> verification = Map.of(
                "auth_algo", requiredHeader(headers, "PAYPAL-AUTH-ALGO"),
                "cert_url", requiredHeader(headers, "PAYPAL-CERT-URL"),
                "transmission_id", requiredHeader(headers, "PAYPAL-TRANSMISSION-ID"),
                "transmission_sig", requiredHeader(headers, "PAYPAL-TRANSMISSION-SIG"),
                "transmission_time", requiredHeader(headers, "PAYPAL-TRANSMISSION-TIME"),
                "webhook_id", properties.webhookId());
        JsonNode token = client.post().uri("/v1/oauth2/token")
                .headers(h -> h.setBasicAuth(properties.clientId(), properties.clientSecret()))
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body("grant_type=client_credentials")
                .retrieve().body(JsonNode.class);

        String metadata = objectMapper.writeValueAsString(verification);
        // Preserve the original webhook JSON when sending it back for signature verification.
        String verificationBody = metadata.substring(0, metadata.length() - 1)
                + ",\"webhook_event\":" + body + "}";
        JsonNode result = client.post().uri("/v1/notifications/verify-webhook-signature")
                .headers(h -> h.setBearerAuth(token.path("access_token").asString()))
                .contentType(MediaType.APPLICATION_JSON)
                .body(verificationBody)
                .retrieve().body(JsonNode.class);
        if (!"SUCCESS".equals(result.path("verification_status").asString())) {
            throw new SecurityException("Chữ ký PayPal không hợp lệ");
        }

        String eventType = event.path("event_type").asString();
        if (!EVENTS.contains(eventType)) return;
        JsonNode resource = event.path("resource");
        String orderId = "CHECKOUT.ORDER.APPROVED".equals(eventType)
                ? resource.path("id").asString()
                : resource.path("supplementary_data").path("related_ids").path("order_id").asString();
        if (orderId == null || orderId.isBlank()) {
            throw new IllegalArgumentException("Thiếu mã đơn PayPal");
        }
        paymentService.handleWebhook(eventType, orderId);
    }

    private String requiredHeader(HttpHeaders headers, String name) {
        String value = headers.getFirst(name);
        if (value == null || value.isBlank()) {
            throw new SecurityException("Thiếu chữ ký PayPal");
        }
        return value;
    }
}
