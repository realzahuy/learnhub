package com.zh.learnhub_api.services.payment;

import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class PaymentGatewayRegistry {
    
    private final Map<String, PaymentGateway> providers = new HashMap<>();
    
    public PaymentGatewayRegistry(List<PaymentGateway> providerList) {
        for (PaymentGateway provider : providerList) {
            providers.put(provider.getProviderName(), provider);
        }
    }
    
    public PaymentGateway getProvider(String providerName) {
        PaymentGateway provider = providers.get(providerName.toUpperCase());
        if (provider == null) {
            throw new IllegalArgumentException("Phương thức thanh toán không được hỗ trợ: " + providerName);
        }
        return provider;
    }
}
