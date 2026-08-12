package com.zh.learnhub_api.dtos.media;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class VideoReorderRequestDTO {
    @NotNull(message = "Id video không được để trống")
    private Long id;

    @NotNull(message = "Vị trí không được để trống")
    @Min(value = 1, message = "Vị trí phải >= 1")
    private Integer position;
}
