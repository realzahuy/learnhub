import './LoadingScreen.css';
import PageSkeleton, { PageSkeletonVariant } from './PageSkeleton';

interface LoadingScreenProps {
  variant?: PageSkeletonVariant;
  count?: number;
}

const LoadingScreen = ({ variant = 'detail', count }: LoadingScreenProps) => (
  <div className="loading-screen" aria-live="polite">
    <PageSkeleton variant={variant} count={count} />
  </div>
);

export default LoadingScreen;
