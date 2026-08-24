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
    @NotBlank(message = "Tiêu đề không được để trống")
    @Size(min = 1, max = 255, message = "Tiêu đề phải có từ 1 đến 255 ký tự")
    private String title;

    @NotNull(message = "Vị trí không được để trống")
    @Min(value = 1, message = "Vị trí phải từ 1 trở lên")
    private Integer position;

    @NotBlank(message = "Tên tệp không được để trống")
    @Pattern(regexp = "^[\\w\\-. ]+\\.(mp4|mov|avi|mkv)$",
            message = "Tên tệp không hợp lệ hoặc định dạng không được hỗ trợ. Định dạng hỗ trợ: mp4, mov, avi, mkv")
    private String fileName;

    @NotBlank(message = "Loại nội dung không được để trống")
    @Pattern(regexp = "^video/(mp4|quicktime|x-msvideo|x-matroska)$",
            message = "Loại nội dung không hợp lệ. Loại được hỗ trợ: video/mp4, video/quicktime, video/x-msvideo, video/x-matroska")
    private String contentType;

    @NotNull(message = "Kích thước tệp không được để trống")
    @Min(value = 1, message = "Kích thước tệp phải lớn hơn 0")
    private Long fileSize;
}
