package com.zh.learnhub_api.dtos.instructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InstructorTimeSeriesDTO {
    private String granularity;
    private LocalDate from;
    private LocalDate to;
    private List<InstructorStatsPointDTO> points;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InstructorStatsPointDTO {
        private String label;
        private long enrollments;
        private long students;
        private BigDecimal revenue;
    }
}
