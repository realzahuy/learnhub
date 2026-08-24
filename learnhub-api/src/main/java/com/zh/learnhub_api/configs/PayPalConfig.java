package com.zh.learnhub_api.configs;

import com.paypal.sdk.PaypalServerSdkClient;
import com.paypal.sdk.authentication.ClientCredentialsAuthModel;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
public class PayPalConfig {

    @Bean
    PaypalServerSdkClient paypalServerSdkClient(AppProperties.Paypal properties) {
        ClientCredentialsAuthModel credentials = new ClientCredentialsAuthModel.Builder(
                properties.clientId(), properties.clientSecret())
                .build();

        return new PaypalServerSdkClient.Builder()
                .clientCredentialsAuth(credentials)
                .environment(properties.environment())
                .build();
    }
}
