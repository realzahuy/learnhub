package com.zh.learnhub_api.controllers.admin;

import com.zh.learnhub_api.dtos.admin.AdminOverviewDTO;
import com.zh.learnhub_api.dtos.admin.AdminTimeSeriesDTO;
import com.zh.learnhub_api.services.admin.AdminStatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/admin/stats")
@RequiredArgsConstructor
public class AdminStatsController {

    private final AdminStatsService adminStatsService;

    @GetMapping("/overview")
    public ResponseEntity<AdminOverviewDTO> getOverview() {
        return ResponseEntity.ok(adminStatsService.getOverview());
    }

    @GetMapping("/timeseries")
    public ResponseEntity<AdminTimeSeriesDTO> getTimeSeries(
            @RequestParam(defaultValue = "day") String groupBy,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

        return ResponseEntity.ok(adminStatsService.getTimeSeries(groupBy, from, to));
    }
}
