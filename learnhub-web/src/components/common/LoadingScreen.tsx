import './LoadingScreen.css';

const LoadingScreen = () => (
  <div className="loading-screen">
    <div className="spinner-border text-notion" role="status">
      <span className="visually-hidden">Đang tải...</span>
    </div>
  </div>
);

export default LoadingScreen;
