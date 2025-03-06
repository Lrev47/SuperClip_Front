import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { fetchPrompts } from '@/store/slices/promptSlice';
import { openModal } from '@/store/slices/uiSlice';
import { PlusIcon, ClipboardDocumentIcon, FolderIcon, StarIcon } from '@heroicons/react/24/outline';

const DashboardPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { prompts, loading } = useAppSelector((state) => state.prompts);
  const { categories } = useAppSelector((state) => state.categories);
  const { user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    dispatch(fetchPrompts());
  }, [dispatch]);

  // Get counts for dashboard stats
  const totalPrompts = prompts.length;
  const totalCategories = categories.length;
  const favoritePrompts = prompts.filter((prompt) => prompt.isFavorite).length;
  
  // Get recent prompts
  const recentPrompts = [...prompts]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const handleCreatePrompt = () => {
    dispatch(openModal('createPrompt'));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <button
          onClick={handleCreatePrompt}
          className="btn btn-primary flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          New Prompt
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stats Cards */}
        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-primary-900/50 text-primary-400">
              <ClipboardDocumentIcon className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-semibold text-white">Total Prompts</h2>
              <p className="text-3xl font-bold text-primary-400">{totalPrompts}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-900/50 text-purple-400">
              <FolderIcon className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-semibold text-white">Categories</h2>
              <p className="text-3xl font-bold text-purple-400">{totalCategories}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-900/50 text-yellow-400">
              <StarIcon className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-semibold text-white">Favorites</h2>
              <p className="text-3xl font-bold text-yellow-400">{favoritePrompts}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Prompts */}
      <div className="card">
        <div className="p-4 border-b border-dark-700">
          <h2 className="text-lg font-semibold text-white">Recent Prompts</h2>
        </div>
        <div className="divide-y divide-dark-700">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
              <p className="mt-2 text-gray-400">Loading prompts...</p>
            </div>
          ) : recentPrompts.length > 0 ? (
            recentPrompts.map((prompt) => (
              <div
                key={prompt.id}
                className="p-4 hover:bg-dark-700 cursor-pointer transition-colors"
                onClick={() => navigate(`/prompts/${prompt.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-white">{prompt.title}</h3>
                    <p className="text-sm text-gray-400 mt-1 line-clamp-1">
                      {prompt.description || (prompt.content ? prompt.content.substring(0, 100) : 'No content')}
                    </p>
                  </div>
                  <button
                    className="p-2 rounded-md hover:bg-dark-600 focus:outline-none"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.electron.copyToClipboard(prompt.content);
                    }}
                    title="Copy to clipboard"
                  >
                    <ClipboardDocumentIcon className="h-5 w-5 text-gray-400" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-400">
              <p>No prompts found. Create your first prompt to get started!</p>
              <button
                onClick={handleCreatePrompt}
                className="btn btn-primary mt-4"
              >
                Create Prompt
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Welcome Message */}
      <div className="card p-6 bg-gradient-to-r from-dark-800 to-primary-900/30">
        <h2 className="text-xl font-bold text-white">Welcome, {user?.name}!</h2>
        <p className="mt-2 text-gray-300">
          SuperClip helps you organize and manage your AI prompts and command snippets.
          Create categories, add prompts, and access them quickly from anywhere.
        </p>
      </div>
    </div>
  );
};

export default DashboardPage; 