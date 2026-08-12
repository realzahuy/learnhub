import { useLocation } from 'react-router-dom';
import ForgotPasswordForm from '../../components/auth/ForgotPasswordForm';
import { ROUTE_PATHS } from '../../routes/paths';
import './AuthPage.css';

const ForgotPasswordPage = () => {
  const location = useLocation();
  const state = location.state as { from?: string } | null;

  return (
    <div className="auth-page">

      <main className="auth-page-main">
        <ForgotPasswordForm
          backTo={state?.from ?? ROUTE_PATHS.login}
          loginTo={ROUTE_PATHS.login}
        />
      </main>

    </div>
  );
};

export default ForgotPasswordPage;
