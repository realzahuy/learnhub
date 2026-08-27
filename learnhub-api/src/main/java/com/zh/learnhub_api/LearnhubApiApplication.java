package com.zh.learnhub_api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.event.ApplicationEnvironmentPreparedEvent;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.ApplicationListener;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.security.Security;
import java.time.ZoneId;
import java.util.TimeZone;

@SpringBootApplication
@ConfigurationPropertiesScan
@EnableCaching
@EnableAsync
@EnableScheduling
public class LearnhubApiApplication {

    public static void main(String[] args) {
        Security.setProperty("networkaddress.cache.ttl", "5");
        Security.setProperty("networkaddress.cache.negative.ttl", "1");
        SpringApplication application = new SpringApplication(LearnhubApiApplication.class);
        application.addListeners((ApplicationListener<ApplicationEnvironmentPreparedEvent>) event -> {
            String zoneId = event.getEnvironment().getRequiredProperty("app.time-zone");
            TimeZone.setDefault(TimeZone.getTimeZone(ZoneId.of(zoneId)));
        });
        application.run(args);
    }
}
