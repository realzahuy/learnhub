package com.zh.learnhub_api;

import com.zh.learnhub_api.configs.TimeZoneEnvironmentListener;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@ConfigurationPropertiesScan
@EnableCaching
@EnableAsync
@EnableScheduling
public class LearnhubApiApplication {

	public static void main(String[] args) {
		SpringApplication application = new SpringApplication(LearnhubApiApplication.class);
		application.addListeners(new TimeZoneEnvironmentListener());
		application.run(args);
	}

}
