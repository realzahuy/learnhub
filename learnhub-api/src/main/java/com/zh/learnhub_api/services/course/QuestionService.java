package com.zh.learnhub_api.services.course;

import com.zh.learnhub_api.dtos.common.PositionReorderRequestDTO;
import com.zh.learnhub_api.dtos.course.QuestionRequestDTO;
import com.zh.learnhub_api.dtos.course.QuestionRequestDTO.AnswerRequestDTO;
import com.zh.learnhub_api.dtos.course.QuestionResponseDTO;
import com.zh.learnhub_api.exceptions.ResourceNotFoundException;
import com.zh.learnhub_api.mappers.QuestionMapper;
import com.zh.learnhub_api.pojo.Answer;
import com.zh.learnhub_api.pojo.Lesson;
import com.zh.learnhub_api.pojo.Question;
import com.zh.learnhub_api.repositories.course.AnswerRepository;
import com.zh.learnhub_api.repositories.course.LessonRepository;
import com.zh.learnhub_api.repositories.course.QuestionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class QuestionService {

    private final QuestionRepository questionRepository;
    private final AnswerRepository answerRepository;
    private final LessonRepository lessonRepository;
    private final CourseEditPolicy courseEditPolicy;
    private final QuestionMapper questionMapper;

    @Transactional
    public QuestionResponseDTO createQuestion(Long lessonId, QuestionRequestDTO request, Long instructorId) {
        Lesson lesson = loadLessonForMutation(lessonId, instructorId);
        validateAnswers(request.getAnswers());

        Question question = new Question();
        question.setQuestion(request.getQuestion());
        question.setLessonId(lesson);

        question.setPosition(questionRepository.findMaxPositionByLessonId(lessonId) + 1);
        Question saved = questionRepository.save(question);

        replaceAnswers(saved, request.getAnswers());

        return mapToDTO(saved);
    }

    @Transactional
    public QuestionResponseDTO updateQuestion(Long questionId, QuestionRequestDTO request, Long instructorId) {
        Question question = loadQuestionForMutation(questionId, instructorId);
        validateAnswers(request.getAnswers());

        question.setQuestion(request.getQuestion());
        Question updated = questionRepository.save(question);

        answerRepository.deleteByQuestionId_Id(questionId);
        answerRepository.flush();

        replaceAnswers(updated, request.getAnswers());

        return mapToDTO(updated);
    }

    @Transactional
    public List<QuestionResponseDTO> reorderQuestions(
            Long lessonId, List<PositionReorderRequestDTO> requests, Long instructorId) {
        loadLessonForMutation(lessonId, instructorId);

        long distinctPositions = requests.stream().map(PositionReorderRequestDTO::getPosition).distinct().count();
        if (distinctPositions != requests.size()) {
            throw new IllegalArgumentException("Trùng vị trí");
        }

        List<Question> questions = questionRepository.findByLessonIdWithAnswers(lessonId);
        Map<Long, Question> byId = questions.stream()
                .collect(Collectors.toMap(Question::getId, q -> q));

        if (requests.size() != questions.size()) {
            throw new IllegalArgumentException("Thiếu câu hỏi");
        }
        for (PositionReorderRequestDTO request : requests) {
            Question question = byId.get(request.getId());
            if (question == null) {
                throw new ResourceNotFoundException("Không tìm thấy câu hỏi");
            }
            question.setPosition(request.getPosition());
        }

        return questionRepository.saveAllAndFlush(questions).stream()
                .sorted(java.util.Comparator.comparingInt(Question::getPosition))
                .map(question -> questionMapper.toDTO(question, question.getAnswerSet()))
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteQuestion(Long questionId, Long instructorId) {
        Question question = loadQuestionForMutation(questionId, instructorId);
        questionRepository.delete(question);
    }

    private void replaceAnswers(Question question, List<AnswerRequestDTO> requests) {
        List<Answer> answers = new ArrayList<>();
        for (AnswerRequestDTO dto : requests) {
            Answer answer = new Answer();
            answer.setAnswer(dto.getAnswer());
            answer.setCorrect(dto.getIsCorrect());
            answer.setQuestionId(question);
            answers.add(answer);
        }
        answerRepository.saveAll(answers);
    }

    private void validateAnswers(List<AnswerRequestDTO> answers) {
        boolean hasCorrect = answers.stream().anyMatch(a -> Boolean.TRUE.equals(a.getIsCorrect()));
        if (!hasCorrect) {
            throw new IllegalArgumentException("Cần ít nhất một đáp án đúng");
        }
    }

    private Lesson loadLessonForMutation(Long lessonId, Long instructorId) {
        Lesson lesson = lessonRepository.findByIdWithCourse(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bài giảng"));
        courseEditPolicy.requireOwnerAndEditable(lesson.getCourseId(), instructorId);
        return lesson;
    }

    private Question loadQuestionForMutation(Long questionId, Long instructorId) {
        Question question = questionRepository.findByIdWithLessonAndCourse(questionId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy câu hỏi"));
        courseEditPolicy.requireOwnerAndEditable(question.getLessonId().getCourseId(), instructorId);
        return question;
    }

    private QuestionResponseDTO mapToDTO(Question question) {
        return questionMapper.toDTO(
                question, answerRepository.findByQuestionId_IdOrderByIdAsc(question.getId()));
    }
}
