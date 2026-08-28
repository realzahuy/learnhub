package com.zh.learnhub_api.controllers.learning;

import com.zh.learnhub_api.dtos.common.PageResponseDTO;
import com.zh.learnhub_api.dtos.learning.RatingSummaryDTO;
import com.zh.learnhub_api.dtos.learning.ReviewRequestDTO;
import com.zh.learnhub_api.dtos.learning.ReviewResponseDTO;
import com.zh.learnhub_api.security.AuthenticatedUserPrincipal;
import com.zh.learnhub_api.services.learning.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/courses/{slug}/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @GetMapping
    public PageResponseDTO<ReviewResponseDTO> getReviews(
            @PathVariable String slug,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            Pageable pageable) {

        Long currentUserId = principal == null ? null : principal.getUserId();

        return reviewService.getCourseReviews(slug, currentUserId, pageable);
    }

    @GetMapping("/summary")
    public RatingSummaryDTO getSummary(@PathVariable String slug) {
        return reviewService.getCourseSummary(slug);
    }

    @GetMapping("/me")
    public ResponseEntity<ReviewResponseDTO> getMyReview(
            @PathVariable String slug,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {

        ReviewResponseDTO review = reviewService.getMyReview(slug, principal.getUserId());

        return review == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(review);
    }

    @PostMapping
    public ReviewResponseDTO saveReview(
            @PathVariable String slug,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @Valid @RequestBody ReviewRequestDTO request) {

        return reviewService.saveReview(slug, principal.getUserId(), request);
    }

    @DeleteMapping("/me")
    public ResponseEntity<Void> deleteMyReview(
            @PathVariable String slug,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {

        reviewService.deleteMyReview(slug, principal.getUserId());

        return ResponseEntity.noContent().build();
    }
}
