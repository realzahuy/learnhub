import React, { ChangeEventHandler, ReactNode, RefObject } from 'react';
import { Dropdown, DropdownOption } from '../../common';
import { CourseFormState } from '../../../utils/courseForm';
import { ALLOWED_IMAGE_TYPES } from '../../../utils';

interface CourseInfoFormProps {
  id?: string;
  variant: 'create' | 'edit';
  form: CourseFormState;
  categoryOptions: DropdownOption[];
  currentThumbnail: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onThumbnailChange: ChangeEventHandler<HTMLInputElement>;
  onChange: (field: keyof CourseFormState, value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  identityDisabled?: boolean;
  slugPlaceholder?: string;
  slugHint?: ReactNode;
  identityLockedHint?: ReactNode;
  thumbnailActionLabel?: string;
  thumbnailHint?: ReactNode;
  sideActions?: ReactNode;
}

const CourseInfoForm: React.FC<CourseInfoFormProps> = ({
  id,
  variant,
  form,
  categoryOptions,
  currentThumbnail,
  fileInputRef,
  onThumbnailChange,
  onChange,
  onSubmit,
  disabled = false,
  identityDisabled = false,
  slugPlaceholder,
  slugHint,
  identityLockedHint,
  thumbnailActionLabel = 'Chọn ảnh',
  thumbnailHint,
  sideActions,
}) => {
  const prefix = variant === 'create' ? 'create' : 'course';
  const cardClass = variant === 'create' ? 'course-create-card' : 'course-edit-card';
  const outlineClass = variant === 'create' ? 'btn-course-create-outline' : 'btn-course-edit-outline';
  const thumbClass = variant === 'create' ? 'course-create-thumb' : 'course-edit-thumb';

  return (
    <form
      id={id}
      className="row g-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!disabled) onSubmit();
      }}
      noValidate
    >
      <div className="col-lg-8">
        <div className={cardClass}>
          <div className="mb-3">
            <label className="form-label" htmlFor={`${prefix}-title`}>Tiêu đề</label>
            <input
              id={`${prefix}-title`}
              type="text"
              className="form-control"
              value={form.title}
              onChange={(event) => onChange('title', event.target.value)}
              disabled={disabled}
              maxLength={255}
            />
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor={`${prefix}-slug`}>Đường dẫn (slug)</label>
            <input
              id={`${prefix}-slug`}
              type="text"
              className="form-control"
              value={form.slug}
              onChange={(event) => onChange('slug', event.target.value)}
              placeholder={slugPlaceholder}
              disabled={disabled || identityDisabled}
              maxLength={255}
            />
            {identityDisabled ? identityLockedHint : slugHint}
          </div>

          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label" htmlFor={`${prefix}-category`}>Danh mục</label>
              <Dropdown
                id={`${prefix}-category`}
                className={variant === 'create' ? 'course-create-dropdown' : 'course-edit-dropdown'}
                value={form.categoryId}
                options={categoryOptions}
                onChange={(value) => onChange('categoryId', value)}
                placeholder="-- Chọn danh mục --"
                ariaLabel="Chọn danh mục khóa học"
                disabled={disabled || identityDisabled}
              />
              {identityDisabled && identityLockedHint}
            </div>

            <div className="col-md-6">
              <label className="form-label" htmlFor={`${prefix}-price`}>Giá (VND)</label>
              <input
                id={`${prefix}-price`}
                type="number"
                min={0}
                step={1000}
                className="form-control"
                value={form.price}
                onChange={(event) => onChange('price', event.target.value)}
                disabled={disabled}
              />
              <small className="text-muted">Nhập 0 nếu khóa học miễn phí.</small>
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor={`${prefix}-short-desc`}>Mô tả ngắn</label>
            <textarea
              id={`${prefix}-short-desc`}
              className="form-control"
              rows={2}
              value={form.shortDescription}
              onChange={(event) => onChange('shortDescription', event.target.value)}
              disabled={disabled}
              maxLength={500}
              spellCheck={false}
            />
            <small className="text-muted">{form.shortDescription.length}/500 ký tự</small>
          </div>

          <div className="mb-0">
            <label className="form-label" htmlFor={`${prefix}-desc`}>Mô tả chi tiết</label>
            <textarea
              id={`${prefix}-desc`}
              className="form-control"
              rows={variant === 'create' ? 8 : 10}
              value={form.description}
              onChange={(event) => onChange('description', event.target.value)}
              disabled={disabled}
              spellCheck={false}
            />
          </div>
        </div>
      </div>

      <div className="col-lg-4">
        <div className={`${cardClass}${variant === 'edit' ? ' course-edit-side' : ''}`}>
          <label className="form-label">Ảnh thumbnail</label>
          <div className={thumbClass}>
            {currentThumbnail ? (
              <img src={currentThumbnail} alt={form.title} />
            ) : (
              <div className={`${thumbClass}-empty`}>Chưa có ảnh</div>
            )}
          </div>

          {!disabled && (
            <>
              <button
                type="button"
                className={`${outlineClass} mt-2`}
                onClick={() => fileInputRef.current?.click()}
              >
                {thumbnailActionLabel}
              </button>
              {thumbnailHint}
              <input
                ref={fileInputRef}
                type="file"
                className="d-none"
                accept={ALLOWED_IMAGE_TYPES.join(',')}
                onChange={onThumbnailChange}
              />
            </>
          )}

          {sideActions}
        </div>
      </div>
    </form>
  );
};

export default CourseInfoForm;
