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
import com.zh.learnhub_api.pojo.*;
import com.zh.learnhub_api.repositories.course.LessonRepository;
import com.zh.learnhub_api.repositories.course.QuestionRepository;
import com.zh.learnhub_api.repositories.learning.QuizAttemptRepository;
import com.zh.learnhub_api.repositories.account.UserRepository;
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
        Lesson lesson = findLesson(lessonId);
        lessonProgressService.checkCanLearn(lesson, userId);

        List<Question> questions = loadQuestions(lessonId);
        if (questions.isEmpty()) {
            throw new ResourceNotFoundException("Bài học này chưa có câu hỏi nào");
        }

        List<QuizQuestionDTO> questionDTOs = questions.stream()
                .map(this::toQuizQuestion)
                .collect(Collectors.toList());

        Integer bestScore = quizAttemptRepository.findBestScore(userId, lessonId);
        QuizResultDTO latestResult = quizAttemptRepository
                .findTopByUserId_IdAndLessonId_IdOrderBySubmittedAtDescIdDesc(
                        userId, lessonId)
                .map(attempt -> toSavedResult(attempt, bestScore))
                .orElse(null);

        return new QuizResponseDTO(
                lesson.getId(),
                lesson.getTitle(),
                quizProperties.passPercent(),
                questionDTOs,
                bestScore,
                quizAttemptRepository.countByUserId_IdAndLessonId_Id(userId, lessonId),
                latestResult);
    }

    @Transactional
    public QuizResultDTO submit(Long lessonId, QuizSubmitRequestDTO request, Long userId) {
        Lesson lesson = findLesson(lessonId);
        lessonProgressService.checkCanLearn(lesson, userId);

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
        attempt.setLessonId(lesson);
        attempt.setCorrectCount(correctCount);
        attempt.setTotalQuestions(total);
        attempt.setScorePercent(scorePercent);
        attempt.setPassed(passed);
        attempt.setAnswerSnapshot(writeAnswerSnapshot(results));
        quizAttemptRepository.save(attempt);

        if (passed) {
            lessonProgressService.setLessonCompleted(lessonId, true, userId);
        }

        Integer bestScore = quizAttemptRepository.findBestScore(userId, lessonId);
        boolean lessonCompleted = bestScore != null && bestScore >= quizProperties.passPercent();

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

    private QuizResultDTO toSavedResult(QuizAttempt attempt, Integer bestScore) {
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
                    attempt.isPassed(),
                    bestScore,
                    bestScore != null && bestScore >= quizProperties.passPercent(),
                    questions);
        } catch (JacksonException ex) {
            log.warn("Không thể đọc đáp án đã lưu của lần làm quiz {}: {}",
                    attempt.getId(), ex.getMessage());
            return null;
        }
    }

    private Lesson findLesson(Long lessonId) {
        return lessonRepository.findById(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bài học"));
    }
}
