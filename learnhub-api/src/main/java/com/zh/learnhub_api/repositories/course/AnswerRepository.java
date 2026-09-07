package com.zh.learnhub_api.repositories.course;

import com.zh.learnhub_api.pojo.Answer;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnswerRepository extends JpaRepository<Answer, Long> {

    void deleteByQuestionId_Id(Long questionId);
}
