package com.zh.learnhub_api.services.vector;

import com.zh.learnhub_api.pojo.Course;
import com.zh.learnhub_api.projections.course.CourseListProjection;
import com.zh.learnhub_api.projections.course.RecommendationCourseProjection;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

public final class CourseTopicMatcher {

    private static final Pattern DIACRITICS = Pattern.compile("\\p{M}+");
    private static final Pattern NON_WORD = Pattern.compile("[^a-z0-9]+", Pattern.CASE_INSENSITIVE);
    private static final Set<String> GENERIC_WORDS = Set.of(
            "khoa", "hoc", "bai", "giang", "co", "ban", "nang", "cao", "tu", "den",
            "cho", "nguoi", "moi", "tot", "hon", "kiem", "tra", "ly", "thuyet", "ve",
            "lap", "trinh", "course", "learn", "learning", "basic", "advanced", "zero", "hero");

    private CourseTopicMatcher() {
    }

    public static boolean matchesKeywords(
            CourseListProjection projection, List<String> keywords) {
        String searchable = normalize(String.join(" ",
                valueOrEmpty(projection.getTitle()),
                valueOrEmpty(projection.getCategoryName()),
                valueOrEmpty(projection.getShortDescription())));
        Set<String> searchableTokens = meaningfulTokens(searchable);

        for (String keyword : keywords) {
            String normalizedKeyword = normalize(keyword);
            if (normalizedKeyword.length() >= 4 && searchable.contains(normalizedKeyword)) {
                return true;
            }
            if (meaningfulTokens(normalizedKeyword).stream().anyMatch(searchableTokens::contains)) {
                return true;
            }
        }
        return false;
    }

    public static boolean hasMeaningfulTopicOverlap(
            Course currentCourse, CourseListProjection candidate) {
        return hasMeaningfulTopicOverlap(courseTokens(currentCourse), candidate);
    }

    public static Set<String> courseTokens(Course course) {
        return Set.copyOf(meaningfulTokens(String.join(" ",
                valueOrEmpty(course.getTitle()),
                course.getCategoryId() == null
                        ? "" : valueOrEmpty(course.getCategoryId().getName()),
                valueOrEmpty(course.getShortDescription()),
                valueOrEmpty(course.getDescription()))));
    }

    public static Set<String> courseTokens(RecommendationCourseProjection course) {
        return Set.copyOf(meaningfulTokens(String.join(" ",
                valueOrEmpty(course.getTitle()),
                valueOrEmpty(course.getCategoryName()),
                valueOrEmpty(course.getShortDescription()),
                valueOrEmpty(course.getDescription()))));
    }

    public static boolean hasMeaningfulTopicOverlap(
            Set<String> currentTokens, CourseListProjection candidate) {
        Set<String> candidateTokens = meaningfulTokens(String.join(" ",
                valueOrEmpty(candidate.getTitle()),
                valueOrEmpty(candidate.getCategoryName()),
                valueOrEmpty(candidate.getShortDescription())));
        return currentTokens.stream().anyMatch(candidateTokens::contains);
    }

    private static Set<String> meaningfulTokens(String value) {
        return Arrays.stream(normalize(value).split(" +"))
                .filter(token -> token.length() >= 4)
                .filter(token -> !GENERIC_WORDS.contains(token))
                .collect(Collectors.toSet());
    }

    private static String normalize(String value) {
        String decomposed = Normalizer.normalize(valueOrEmpty(value), Normalizer.Form.NFD);
        String withoutMarks = DIACRITICS.matcher(decomposed).replaceAll("")
                .replace('đ', 'd')
                .replace('Đ', 'D')
                .toLowerCase(Locale.ROOT);
        return NON_WORD.matcher(withoutMarks).replaceAll(" ").trim();
    }

    private static String valueOrEmpty(String value) {
        return value == null ? "" : value;
    }
}
