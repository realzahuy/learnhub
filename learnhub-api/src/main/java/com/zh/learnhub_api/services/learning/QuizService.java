package com.zh.learnhub_api.services.learning;

import com.zh.learnhub_api.dtos.learning.QuizResponseDTO;
import com.zh.learnhub_api.dtos.learning.QuizResultDTO;
import com.zh.learnhub_api.dtos.learning.QuizSubmitRequestDTO;
import com.zh.learnhub_api.dtos.learning.LessonProgressResponseDTO;
import com.zh.learnhub_api.dtos.learning.QuizResponseDTO.QuizOptionDTO;
import com.zh.learnhub_api.dtos.learning.QuizResponseDTO.QuizQuestionDTO;
import com.zh.learnhub_api.dtos.learning.QuizResultDTO.QuizQuestionResultDTO;
import com.zh.learnhub_api.dtos.learning.QuizSubmitRequestDTO.QuizAnswerSubmissionDTO;
import com.zh.learnhub_api.configs.AppProperties;
import com.zh.learnhub_api.exceptions.ResourceNotFoundException;
import com.zh.learnhub_api.pojo.*;
import com.zh.learnhub_api.repositories.course.LessonRepository;
import com.zh.learnhub_api.repositories.course.QuestionRepository;
import com.zh.learnhub_api.repositories.learning.QuizAttemptRepository;
import com.zh.learnhub_api.repositories.account.UserRepository;
import com.zh.learnhub_api.projections.learning.QuizAttemptOverviewProjection;
import com.zh.learnhub_api.projections.learning.QuizOpenProjection;
import com.zh.learnhub_api.projections.learning.QuizSubmitAccessProjection;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class QuizService {

    private final LessonRepository lessonRepository;
    private final QuestionRepository questionRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final LessonProgressService lessonProgressService;
    private final UserRepository userRepository;
    private final ObjectMapper snapshotMapper;
    private final AppProperties.Quiz quizProperties;

    public QuizResponseDTO getQuiz(Long lessonId, Long userId) {
        QuizOpenProjection quiz = lessonRepository.findQuizOpen(lessonId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bài học"));
        lessonProgressService.requireEnrollment(quiz.getEnrolled());

        List<Question> questions = loadQuestions(lessonId);
        if (questions.isEmpty()) {
            throw new ResourceNotFoundException("Bài học này chưa có câu hỏi nào");
        }

        List<QuizQuestionDTO> questionDTOs = questions.stream()
                .map(this::toQuizQuestion)
                .collect(Collectors.toList());

        Integer bestScore = quiz.getBestScore();
        boolean lessonCompleted = lessonProgressService
                .getProgressForAuthorizedUser(lessonId, userId)
                .completed();
        QuizResultDTO latestResult = quiz.getAttemptId() == null
                ? null
                : toSavedResult(quiz, bestScore, lessonCompleted);

        return new QuizResponseDTO(
                quiz.getLessonId(),
                quiz.getLessonTitle(),
                quizProperties.passPercent(),
                questionDTOs,
                bestScore,
                quiz.getAttemptCount(),
                latestResult);
    }

    @Transactional
    public QuizResultDTO submit(Long lessonId, QuizSubmitRequestDTO request, Long userId) {
        QuizSubmitAccessProjection access = lessonRepository
                .findQuizSubmitAccess(lessonId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bài học"));
        lessonProgressService.requireEnrollment(access.getEnrolled());

        List<Question> questions = loadQuestions(lessonId);
        if (questions.isEmpty()) {
            throw new ResourceNotFoundException("Bài học này chưa có câu hỏi nào");
        }

        Map<Long, List<Long>> submitted = new HashMap<>();
        if (request.getAnswers() != null) {
            for (QuizAnswerSubmissionDTO item : request.getAnswers()) {
                if (item.getQuestionId() == null) continue;
                submitted.put(item.getQuestionId(),
                        item.getSelectedAnswerIds() == null ? List.of() : item.getSelectedAnswerIds());
            }
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

        QuizAttempt attempt = new QuizAttempt();
        attempt.setUserId(userRepository.getReferenceById(userId));
        attempt.setLessonId(lessonRepository.getReferenceById(lessonId));
        attempt.setCorrectCount(correctCount);
        attempt.setTotalQuestions(total);
        attempt.setScorePercent(scorePercent);
        attempt.setPassed(passed);
        attempt.setAnswerSnapshot(writeAnswerSnapshot(results));
        quizAttemptRepository.save(attempt);

        LessonProgressResponseDTO progress = passed
                ? lessonProgressService.markQuizCompletedForAuthorizedUser(lessonId, userId)
                : lessonProgressService.getProgressForAuthorizedUser(lessonId, userId);

        Integer bestScore = access.getBestScore() == null
                ? scorePercent
                : Math.max(access.getBestScore(), scorePercent);
        boolean lessonCompleted = progress.completed();

        log.info("Quiz submitted - userId: {}, lesson: {}, score: {}/{} ({}%)",
                userId, lessonId, correctCount, total, scorePercent);

        return new QuizResultDTO(
                correctCount,
                total,
                scorePercent,
                quizProperties.passPercent(),
                passed,
                bestScore,
                lessonCompleted,
                results);
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

    private String writeAnswerSnapshot(List<QuizQuestionResultDTO> results) {
        try {
            return snapshotMapper.writeValueAsString(results);
        } catch (JacksonException ex) {
            throw new IllegalStateException("Không thể lưu đáp án bài kiểm tra", ex);
        }
    }

    private QuizResultDTO toSavedResult(
            QuizAttemptOverviewProjection attempt,
            Integer bestScore,
            boolean lessonCompleted) {
        if (attempt.getAnswerSnapshot() == null || attempt.getAnswerSnapshot().isBlank()) {
            return null;
        }
        try {
            List<QuizQuestionResultDTO> questions = snapshotMapper.readValue(
                    attempt.getAnswerSnapshot(),
                    new TypeReference<List<QuizQuestionResultDTO>>() { });
            return new QuizResultDTO(
                    attempt.getCorrectCount(),
                    attempt.getTotalQuestions(),
                    attempt.getScorePercent(),
                    quizProperties.passPercent(),
                    Boolean.TRUE.equals(attempt.getPassed()),
                    bestScore,
                    lessonCompleted,
                    questions);
        } catch (JacksonException ex) {
            log.warn("Không thể đọc đáp án đã lưu của lần làm quiz {}: {}",
                    attempt.getAttemptId(), ex.getMessage());
            return null;
        }
    }

}
