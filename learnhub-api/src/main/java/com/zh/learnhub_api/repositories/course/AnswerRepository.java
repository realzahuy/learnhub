package com.zh.learnhub_api.repositories.course;

import com.zh.learnhub_api.pojo.Answer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AnswerRepository extends JpaRepository<Answer, Long> {

    List<Answer> findByQuestionId_IdOrderByIdAsc(Long questionId);

    void deleteByQuestionId_Id(Long questionId);
}
