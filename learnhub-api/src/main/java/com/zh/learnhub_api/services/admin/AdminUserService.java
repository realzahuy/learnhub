package com.zh.learnhub_api.services.admin;

import com.zh.learnhub_api.dtos.admin.AdminUserDTO;
import com.zh.learnhub_api.dtos.common.PageResponseDTO;
import com.zh.learnhub_api.enums.AdminUserFilter;
import com.zh.learnhub_api.enums.CourseStatus;
import com.zh.learnhub_api.projections.admin.AdminUserProjection;
import com.zh.learnhub_api.repositories.course.CourseRepository;
import com.zh.learnhub_api.repositories.learning.EnrollmentRepository;
import com.zh.learnhub_api.repositories.account.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminUserService {

    private static final String ROLE_INSTRUCTOR = "ROLE_INSTRUCTOR";

    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;

    public PageResponseDTO<AdminUserDTO> listUsers(
            String search, AdminUserFilter filter, Pageable requestedPage) {
        Pageable pageable = PageRequest.of(
                requestedPage.getPageNumber(),
                requestedPage.getPageSize(),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        String keyword = normalizeSearch(search);
        boolean instructorsOnly = filter == AdminUserFilter.INSTRUCTOR;
        Page<AdminUserProjection> userPage;
        if (instructorsOnly) {
            userPage = keyword == null
                    ? userRepository.findByRoleName(ROLE_INSTRUCTOR, pageable)
                    : userRepository.findByRoleNameAndKeyword(
                            ROLE_INSTRUCTOR, "%" + keyword + "%", pageable);
        } else {
            userPage = keyword == null
                    ? userRepository.findAllProjected(pageable)
                    : userRepository.findByKeyword("%" + keyword + "%", pageable);
        }

        return PageResponseDTO.from(userPage, toDTOs(userPage.getContent()));
    }

    private List<AdminUserDTO> toDTOs(List<AdminUserProjection> users) {
        if (users.isEmpty()) {

            return List.of();
        }

        List<Long> ids = users.stream().map(AdminUserProjection::getId).toList();

        Map<Long, List<String>> rolesByUser = new HashMap<>();
        for (var row : userRepository.findRolesByUserIds(ids)) {
            rolesByUser.computeIfAbsent(row.getUserId(), key -> new ArrayList<>())
                    .add(row.getRoleName());
        }
        rolesByUser.replaceAll((id, roles) -> roles.stream().sorted().toList());
        List<Long> instructorIds = ids.stream()
                .filter(id -> rolesByUser.getOrDefault(id, List.of()).contains(ROLE_INSTRUCTOR))
                .toList();

        Map<Long, Map<String, Long>> coursesByInstructor = new HashMap<>();
        if (!instructorIds.isEmpty()) {
            for (var row : courseRepository.countCoursesByInstructorGroupedByStatus(instructorIds)) {
                Long instructorId = row.getInstructorId();
                String status = row.getStatus();
                long count = row.getCourseCount();
                coursesByInstructor
                        .computeIfAbsent(instructorId, key -> new HashMap<>())
                        .put(status, count);
            }
        }

        Map<Long, Long> studentsByInstructor = new HashMap<>();
        if (!instructorIds.isEmpty()) {
            for (var row : enrollmentRepository.countDistinctStudentsByInstructor(instructorIds)) {
                studentsByInstructor.put(row.getInstructorId(), row.getStudentCount());
            }
        }

        return users.stream().map(user -> {
            Map<String, Long> byStatus = coursesByInstructor.getOrDefault(user.getId(), Map.of());

            long published = byStatus.getOrDefault(CourseStatus.PUBLISHED.name(), 0L);
            long pending = byStatus.getOrDefault(CourseStatus.PENDING.name(), 0L);
            long draft = byStatus.getOrDefault(CourseStatus.DRAFT.name(), 0L);
            long rejected = byStatus.getOrDefault(CourseStatus.REJECTED.name(), 0L);

            return new AdminUserDTO(
                    user.getId(),
                    user.getUsername(),
                    user.getEmail(),
                    user.getFullName(),
                    user.getAvatar(),
                    user.getBio(),
                    user.isEmailVerified(),
                    rolesByUser.getOrDefault(user.getId(), List.of()),
                    user.getCreatedAt(),
                    user.getLastLogin(),

                    published + pending + draft + rejected,
                    published,
                    pending,
                    draft,
                    rejected,
                    studentsByInstructor.getOrDefault(user.getId(), 0L)
            );
        }).toList();
    }

    private String normalizeSearch(String search) {
        if (search == null || search.isBlank()) {
            return null;
        }
        return search.trim();
    }
}
