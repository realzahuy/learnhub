package com.zh.learnhub_api.services.media.cloudinary;

import com.cloudinary.Cloudinary;
import com.cloudinary.Transformation;
import com.cloudinary.utils.ObjectUtils;
import com.zh.learnhub_api.configs.AppProperties;
import com.zh.learnhub_api.exceptions.ImageUploadException;
import com.zh.learnhub_api.services.media.ImageStorageService;
import com.zh.learnhub_api.services.media.ImageUploadResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Arrays;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CloudinaryImageStorageService implements ImageStorageService {

    private final Cloudinary cloudinary;
    private final AppProperties.Cloudinary cloudinaryProperties;
    private final AppProperties.Image imageProperties;

    @Override
    public ImageUploadResult uploadAvatar(MultipartFile file, Long userId) {
        byte[] bytes = readAndValidate(file);

        String assetFolder = avatarFolder();
        String publicId = avatarPublicId(userId);

        Transformation<?> transformation = new Transformation<>()
                .width(imageProperties.avatar().width())
                .height(imageProperties.avatar().height())
                .crop("fill")
                .gravity("face")
                .quality("auto");

        return upload(bytes, assetFolder, publicId, transformation);
    }

    @Override
    public ImageUploadResult uploadCourseThumbnail(MultipartFile file, Long courseId) {
        byte[] bytes = readAndValidate(file);

        String assetFolder = thumbnailFolder();
        String publicId = thumbnailPublicId(courseId);

        Transformation<?> transformation = new Transformation<>()
                .width(imageProperties.thumbnail().width())
                .height(imageProperties.thumbnail().height())
                .crop("fill")
                .gravity("auto")
                .quality("auto");

        return upload(bytes, assetFolder, publicId, transformation);
    }

    @Override
    public void deleteCourseThumbnail(Long courseId) {
        destroy(thumbnailPublicId(courseId));
    }

    private String avatarFolder() {
        return cloudinaryProperties.folder().root() + "/" + cloudinaryProperties.folder().avatar();
    }

    private String thumbnailFolder() {
        return cloudinaryProperties.folder().root() + "/" + cloudinaryProperties.folder().thumbnail();
    }

    private String avatarPublicId(Long userId) {
        return String.format("%s/user_%d", avatarFolder(), userId);
    }

    private String thumbnailPublicId(Long courseId) {
        return String.format("%s/course_%d", thumbnailFolder(), courseId);
    }

    private void destroy(String publicId) {
        try {
            Map<?, ?> result = cloudinary.uploader().destroy(publicId, ObjectUtils.asMap("invalidate", true));
            log.info("Xóa ảnh Cloudinary {} -> {}", publicId, result.get("result"));
        } catch (IOException | RuntimeException e) {

            log.error("Không xóa được ảnh trên Cloudinary: {}", publicId, e);
        }
    }

    private ImageUploadResult upload(byte[] bytes, String assetFolder, String publicId,
                                        Transformation<?> transformation) {
        Map<?, ?> result;

        try {
            result = cloudinary.uploader().upload(bytes, ObjectUtils.asMap(
                    "public_id", publicId,

                    "asset_folder", assetFolder,
                    "resource_type", "image",
                    "overwrite", true,
                    "invalidate", true,
                    "transformation", transformation
            ));
        } catch (IOException | RuntimeException e) {
            log.error("Upload ảnh lên Cloudinary thất bại: {}", publicId, e);
            throw new ImageUploadException("Không thể tải ảnh lên. Vui lòng thử lại sau.", e);
        }

        String secureUrl = (String) result.get("secure_url");
        String returnedPublicId = (String) result.get("public_id");

        if (secureUrl == null) {
            throw new ImageUploadException("Cloudinary không trả về URL ảnh");
        }

        log.info("Upload ảnh thành công: {}", returnedPublicId);
        return new ImageUploadResult(secureUrl, returnedPublicId);
    }

    private byte[] readAndValidate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Vui lòng chọn ảnh để tải lên");
        }

        if (file.getSize() > imageProperties.maxSize()) {
            throw new IllegalArgumentException(
                    String.format("Ảnh vượt quá dung lượng cho phép (tối đa %d MB)", imageProperties.maxSize() / (1024 * 1024))
            );
        }

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new ImageUploadException("Không đọc được file ảnh", e);
        }

        String actualType = detectMimeType(bytes);
        if (actualType == null || !allowedTypes().contains(actualType)) {
            throw new IllegalArgumentException(
                    "Định dạng ảnh không được hỗ trợ. Chỉ chấp nhận: " + imageProperties.allowedTypes()
            );
        }

        return bytes;
    }

    private Set<String> allowedTypes() {
        return Arrays.stream(imageProperties.allowedTypes().split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toSet());
    }

    private String detectMimeType(byte[] b) {

        if (b.length >= 3
                && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) {
            return "image/jpeg";
        }

        if (b.length >= 8
                && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G'
                && b[4] == 0x0D && b[5] == 0x0A && b[6] == 0x1A && b[7] == 0x0A) {
            return "image/png";
        }

        if (b.length >= 12
                && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') {
            return "image/webp";
        }

        return null;
    }
}
