import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { searchPrompts, clearSearchResults } from '@/store/slices/promptSlice';
import { toggleSearch } from '@/store/slices/uiSlice';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

const SearchBar = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { searchResults, loading } = useAppSelector((state) => state.prompts);

  useEffect(() => {
    // Focus the input when the search bar is opened
    if (inputRef.current) {
      inputRef.current.focus();
    }

    // Clean up search results when component unmounts
    return () => {
      dispatch(clearSearchResults());
    };
  }, [dispatch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      dispatch(searchPrompts(query.trim()));
    }
  };

  const handleResultClick = (id: string) => {
    navigate(`/prompts/${id}`);
    dispatch(toggleSearch());
  };

  const handleClose = () => {
    dispatch(toggleSearch());
  };

  return (
    <div className="absolute inset-x-0 top-0 z-10 bg-dark-800 border-b border-dark-700 shadow-lg">
      <div className="container mx-auto p-4">
        <div className="relative">
          <form onSubmit={handleSearch}>
            <div className="flex items-center">
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  className="input pl-10 pr-10 py-3 w-full"
                  placeholder="Search prompts..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query && (
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setQuery('')}
                  >
                    <XMarkIcon className="h-5 w-5 text-gray-400" />
                  </button>
                )}
              </div>
              <button
                type="button"
                className="ml-2 btn btn-secondary"
                onClick={handleClose}
              >
                Cancel
              </button>
            </div>
          </form>

          {/* Search Results */}
          {query && (
            <div className="absolute mt-2 w-full bg-dark-800 rounded-md shadow-lg border border-dark-700 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
                </div>
              ) : searchResults.length > 0 ? (
                <ul className="py-2">
                  {searchResults.map((prompt) => (
                    <li key={prompt.id}>
                      <button
                        className="w-full text-left px-4 py-2 hover:bg-dark-700 focus:outline-none focus:bg-dark-700"
                        onClick={() => handleResultClick(prompt.id)}
                      >
                        <div className="font-medium text-white">{prompt.title}</div>
                        <div className="text-sm text-gray-400 truncate">
                          {prompt.description || prompt.content.substring(0, 100)}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : query.length > 0 ? (
                <div className="p-4 text-center text-gray-400">
                  No results found for "{query}"
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchBar; 