package com.zh.learnhub_api.services.account;

import com.zh.learnhub_api.dtos.account.RegisterRequestDTO;
import com.zh.learnhub_api.dtos.account.UpdateProfileRequestDTO;
import com.zh.learnhub_api.dtos.account.UserResponseDTO;
import com.zh.learnhub_api.exceptions.DuplicateResourceException;
import com.zh.learnhub_api.exceptions.ForbiddenException;
import com.zh.learnhub_api.exceptions.ResourceNotFoundException;
import com.zh.learnhub_api.mappers.UserMapper;
import com.zh.learnhub_api.pojo.Role;
import com.zh.learnhub_api.pojo.User;
import com.zh.learnhub_api.projections.account.ExistingUserProjection;
import com.zh.learnhub_api.projections.account.UserUpgradeProjection;
import com.zh.learnhub_api.repositories.account.RoleRepository;
import com.zh.learnhub_api.repositories.account.UserRepository;
import com.zh.learnhub_api.repositories.account.UserSessionRepository;
import com.zh.learnhub_api.services.media.ImageStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashSet;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserSessionRepository sessionRepository;
    private final UserProfileUpdateService userProfileUpdateService;
    private final PasswordEncoder passwordEncoder;
    private final ImageStorageService imageStorageService;
    private final UserMapper userMapper;

    public UserResponseDTO registerUser(RegisterRequestDTO registerRequest) {
        String username = registerRequest.getUsername().trim();
        String email = registerRequest.getEmail().trim().toLowerCase();
        String fullName = registerRequest.getFullName().trim();

        List<ExistingUserProjection> existingUsers = userRepository.findExisting(username, email);
        boolean usernameExists = existingUsers.stream()
                .anyMatch(existing -> existing.getUsername().equalsIgnoreCase(username));
        boolean emailExists = existingUsers.stream()
                .anyMatch(existing -> existing.getEmail().equalsIgnoreCase(email));

        if (usernameExists) {

            throw new DuplicateResourceException("Tên đăng nhập không được sử dụng");
        }

        if (emailExists) {
            throw new DuplicateResourceException("Email không được sử dụng");
        }

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setFullName(fullName);

        user.setPassword(passwordEncoder.encode(registerRequest.getPassword()));

        Short userRoleId = roleRepository.findIdByName("ROLE_USER")
                .orElseThrow(() -> new ResourceNotFoundException("Lỗi: Không tìm thấy vai trò ROLE_USER"));
        Role userRole = roleRepository.getReferenceById(userRoleId);
        user.setRoleSet(new HashSet<>(List.of(userRole)));

        User savedUser = userRepository.save(user);

        return userMapper.toResponseDTO(savedUser);
    }

    @Transactional(readOnly = true)
    public UserResponseDTO getUserByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));

        return userMapper.toResponseDTO(user);
    }

    public void upgradeToInstructor(String username) {

        UserUpgradeProjection user = userRepository.findUserForUpgrade(username)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));

        if (!Boolean.TRUE.equals(user.getEmailVerified())) {
            throw new ForbiddenException("Email chưa được xác thực");
        }

        if (user.getRoleNames() != null && user.getRoleNames().contains("ROLE_INSTRUCTOR")) {
            throw new DuplicateResourceException("Tài khoản đã là giảng viên");
        }

        int rows = userRepository.addInstructorRole(user.getId());

        if (rows == 0) {
            throw new RuntimeException("Không thể nâng cấp tài khoản");
        }

    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public UserResponseDTO updateProfile(String username, UpdateProfileRequestDTO request, MultipartFile avatarFile) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));

        String avatarUrl = user.getAvatar();
        if (avatarFile != null && !avatarFile.isEmpty()) {
            avatarUrl = imageStorageService.uploadAvatar(avatarFile, user.getId());
        }

        boolean publicIdentityChanged = !Objects.equals(user.getFullName(), request.getFullName())
                || !Objects.equals(user.getAvatar(), avatarUrl);

        userProfileUpdateService.updateProfile(
                user.getId(),
                request.getFullName(),
                request.getBio(),
                avatarUrl,
                publicIdentityChanged);

        user.setFullName(request.getFullName());
        user.setBio(request.getBio());
        user.setAvatar(avatarUrl);
        return userMapper.toResponseDTO(user);
    }

    public void changePassword(
            String username,
            Long currentSessionId,
            String oldPassword,
            String newPassword) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));

        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            throw new IllegalArgumentException("Mật khẩu cũ không đúng");
        }

        if (passwordEncoder.matches(newPassword, user.getPassword())) {
            throw new IllegalArgumentException("Mật khẩu mới phải khác mật khẩu cũ");
        }

        userRepository.updatePassword(user.getId(), passwordEncoder.encode(newPassword));
        sessionRepository.deleteOtherSessions(user.getId(), currentSessionId);
    }
}
