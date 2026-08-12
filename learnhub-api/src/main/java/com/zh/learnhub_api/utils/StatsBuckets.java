package com.zh.learnhub_api.utils;

import com.zh.learnhub_api.projections.stats.TimeBucketAmountProjection;
import com.zh.learnhub_api.projections.stats.TimeBucketCountProjection;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Getter
public final class StatsBuckets {

    private static final int MAX_DAY_BUCKETS = 90;
    private static final int MAX_MONTH_BUCKETS = 120;
    private static final int MAX_QUARTER_BUCKETS = 40;

    private static final DateTimeFormatter DAY_LABEL = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter MONTH_LABEL = DateTimeFormatter.ofPattern("yyyy-MM");

    private final String granularity;
    private final List<String> labels;
    private final LocalDate startDate;
    private final LocalDate endDate;

    private final LocalDateTime from;

    private final LocalDateTime to;

    private StatsBuckets(String granularity, List<String> labels,
                         LocalDate startDate, LocalDate endDate) {
        this.granularity = granularity;
        this.labels = labels;
        this.startDate = startDate;
        this.endDate = endDate;
        this.from = startDate.atStartOfDay();
        this.to = endDate.plusDays(1).atStartOfDay();
    }

    public static StatsBuckets plan(String groupBy, LocalDate fromDate, LocalDate toDate) {
        String granularity = normalizeGranularity(groupBy);
        boolean hasFrom = fromDate != null;
        boolean hasTo = toDate != null;

        if (hasFrom != hasTo) {
            throw new IllegalArgumentException("Phải chọn đủ ngày bắt đầu và ngày kết thúc");
        }
        if (hasFrom && fromDate.isAfter(toDate)) {
            throw new IllegalArgumentException("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc");
        }

        LocalDate today = LocalDate.now();
        LocalDate start;
        LocalDate end;

        if (hasFrom) {
            if (toDate.isAfter(today)) {
                throw new IllegalArgumentException("Ngày kết thúc không được ở tương lai");
            }
            start = fromDate;
            end = toDate;
        } else {
            end = today;
            start = "day".equals(granularity)
                    ? today.withDayOfMonth(1)
                    : today.withDayOfYear(1);
        }

        validateBucketCount(granularity, countBuckets(granularity, start, end));
        List<String> labels = switch (granularity) {
            case "month" -> buildMonthLabels(start, end);
            case "quarter" -> buildQuarterLabels(start, end);
            default -> buildDayLabels(start, end);
        };

        return new StatsBuckets(granularity, labels, start, end);
    }

    private static String normalizeGranularity(String groupBy) {
        String value = groupBy == null ? "day" : groupBy.trim().toLowerCase(Locale.ROOT);
        return switch (value) {
            case "day", "month", "quarter" -> value;
            default -> throw new IllegalArgumentException(
                    "groupBy chỉ nhận một trong các giá trị: day, month, quarter");
        };
    }

    private static long countBuckets(String granularity, LocalDate start, LocalDate end) {
        return switch (granularity) {
            case "month" -> ChronoUnit.MONTHS.between(
                    start.withDayOfMonth(1), end.withDayOfMonth(1)) + 1;
            case "quarter" -> ChronoUnit.MONTHS.between(
                    firstDayOfQuarter(start), firstDayOfQuarter(end)) / 3 + 1;
            default -> ChronoUnit.DAYS.between(start, end) + 1;
        };
    }

    private static void validateBucketCount(String granularity, long count) {
        int maximum = switch (granularity) {
            case "month" -> MAX_MONTH_BUCKETS;
            case "quarter" -> MAX_QUARTER_BUCKETS;
            default -> MAX_DAY_BUCKETS;
        };
        if (count > maximum) {
            String unit = switch (granularity) {
                case "month" -> "120 tháng";
                case "quarter" -> "40 quý";
                default -> "90 ngày";
            };
            throw new IllegalArgumentException("Khoảng thống kê theo " + granularity
                    + " không được vượt quá " + unit);
        }
    }

    private static List<String> buildDayLabels(LocalDate start, LocalDate end) {
        List<String> labels = new ArrayList<>();
        for (LocalDate day = start; !day.isAfter(end); day = day.plusDays(1)) {
            labels.add(day.format(DAY_LABEL));
        }
        return labels;
    }

    private static List<String> buildMonthLabels(LocalDate start, LocalDate end) {
        List<String> labels = new ArrayList<>();
        LocalDate current = start.withDayOfMonth(1);
        LocalDate last = end.withDayOfMonth(1);
        while (!current.isAfter(last)) {
            labels.add(current.format(MONTH_LABEL));
            current = current.plusMonths(1);
        }
        return labels;
    }

    private static List<String> buildQuarterLabels(LocalDate start, LocalDate end) {
        List<String> labels = new ArrayList<>();
        LocalDate current = firstDayOfQuarter(start);
        LocalDate last = firstDayOfQuarter(end);
        while (!current.isAfter(last)) {
            labels.add(current.getYear() + "-Q" + quarterOf(current));
            current = current.plusMonths(3);
        }
        return labels;
    }

    private static LocalDate firstDayOfQuarter(LocalDate date) {
        int firstMonth = ((date.getMonthValue() - 1) / 3) * 3 + 1;
        return LocalDate.of(date.getYear(), firstMonth, 1);
    }

    private static int quarterOf(LocalDate date) {
        return (date.getMonthValue() - 1) / 3 + 1;
    }

    public static Map<String, Long> toLongMap(List<TimeBucketCountProjection> rows) {
        Map<String, Long> map = new HashMap<>();
        for (TimeBucketCountProjection row : rows) {
            map.put(row.getBucket(), row.getTotal());
        }
        return map;
    }

    public static Map<String, BigDecimal> toDecimalMap(List<TimeBucketAmountProjection> rows) {
        Map<String, BigDecimal> map = new HashMap<>();
        for (TimeBucketAmountProjection row : rows) {
            map.put(row.getBucket(), row.getAmount());
        }
        return map;
    }
}
