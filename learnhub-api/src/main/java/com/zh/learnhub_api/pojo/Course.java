package com.zh.learnhub_api.pojo;

import com.zh.learnhub_api.enums.CourseStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "course",
        uniqueConstraints = @UniqueConstraint(name = "uk_course_slug", columnNames = "slug"),
        indexes = {
            @Index(name = "idx_course_status_created", columnList = "status, created_at, id"),
            @Index(name = "idx_course_instructor_status_created", columnList = "instructor_id, status, created_at")
        })
@Getter
@Setter
@NoArgsConstructor
@ToString(onlyExplicitlyIncluded = true)
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Course {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    @ToString.Include
    @EqualsAndHashCode.Include
    private Long id;

    @NotNull
    @Size(min = 1, max = 255)
    @Column(name = "title")
    @ToString.Include
    private String title;

    @NotNull
    @Size(min = 1, max = 255)
    @Column(name = "slug", nullable = false)
    private String slug;

    @Size(max = 500)
    @Column(name = "short_description")
    private String shortDescription;

    @Lob
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Size(max = 500)
    @Column(name = "thumbnail")
    private String thumbnail;

    @NotNull
    @Column(name = "price", nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private CourseStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "instructor_id", referencedColumnName = "id")
    private User instructorId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", referencedColumnName = "id")
    private Category categoryId;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}
