import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-gray-200">404</h1>
        <h2 className="text-4xl font-bold text-gray-900 mt-4">Page not found</h2>
        <p className="text-gray-600 mt-2">Sorry, we couldn't find the page you're looking for.</p>
        <Link
          to="/dashboard"
          className="mt-6 inline-block px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
