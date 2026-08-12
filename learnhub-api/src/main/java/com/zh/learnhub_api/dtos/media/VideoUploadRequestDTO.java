package com.zh.learnhub_api.dtos.media;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class VideoUploadRequestDTO {
    @NotBlank(message = "Title is required")
    @Size(min = 1, max = 255, message = "Title must be between 1 and 255 characters")
    private String title;

    @NotNull(message = "Position is required")
    @Min(value = 1, message = "Position must be at least 1")
    private Integer position;

    @NotBlank(message = "File name is required")
    @Pattern(regexp = "^[\\w\\-. ]+\\.(mp4|mov|avi|mkv)$",
            message = "Invalid file name or unsupported format. Supported: mp4, mov, avi, mkv")
    private String fileName;

    @NotBlank(message = "Content type is required")
    @Pattern(regexp = "^video/(mp4|quicktime|x-msvideo|x-matroska)$",
            message = "Invalid content type. Supported: video/mp4, video/quicktime, video/x-msvideo, video/x-matroska")
    private String contentType;

    @NotNull(message = "File size is required")
    @Min(value = 1, message = "File size must be greater than 0")
    private Long fileSize;
}
