import { InstructorCourse } from '../types/course.types';

export interface CourseFormState {
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  price: string;
  categoryId: string;
}

export const EMPTY_COURSE_FORM: CourseFormState = {
  title: '',
  slug: '',
  shortDescription: '',
  description: '',
  price: '0',
  categoryId: '',
};

export const toCourseForm = (course: InstructorCourse): CourseFormState => ({
  title: course.title ?? '',
  slug: course.slug ?? '',
  shortDescription: course.shortDescription ?? '',
  description: course.description ?? '',
  price: course.price != null ? String(course.price) : '0',
  categoryId: course.categoryId != null ? String(course.categoryId) : '',
});

export const validateCourseForm = (form: CourseFormState): string | null => {
  if (!form.title.trim()) return 'Tiêu đề không được để trống';
  if (form.title.length > 255) return 'Tiêu đề không được quá 255 ký tự';
  if (!form.shortDescription.trim()) return 'Mô tả ngắn không được để trống';
  if (form.shortDescription.length > 500) return 'Mô tả ngắn không được quá 500 ký tự';
  if (!form.description.trim()) return 'Mô tả chi tiết không được để trống';
  if (!form.categoryId) return 'Vui lòng chọn danh mục';
  const price = Number(form.price);
  if (Number.isNaN(price) || price < 0) return 'Giá phải là số lớn hơn hoặc bằng 0';
  return null;
};
