package com.zh.learnhub_api.services.course;

import com.zh.learnhub_api.dtos.course.QuestionRequestDTO.AnswerRequestDTO;
import com.zh.learnhub_api.dtos.course.QuestionReorderRequestDTO;
import com.zh.learnhub_api.dtos.course.QuestionRequestDTO;
import com.zh.learnhub_api.dtos.course.QuestionResponseDTO;
import com.zh.learnhub_api.exceptions.ResourceNotFoundException;
import com.zh.learnhub_api.pojo.Answer;
import com.zh.learnhub_api.pojo.Course;
import com.zh.learnhub_api.pojo.Lesson;
import com.zh.learnhub_api.pojo.Question;
import com.zh.learnhub_api.repositories.course.AnswerRepository;
import com.zh.learnhub_api.repositories.course.CourseRepository;
import com.zh.learnhub_api.repositories.course.LessonRepository;
import com.zh.learnhub_api.repositories.course.QuestionRepository;
import com.zh.learnhub_api.mappers.QuestionMapper;
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
    private final CourseRepository courseRepository;
    private final CourseEditPolicy courseEditPolicy;
    private final QuestionMapper questionMapper;

    private static final String WHAT = "câu hỏi";

    @Transactional
    public QuestionResponseDTO createQuestion(Long courseId, Long lessonId,
                                             QuestionRequestDTO request, Long instructorId) {
        Lesson lesson = loadLessonForMutation(courseId, lessonId, instructorId);
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
    public QuestionResponseDTO updateQuestion(Long courseId, Long lessonId, Long questionId,
                                              QuestionRequestDTO request, Long instructorId) {
        loadLessonForMutation(courseId, lessonId, instructorId);
        validateAnswers(request.getAnswers());

        Question question = questionRepository.findByIdAndLessonId_Id(questionId, lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy câu hỏi"));

        question.setQuestion(request.getQuestion());
        Question updated = questionRepository.save(question);

        answerRepository.deleteByQuestionId_Id(questionId);
        answerRepository.flush();

        replaceAnswers(updated, request.getAnswers());

        return mapToDTO(updated);
    }

    @Transactional
    public List<QuestionResponseDTO> reorderQuestions(Long courseId, Long lessonId,
                                                      List<QuestionReorderRequestDTO> requests, Long instructorId) {
        loadLessonForMutation(courseId, lessonId, instructorId);

        long distinctPositions = requests.stream().map(QuestionReorderRequestDTO::getPosition).distinct().count();
        if (distinctPositions != requests.size()) {
            throw new IllegalArgumentException("Các câu hỏi không được trùng vị trí");
        }

        List<Question> questions = questionRepository.findByLessonIdWithAnswers(lessonId);
        Map<Long, Question> byId = questions.stream()
                .collect(Collectors.toMap(Question::getId, q -> q));

        if (requests.size() != questions.size()) {
            throw new IllegalArgumentException("Phải gửi đủ toàn bộ câu hỏi của bài học khi sắp xếp lại");
        }
        for (QuestionReorderRequestDTO request : requests) {
            Question question = byId.get(request.getId());
            if (question == null) {
                throw new ResourceNotFoundException("Không tìm thấy câu hỏi " + request.getId() + " trong bài học");
            }
            question.setPosition(request.getPosition());
        }

        return questionRepository.saveAllAndFlush(questions).stream()
                .sorted(java.util.Comparator.comparingInt(Question::getPosition))
                .map(question -> questionMapper.toDTO(question, question.getAnswerSet()))
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteQuestion(Long courseId, Long lessonId, Long questionId, Long instructorId) {
        loadLessonForMutation(courseId, lessonId, instructorId);

        Question question = questionRepository.findByIdAndLessonId_Id(questionId, lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy câu hỏi"));

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
            throw new IllegalArgumentException("Câu hỏi phải có ít nhất một đáp án đúng");
        }
    }

    private Lesson loadLessonForMutation(Long courseId, Long lessonId, Long instructorId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khóa học"));

        courseEditPolicy.requireOwnerAndEditable(course, instructorId, WHAT);

        return lessonRepository.findByIdAndCourseId_Id(lessonId, courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bài học"));
    }

    private QuestionResponseDTO mapToDTO(Question question) {
        return questionMapper.toDTO(
                question, answerRepository.findByQuestionId_IdOrderByIdAsc(question.getId()));
    }
}
