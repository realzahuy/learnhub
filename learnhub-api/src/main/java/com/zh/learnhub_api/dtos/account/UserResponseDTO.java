package com.zh.learnhub_api.dtos.account;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserResponseDTO {
    private Long id;
    private String username;
    private String email;
    private String fullName;
    private String avatar;
    private String bio;
    private Boolean emailVerified;
    private LocalDateTime lastLogin;
}
