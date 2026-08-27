package com.zh.learnhub_api.configs;

import com.paypal.sdk.PaypalServerSdkClient;
import com.paypal.sdk.authentication.ClientCredentialsAuthModel;
import com.zh.learnhub_api.services.payment.ExchangeRateHttpClient;
import com.zh.learnhub_api.services.payment.momo.MoMoHttpClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.service.registry.ImportHttpServices;

@Configuration(proxyBeanMethods = false)
@ImportHttpServices(group = "exchange-rate", types = ExchangeRateHttpClient.class)
@ImportHttpServices(group = "momo", types = MoMoHttpClient.class)
public class PaymentClientConfig {

    @Bean
    PaypalServerSdkClient paypalServerSdkClient(AppProperties.Paypal properties) {
        ClientCredentialsAuthModel credentials =
                new ClientCredentialsAuthModel.Builder(properties.clientId(), properties.clientSecret()).build();

        return new PaypalServerSdkClient.Builder()
                .clientCredentialsAuth(credentials)
                .environment(properties.environment())
                .build();
    }
}
