import { Link } from 'react-router-dom';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const NotFoundPage = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <ExclamationTriangleIcon className="h-16 w-16 text-yellow-500 mb-4" />
      <h1 className="text-3xl font-bold text-white mb-2">404 - Page Not Found</h1>
      <p className="text-gray-400 mb-6 text-center max-w-md">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Link to="/" className="btn btn-primary">
        Go to Dashboard
      </Link>
    </div>
  );
};

export default NotFoundPage; 