package com.zh.learnhub_api.mappers;

import com.zh.learnhub_api.dtos.course.QuestionResponseDTO.AnswerResponseDTO;
import com.zh.learnhub_api.dtos.course.QuestionResponseDTO;
import com.zh.learnhub_api.pojo.Answer;
import com.zh.learnhub_api.pojo.Question;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Mapper
public interface QuestionMapper {

    @Mapping(target = "id", source = "question.id")
    @Mapping(target = "question", source = "question.question")
    @Mapping(target = "position", source = "question.position")
    @Mapping(target = "lessonId", source = "question.lessonId.id")
    @Mapping(target = "answers", source = "answers", qualifiedByName = "sortedAnswers")
    QuestionResponseDTO toDTO(Question question, Collection<Answer> answers);

    @Mapping(target = "isCorrect", source = "correct")
    AnswerResponseDTO toAnswerDTO(Answer answer);

    @Named("sortedAnswers")
    default List<AnswerResponseDTO> toSortedAnswerDTOs(Collection<Answer> answers) {

        return answers.stream()
                .sorted(Comparator.comparing(Answer::getId))
                .map(this::toAnswerDTO)
                .collect(Collectors.toList());
    }
}
