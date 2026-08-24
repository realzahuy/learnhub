import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './context/ToastContext';
import { NotificationProvider } from './context/NotificationContext';
import AppRoutes from './routes/AppRoutes';
import ScrollToTop from './components/layouts/ScrollToTop';
import RouteTransition from './components/layouts/RouteTransition';
import TopLoadingBar from './components/common/TopLoadingBar';
import { queryClient } from './query/queryClient';
import './App.css';
import './assets/styles/motion.css';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <NotificationProvider>
              <CartProvider>
                <div className="App">
                  <TopLoadingBar />
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
    </QueryClientProvider>
  );
}

export default App;
