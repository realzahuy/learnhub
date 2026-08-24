import { InstructorCourse, COURSE_STATUS_LABELS } from '../../types/course.types';
import { formatPrice } from '../../utils';
import { CourseThumbnail } from '../../components/common';

const AdminCourseTable = ({
  courses,
  onSelect,
}: {
  courses: InstructorCourse[];
  onSelect: (course: InstructorCourse) => void;
}) => (
  <div className="admin-table-wrap motion-content-enter">
    <table className="admin-table">
      <thead>
        <tr>
          <th className="admin-table-thumb-col">Ảnh</th>
          <th>Tiêu đề</th>
          <th>Giảng viên</th>
          <th>Danh mục</th>
          <th>Giá</th>
          <th>Trạng thái</th>
        </tr>
      </thead>
      <tbody>
        {courses.map((course) => (
          <tr
            key={course.id}
            className="admin-table-row"
            role="button"
            tabIndex={0}
            onClick={() => onSelect(course)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(course);
              }
            }}
            title="Bấm để xem chi tiết"
          >
            <td>
              <div className="admin-table-thumb">
                <CourseThumbnail
                  src={course.thumbnail}
                  alt={course.title}
                  placeholder={<div className="admin-table-thumb-empty" />}
                />
              </div>
            </td>
            <td className="admin-table-title"><span className="admin-table-title-text">{course.title}</span></td>
            <td>{course.instructorName}</td>
            <td>{course.categoryName}</td>
            <td className="admin-table-price">{formatPrice(course.price)}</td>
            <td>
              <span className={`admin-course-status admin-course-status-${course.status.toLowerCase()}`}>
                {COURSE_STATUS_LABELS[course.status]}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default AdminCourseTable;
