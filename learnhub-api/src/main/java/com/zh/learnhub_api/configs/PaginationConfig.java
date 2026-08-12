package com.zh.learnhub_api.configs;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.web.config.PageableHandlerMethodArgumentResolverCustomizer;

@Configuration(proxyBeanMethods = false)
public class PaginationConfig {

    @Bean
    public PageableHandlerMethodArgumentResolverCustomizer pageableCustomizer(
            AppProperties.Pagination properties) {
        return resolver -> {
            resolver.setFallbackPageable(PageRequest.of(0, properties.defaultPageSize()));
            resolver.setMaxPageSize(properties.maxPageSize());
            resolver.setOneIndexedParameters(false);
        };
    }
}
