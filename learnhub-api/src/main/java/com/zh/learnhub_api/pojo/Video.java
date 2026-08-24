package com.zh.learnhub_api.pojo;

import com.zh.learnhub_api.enums.VideoStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.io.Serializable;
import java.time.LocalDateTime;

@Entity
@Table(name = "video")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString(onlyExplicitlyIncluded = true)
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Video implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    @ToString.Include
    @EqualsAndHashCode.Include
    private Long id;

    @NotNull
    @Size(min = 1, max = 255)
    @Column(name = "title", nullable = false)
    private String title;

    @Size(max = 500)
    @Column(name = "storage_key")
    private String storageKey;

    @Size(max = 255)
    @Column(name = "mediaconvert_job_id")
    private String mediaconvertJobId;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private VideoStatus status;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    @NotNull
    @Min(1)
    @Column(name = "position", nullable = false)
    private Integer position;

    @NotNull
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @NotNull
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @JoinColumn(name = "lesson_id", referencedColumnName = "id", nullable = false)
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    private Lesson lesson;
}
