package com.zh.learnhub_api.controllers.instructor;

import com.zh.learnhub_api.dtos.instructor.InstructorOverviewDTO;
import com.zh.learnhub_api.dtos.instructor.InstructorTimeSeriesDTO;
import com.zh.learnhub_api.services.instructor.InstructorStatsService;
import com.zh.learnhub_api.security.AuthenticatedUserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/instructor/stats")
@RequiredArgsConstructor
public class InstructorStatsController {

    private final InstructorStatsService instructorStatsService;

    @GetMapping("/overview")
    public ResponseEntity<InstructorOverviewDTO> getOverview(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {

        return ResponseEntity.ok(instructorStatsService.getOverview(principal.getUserId()));
    }

    @GetMapping("/timeseries")
    public ResponseEntity<InstructorTimeSeriesDTO> getTimeSeries(
            @RequestParam(defaultValue = "day") String groupBy,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {

        return ResponseEntity.ok(
                instructorStatsService.getTimeSeries(principal.getUserId(), groupBy, from, to));
    }
}
