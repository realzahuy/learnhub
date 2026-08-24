package com.zh.learnhub_api.services.learning;

import com.zh.learnhub_api.dtos.learning.QuizResponseDTO;
import com.zh.learnhub_api.dtos.learning.QuizResultDTO;
import com.zh.learnhub_api.dtos.learning.QuizSubmitRequestDTO;
import com.zh.learnhub_api.dtos.learning.QuizResponseDTO.QuizOptionDTO;
import com.zh.learnhub_api.dtos.learning.QuizResponseDTO.QuizQuestionDTO;
import com.zh.learnhub_api.dtos.learning.QuizResultDTO.QuizQuestionResultDTO;
import com.zh.learnhub_api.dtos.learning.QuizSubmitRequestDTO.QuizAnswerSubmissionDTO;
import com.zh.learnhub_api.configs.AppProperties;
import com.zh.learnhub_api.exceptions.ResourceNotFoundException;
import com.zh.learnhub_api.pojo.Answer;
import com.zh.learnhub_api.pojo.Question;
import com.zh.learnhub_api.projections.learning.LessonAccessProjection;
import com.zh.learnhub_api.repositories.course.LessonRepository;
import com.zh.learnhub_api.repositories.course.QuestionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class QuizService {

    private final LessonRepository lessonRepository;
    private final QuestionRepository questionRepository;
    private final LearningAccessService learningAccessService;
    private final AppProperties.Quiz quizProperties;

    public QuizResponseDTO getQuiz(Long lessonId, Long userId) {
        LessonAccessProjection quiz = requireQuizAccess(lessonId, userId);

        List<Question> questions = loadQuestions(lessonId);
        if (questions.isEmpty()) {
            throw new ResourceNotFoundException("Bài học này chưa có câu hỏi nào");
        }

        List<QuizQuestionDTO> questionDTOs = questions.stream()
                .map(this::toQuizQuestion)
                .collect(Collectors.toList());

        return new QuizResponseDTO(
                quiz.getLessonId(),
                quiz.getLessonTitle(),
                quizProperties.passPercent(),
                questionDTOs);
    }

    public QuizResultDTO submit(Long lessonId, QuizSubmitRequestDTO request, Long userId) {
        requireQuizAccess(lessonId, userId);

        List<Question> questions = loadQuestions(lessonId);
        if (questions.isEmpty()) {
            throw new ResourceNotFoundException("Bài học này chưa có câu hỏi nào");
        }

        Map<Long, List<Long>> submitted = new HashMap<>();
        for (QuizAnswerSubmissionDTO item : request.getAnswers()) {
            submitted.put(item.getQuestionId(),
                    item.getSelectedAnswerIds() == null ? List.of() : item.getSelectedAnswerIds());
        }

        List<QuizQuestionResultDTO> results = new ArrayList<>();
        int correctCount = 0;

        for (Question question : questions) {
            QuizQuestionResultDTO result = gradeQuestion(
                    question, submitted.getOrDefault(question.getId(), List.of()));
            if (Boolean.TRUE.equals(result.getCorrect())) {
                correctCount++;
            }
            results.add(result);
        }

        int total = questions.size();
        int scorePercent = (int) Math.round(correctCount * 100.0 / total);
        boolean passed = scorePercent >= quizProperties.passPercent();

        return new QuizResultDTO(
                correctCount,
                total,
                scorePercent,
                quizProperties.passPercent(),
                passed,
                results);
    }

    private LessonAccessProjection requireQuizAccess(Long lessonId, Long userId) {
        LessonAccessProjection access = lessonRepository.findLearningAccess(lessonId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bài học"));
        learningAccessService.requireEnrollment(access.getEnrolled());
        return access;
    }

    private QuizQuestionResultDTO gradeQuestion(Question question, List<Long> selectedRaw) {
        Set<Answer> answers = answersOf(question);

        Set<Long> optionIds = answers.stream()
                .map(Answer::getId)
                .collect(Collectors.toSet());

        Set<Long> correctIds = answers.stream()
                .filter(Answer::isCorrect)
                .map(Answer::getId)
                .collect(Collectors.toSet());

        Set<Long> selected = selectedRaw.stream()
                .filter(Objects::nonNull)
                .filter(optionIds::contains)
                .collect(Collectors.toSet());

        return new QuizQuestionResultDTO(
                question.getId(),
                selected.equals(correctIds),
                sortedIds(correctIds),
                sortedIds(selected));
    }

    private QuizQuestionDTO toQuizQuestion(Question question) {
        Set<Answer> answers = answersOf(question);

        long correctCount = answers.stream().filter(Answer::isCorrect).count();

        List<QuizOptionDTO> options = answers.stream()
                .sorted(Comparator.comparing(Answer::getId))
                .map(answer -> new QuizOptionDTO(answer.getId(), answer.getAnswer()))
                .collect(Collectors.toList());

        return new QuizQuestionDTO(
                question.getId(),
                question.getQuestion(),
                question.getPosition(),
                correctCount > 1,
                options);
    }

    private List<Question> loadQuestions(Long lessonId) {
        return questionRepository.findByLessonIdWithAnswers(lessonId).stream()
                .sorted(Comparator.comparingInt(Question::getPosition)
                        .thenComparing(Question::getId))
                .collect(Collectors.toList());
    }

    private Set<Answer> answersOf(Question question) {
        return question.getAnswerSet() == null ? Set.of() : question.getAnswerSet();
    }

    private List<Long> sortedIds(Set<Long> ids) {
        return ids.stream().sorted().collect(Collectors.toList());
    }

}
