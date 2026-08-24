package com.zh.learnhub_api.services.payment;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.service.annotation.GetExchange;
import org.springframework.web.service.annotation.HttpExchange;

import java.math.BigDecimal;
import java.time.LocalDate;

@HttpExchange(accept = MediaType.APPLICATION_JSON_VALUE)
public interface ExchangeRateHttpClient {

    @GetExchange("/v2/rate/{base}/{quote}")
    RateResponse getRate(
            @PathVariable("base") String base,
            @PathVariable("quote") String quote);

    record RateResponse(
            LocalDate date,
            String base,
            String quote,
            BigDecimal rate) {
    }
}
