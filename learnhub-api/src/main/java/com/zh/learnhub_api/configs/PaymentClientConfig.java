package com.zh.learnhub_api.configs;

import com.paypal.sdk.PaypalServerSdkClient;
import com.paypal.sdk.authentication.ClientCredentialsAuthModel;
import com.zh.learnhub_api.services.payment.ExchangeRateHttpClient;
import com.zh.learnhub_api.services.payment.momo.MoMoHttpClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.service.registry.ImportHttpServices;
import org.springframework.web.client.RestClient;
import org.springframework.http.client.JdkClientHttpRequestFactory;

import java.net.http.HttpClient;
import java.time.Duration;

@Configuration(proxyBeanMethods = false)
@ImportHttpServices(group = "exchange-rate", types = ExchangeRateHttpClient.class)
@ImportHttpServices(group = "momo", types = MoMoHttpClient.class)
public class PaymentClientConfig {

    @Bean
    RestClient paypalWebhookClient(RestClient.Builder builder, AppProperties.Paypal properties) {
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(
                HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build());
        factory.setReadTimeout(Duration.ofSeconds(15));
        return builder.requestFactory(factory)
                .baseUrl(properties.environment() == com.paypal.sdk.Environment.SANDBOX
                        ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com")
                .build();
    }

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
