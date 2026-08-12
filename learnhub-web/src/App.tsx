import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './context/ToastContext';
import { NotificationProvider } from './context/NotificationContext';
import AppRoutes from './routes/AppRoutes';
import ScrollToTop from './components/layouts/ScrollToTop';
import RouteTransition from './components/layouts/RouteTransition';
import './App.css';
import './assets/styles/motion.css';

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <NotificationProvider>
            <CartProvider>
              <div className="App">
                <RouteTransition>
                  <AppRoutes />
                </RouteTransition>
                <ScrollToTop />
              </div>
            </CartProvider>
          </NotificationProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
