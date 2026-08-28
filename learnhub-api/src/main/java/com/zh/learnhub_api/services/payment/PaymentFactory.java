package com.zh.learnhub_api.services.payment;

import com.zh.learnhub_api.enums.PaymentMethod;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Component
public class PaymentFactory {

    private final Map<PaymentMethod, PaymentService> providers = new EnumMap<>(PaymentMethod.class);

    public PaymentFactory(List<PaymentService> providerList) {
        for (PaymentService provider : providerList) {
            providers.put(provider.getProvider(), provider);
        }
    }

    public PaymentService getMethod(PaymentMethod method) {
        PaymentService provider = providers.get(method);
        if (provider == null) {
            throw new IllegalArgumentException("Phương thức thanh toán không được hỗ trợ");
        }
        return provider;
    }
}
