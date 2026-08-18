import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROUTE_PATHS } from '../../routes/paths';
import './HomePage.css';

const HomePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleExploreCourses = () => {
    navigate(ROUTE_PATHS.courses);
  };

  return (
    <div className="home-page">
      { }

      <main className="hero-section">
        <div className="container">
          <div className="row align-items-center min-vh-80">
            <div className="col-lg-6">
              <h1 className="display-3 fw-bold mb-4">
                Chào mừng đến với <span className="text-notion">learn</span><span className="text-dark">hub</span>
              </h1>
              <p className="lead text-muted mb-4">
                Nền tảng học trực tuyến với các khóa học chất lượng cao.
                Học bất cứ lúc nào với đội ngũ giảng viên hàng đầu.
              </p>
              <div className="d-flex gap-3">
                <button
                  className="btn btn-notion btn-lg px-4"
                  onClick={handleExploreCourses}
                >
                  Khám phá khóa học
                </button>
                {!isAuthenticated && (
                  <button
                    className="btn btn-outline-notion home-register-button btn-lg px-4"
                    onClick={() => navigate(ROUTE_PATHS.register)}
                  >
                    Đăng ký ngay
                  </button>
                )}
              </div>
            </div>
            <div className="col-lg-6 text-center">
              <div className="hero-illustration">
                <svg viewBox="0 0 500 400" className="w-100">
                  { }
                  <circle cx="250" cy="200" r="150" fill="#E8F2FF" />
                  <rect x="150" y="120" width="200" height="160" rx="10" fill="#2383E2" />
                  <rect x="170" y="140" width="160" height="100" rx="5" fill="white" />
                  <circle cx="250" cy="190" r="25" fill="#2383E2" />
                  <polygon points="250,175 240,200 260,200" fill="white" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </main>

    </div>
  );
};

export default HomePage;
