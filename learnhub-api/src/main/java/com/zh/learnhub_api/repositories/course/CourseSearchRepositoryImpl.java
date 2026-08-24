package com.zh.learnhub_api.repositories.course;

import com.zh.learnhub_api.projections.course.CourseDetailProjection;
import com.zh.learnhub_api.projections.course.CourseListProjection;
import com.zh.learnhub_api.projections.course.RatedCourseListProjection;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Tuple;
import jakarta.persistence.TypedQuery;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class CourseSearchRepositoryImpl implements CourseSearchRepository {

    private static final String LIST_FIELDS = "c.id AS courseId, c.title AS title, "
            + "c.slug AS slug, c.shortDescription AS shortDescription, "
            + "c.thumbnail AS thumbnail, c.price AS price, c.status AS status, "
            + "c.createdAt AS createdAt, c.updatedAt AS updatedAt, "
            + "i.id AS instructorId, i.fullName AS instructorName, "
            + "cat.id AS categoryId, cat.name AS categoryName";
    private static final String LIST_SELECT = "SELECT " + LIST_FIELDS + " ";
    private static final String DETAIL_SELECT = "SELECT " + LIST_FIELDS
            + ", c.description AS description ";
    private static final String RATED_LIST_SELECT = "SELECT " + LIST_FIELDS
            + ", COALESCE(AVG(cr.rating), 0.0) AS averageRating, "
            + "COUNT(cr.id) AS reviewCount ";
    private static final String FROM = "FROM Course c "
            + "LEFT JOIN c.instructorId i LEFT JOIN c.categoryId cat ";

    private static final Map<String, String> SORT_FIELDS = Map.of(
            "id", "c.id",
            "courseId", "c.id",
            "title", "c.title",
            "price", "c.price",
            "status", "c.status",
            "createdAt", "c.createdAt",
            "updatedAt", "c.updatedAt");

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public Page<CourseDetailProjection> findFilteredCourseDetails(
            Long instructorId,
            String status,
            String categoryName,
            String keyword,
            Pageable pageable) {
        Filters filters = Filters.management(instructorId, status, categoryName, keyword);
        QueryParts parts = buildFilters(filters);
        String dataJpql = DETAIL_SELECT + FROM + parts.whereClause() + orderBy(pageable.getSort());

        List<CourseDetailProjection> content = executeRows(dataJpql, parts.parameters(), pageable)
                .stream()
                .map(CourseSearchRepositoryImpl::toDetailRow)
                .map(CourseDetailProjection.class::cast)
                .toList();
        return new PageImpl<>(content, pageable, count(filters));
    }

    @Override
    public Page<CourseListProjection> findPublishedCourses(
            String categoryName,
            String keyword,
            Pageable pageable) {
        Filters filters = Filters.published(categoryName, keyword);
        QueryParts parts = buildFilters(filters);
        String dataJpql = LIST_SELECT + FROM + parts.whereClause() + orderBy(pageable.getSort());

        List<CourseListProjection> content = executeRows(dataJpql, parts.parameters(), pageable)
                .stream()
                .map(CourseSearchRepositoryImpl::toListRow)
                .map(CourseListProjection.class::cast)
                .toList();
        return new PageImpl<>(content, pageable, count(filters));
    }

    @Override
    public Page<RatedCourseListProjection> findPublishedCoursesOrderByRating(
            String categoryName,
            String keyword,
            double ratingPrior,
            double ratingPriorCount,
            Pageable pageable) {
        Filters filters = Filters.published(categoryName, keyword);
        QueryParts parts = buildFilters(filters);
        Map<String, Object> parameters = new HashMap<>(parts.parameters());
        parameters.put("ratingPrior", ratingPrior);
        parameters.put("ratingPriorCount", ratingPriorCount);

        String bayesianScore = "CASE WHEN COUNT(cr.id) = 0 THEN 0.0 ELSE "
                + "(SUM(cr.rating) + (:ratingPriorCount * :ratingPrior)) "
                + "/ (COUNT(cr.id) + :ratingPriorCount) END";
        String dataJpql = RATED_LIST_SELECT + FROM
                + "LEFT JOIN CourseReview cr ON cr.courseId = c "
                + parts.whereClause()
                + " GROUP BY c.id, c.title, c.slug, c.shortDescription, c.thumbnail, c.price, "
                + "c.status, c.createdAt, c.updatedAt, i.id, i.fullName, cat.id, cat.name "
                + "ORDER BY " + bayesianScore + " DESC, COUNT(cr.id) DESC, "
                + "c.createdAt DESC, c.id DESC";

        List<RatedCourseListProjection> content = executeRows(dataJpql, parameters, pageable)
                .stream()
                .map(RatedListRow::new)
                .map(RatedCourseListProjection.class::cast)
                .toList();
        return new PageImpl<>(content, pageable, count(filters));
    }

    private List<Tuple> executeRows(
            String jpql,
            Map<String, Object> parameters,
            Pageable pageable) {
        TypedQuery<Tuple> query = entityManager.createQuery(jpql, Tuple.class);
        bind(query, parameters);
        query.setFirstResult(Math.toIntExact(pageable.getOffset()));
        query.setMaxResults(pageable.getPageSize());
        return query.getResultList();
    }

    private long count(Filters filters) {
        QueryParts parts = buildFilters(filters);
        String countJpql = "SELECT COUNT(c) FROM Course c ";
        if (filters.categoryName() != null) {
            countJpql += "LEFT JOIN c.categoryId cat ";
        }
        TypedQuery<Long> query = entityManager.createQuery(
                countJpql + parts.whereClause(), Long.class);
        bind(query, parts.parameters());
        return query.getSingleResult();
    }

    private QueryParts buildFilters(Filters filters) {
        List<String> predicates = new ArrayList<>();
        Map<String, Object> parameters = new HashMap<>();

        if (filters.publishedOnly()) {
            predicates.add("c.status = 'PUBLISHED'");
        } else if (filters.status() != null) {
            predicates.add("c.status = :status");
            parameters.put("status", filters.status());
        }
        if (filters.instructorId() != null) {
            predicates.add("c.instructorId.id = :instructorId");
            parameters.put("instructorId", filters.instructorId());
        }
        if (filters.categoryName() != null) {
            predicates.add("cat.name = :categoryName");
            parameters.put("categoryName", filters.categoryName());
        }
        if (filters.keyword() != null) {
            String keywordPredicate = filters.searchShortDescription()
                    ? "(c.title LIKE :keyword OR c.shortDescription LIKE :keyword)"
                    : "c.title LIKE :keyword";
            predicates.add(keywordPredicate);
            parameters.put("keyword", "%" + filters.keyword() + "%");
        }

        String where = predicates.isEmpty() ? "" : "WHERE " + String.join(" AND ", predicates);
        return new QueryParts(where, parameters);
    }

    private String orderBy(Sort sort) {
        if (sort.isUnsorted()) {
            return "";
        }
        List<String> orders = new ArrayList<>();
        for (Sort.Order order : sort) {
            String field = SORT_FIELDS.get(order.getProperty());
            if (field == null) {
                throw new IllegalArgumentException(
                        "Không hỗ trợ sắp xếp khóa học theo " + order.getProperty());
            }
            orders.add(field + (order.isAscending() ? " ASC" : " DESC"));
        }
        return " ORDER BY " + String.join(", ", orders);
    }

    private void bind(TypedQuery<?> query, Map<String, Object> parameters) {
        parameters.forEach(query::setParameter);
    }

    private static ListRow toListRow(Tuple row) {
        return new ListRow(row);
    }

    private static DetailRow toDetailRow(Tuple row) {
        return new DetailRow(row);
    }

    private record QueryParts(String whereClause, Map<String, Object> parameters) { }

    private record Filters(
            Long instructorId,
            String status,
            String categoryName,
            String keyword,
            boolean publishedOnly,
            boolean searchShortDescription) {

        private static Filters management(
                Long instructorId, String status, String categoryName, String keyword) {
            return new Filters(instructorId, status, categoryName, keyword, false, false);
        }

        private static Filters published(String categoryName, String keyword) {
            return new Filters(null, null, categoryName, keyword, true, true);
        }
    }

    private static class ListRow implements CourseListProjection {
        private final Long courseId;
        private final String title;
        private final String slug;
        private final String shortDescription;
        private final String thumbnail;
        private final BigDecimal price;
        private final String status;
        private final LocalDateTime createdAt;
        private final LocalDateTime updatedAt;
        private final Long instructorId;
        private final String instructorName;
        private final Short categoryId;
        private final String categoryName;

        protected ListRow(Tuple row) {
            this.courseId = row.get("courseId", Long.class);
            this.title = row.get("title", String.class);
            this.slug = row.get("slug", String.class);
            this.shortDescription = row.get("shortDescription", String.class);
            this.thumbnail = row.get("thumbnail", String.class);
            this.price = row.get("price", BigDecimal.class);
            this.status = row.get("status", String.class);
            this.createdAt = row.get("createdAt", LocalDateTime.class);
            this.updatedAt = row.get("updatedAt", LocalDateTime.class);
            this.instructorId = row.get("instructorId", Long.class);
            this.instructorName = row.get("instructorName", String.class);
            this.categoryId = row.get("categoryId", Short.class);
            this.categoryName = row.get("categoryName", String.class);
        }

        @Override public Long getCourseId() { return courseId; }
        @Override public String getTitle() { return title; }
        @Override public String getSlug() { return slug; }
        @Override public String getShortDescription() { return shortDescription; }
        @Override public String getThumbnail() { return thumbnail; }
        @Override public BigDecimal getPrice() { return price; }
        @Override public String getStatus() { return status; }
        @Override public LocalDateTime getCreatedAt() { return createdAt; }
        @Override public LocalDateTime getUpdatedAt() { return updatedAt; }
        @Override public Long getInstructorId() { return instructorId; }
        @Override public String getInstructorName() { return instructorName; }
        @Override public Short getCategoryId() { return categoryId; }
        @Override public String getCategoryName() { return categoryName; }
    }

    private static final class RatedListRow extends ListRow
            implements RatedCourseListProjection {
        private final Double averageRating;
        private final Long reviewCount;

        private RatedListRow(Tuple row) {
            super(row);
            double rawAverage = row.get("averageRating", Number.class).doubleValue();
            this.averageRating = Math.round(rawAverage * 10d) / 10d;
            this.reviewCount = row.get("reviewCount", Number.class).longValue();
        }

        @Override public Double getAverageRating() { return averageRating; }
        @Override public Long getReviewCount() { return reviewCount; }
    }

    private static final class DetailRow extends ListRow implements CourseDetailProjection {
        private final String description;

        private DetailRow(Tuple row) {
            super(row);
            this.description = row.get("description", String.class);
        }

        @Override public String getDescription() { return description; }
    }
}
