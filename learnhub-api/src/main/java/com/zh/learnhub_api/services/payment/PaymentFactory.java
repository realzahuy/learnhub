package com.zh.learnhub_api.services.payment;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class PaymentFactory {

    private final Map<String, PaymentService> providers = new HashMap<>();

    @Autowired
    public PaymentFactory(List<PaymentService> providerList) {
        for (PaymentService provider : providerList) {
            providers.put(provider.getProviderName(), provider);
        }
    }

    public PaymentService getMethod(String methodName) {
        PaymentService provider = providers.get(methodName.toUpperCase());
        if (provider == null) {
            throw new IllegalArgumentException("Phương thức thanh toán không được hỗ trợ");
        }
        return provider;
    }
}
