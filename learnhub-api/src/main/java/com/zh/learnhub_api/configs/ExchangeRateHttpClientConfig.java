package com.zh.learnhub_api.configs;

import com.zh.learnhub_api.services.payment.ExchangeRateHttpClient;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.service.registry.ImportHttpServices;

@Configuration(proxyBeanMethods = false)
@ImportHttpServices(group = "exchange-rate", types = ExchangeRateHttpClient.class)
public class ExchangeRateHttpClientConfig {
}
