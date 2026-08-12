package com.zh.learnhub_api.mappers;

import com.zh.learnhub_api.dtos.account.UserResponseDTO;
import com.zh.learnhub_api.pojo.User;
import org.mapstruct.Mapper;

@Mapper
public interface UserMapper {

    UserResponseDTO toResponseDTO(User user);
}
