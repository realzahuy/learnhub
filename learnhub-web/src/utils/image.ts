
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export const validateImageFile = (file: File): string | null => {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return 'Chỉ chấp nhận ảnh JPG, PNG hoặc WebP';
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return `Ảnh vượt quá dung lượng cho phép (tối đa ${MAX_IMAGE_SIZE / (1024 * 1024)} MB)`;
  }
  return null;
};
