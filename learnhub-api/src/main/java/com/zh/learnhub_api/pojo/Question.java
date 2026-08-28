package com.zh.learnhub_api.pojo;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.util.Set;

@Entity
@Table(name = "question")
@Getter
@Setter
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    @EqualsAndHashCode.Include
    private Long id;

    @NotNull
    @Size(min = 1, max = 1000)
    @Column(name = "question")
    private String question;

    @Column(name = "position", nullable = false)
    private int position;

    @JoinColumn(name = "lesson_id", referencedColumnName = "id")
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    private Lesson lessonId;

    @OneToMany(mappedBy = "questionId", fetch = FetchType.LAZY)
    private Set<Answer> answerSet;
}
