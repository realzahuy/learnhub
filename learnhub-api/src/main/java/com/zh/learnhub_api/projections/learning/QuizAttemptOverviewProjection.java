package com.zh.learnhub_api.projections.learning;

public interface QuizAttemptOverviewProjection {
    Integer getBestScore();
    Long getAttemptCount();
    Long getAttemptId();
    Integer getCorrectCount();
    Integer getTotalQuestions();
    Integer getScorePercent();
    Boolean getPassed();
    String getAnswerSnapshot();
}
