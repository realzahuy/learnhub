package com.zh.learnhub_api.pojo;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Set;

@Entity
@Table(name = "course",
       uniqueConstraints = @UniqueConstraint(name = "uk_course_slug", columnNames = "slug"),
       indexes = {
           @Index(name = "idx_course_status_created", columnList = "status, created_at, id"),
           @Index(name = "idx_course_instructor_status_created",
                  columnList = "instructor_id, status, created_at")
       })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString(onlyExplicitlyIncluded = true)
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Course implements Serializable {

    private static final long serialVersionUID = 1L;
    
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

    @Column(name = "price")
    private BigDecimal price;

    @Column(name = "status")
    private String status;

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
    
    @OneToMany(mappedBy = "courseId", fetch = FetchType.LAZY)
    private Set<Lesson> lessonSet;
    
    @OneToMany(mappedBy = "courseId", fetch = FetchType.LAZY)
    private Set<Enrollment> enrollmentSet;
}
