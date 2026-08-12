package com.zh.learnhub_api.configs;

import com.zh.learnhub_api.services.payment.momo.MoMoHttpClient;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.service.registry.ImportHttpServices;

@Configuration(proxyBeanMethods = false)
@ImportHttpServices(group = "momo", types = MoMoHttpClient.class)
public class MoMoHttpClientConfig {
}
