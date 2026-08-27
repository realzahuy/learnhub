package com.zh.learnhub_api.dtos.admin;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminTimeSeriesDTO {
    private String granularity;
    private LocalDate from;
    private LocalDate to;
    private List<AdminStatsPointDTO> points;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AdminStatsPointDTO {
        private String label;
        private long users;
        private long instructors;
        private BigDecimal revenue;
    }
}
