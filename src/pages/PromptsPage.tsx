import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { fetchPrompts } from '@/store/slices/promptSlice';
import { fetchCategories } from '@/store/slices/categorySlice';
import { ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

const PromptsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { prompts, loading: promptsLoading } = useAppSelector((state) => state.prompts);
  const { categories, loading: categoriesLoading } = useAppSelector((state) => state.categories);

  useEffect(() => {
    dispatch(fetchPrompts());
    dispatch(fetchCategories());
  }, [dispatch]);

  // Group prompts by category
  const promptsByCategory = React.useMemo(() => {
    const grouped: Record<string, any[]> = {};
    
    // Initialize with empty arrays for all categories
    categories.forEach(category => {
      grouped[category.id] = [];
    });
    
    // Add uncategorized group
    grouped['uncategorized'] = [];
    
    // Populate with prompts
    prompts.forEach(prompt => {
      if (prompt.categoryId && grouped[prompt.categoryId]) {
        grouped[prompt.categoryId].push(prompt);
      } else {
        grouped['uncategorized'].push(prompt);
      }
    });
    
    return grouped;
  }, [prompts, categories]);

  const handlePromptClick = (promptId: string) => {
    navigate(`/prompts/${promptId}`);
  };

  const getCategoryColor = (color?: string) => {
    return color || 'bg-gray-700'; // Default color if none specified
  };

  // Loading state
  if (promptsLoading || categoriesLoading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Prompts</h1>
        <div className="bg-dark-700 rounded-lg p-6 flex justify-center">
          <p className="text-gray-300">Loading prompts and categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Prompts by Category</h1>
      
      {/* Kanban-style columns with horizontal scroll */}
      <div className="overflow-x-auto pb-4">
        <div className="flex space-x-4" style={{ minWidth: 'max-content' }}>
          
          {/* Render each category as a column */}
          {categories.length > 0 && categories.map((category) => (
            <div key={category.id} className="w-80 flex-shrink-0">
              <div className={`${getCategoryColor(category.color)} rounded-t-lg p-3`}>
                <h2 className="font-bold text-md">{category.name}</h2>
                {category.description && (
                  <p className="text-xs text-gray-300 mt-1">{category.description}</p>
                )}
              </div>
              
              {/* Scrollable prompt list for the category */}
              <div className="bg-dark-700 rounded-b-lg p-3 max-h-[calc(100vh-240px)] overflow-y-auto">
                {promptsByCategory[category.id]?.length > 0 ? (
                  promptsByCategory[category.id].map((prompt) => (
                    <div 
                      key={prompt.id}
                      className="bg-dark-600 p-2 rounded-lg mb-2 cursor-pointer hover:bg-dark-500 transition-colors"
                      onClick={() => handlePromptClick(prompt.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="w-full">
                          {prompt.description && (
                            <p className="text-xs text-gray-300 font-medium">{prompt.description}</p>
                          )}
                          {prompt.content && (
                            <p className="text-xs text-gray-400 mt-1 line-clamp-3">
                              {prompt.content}
                            </p>
                          )}
                        </div>
                        <ClipboardDocumentIcon className="h-4 w-4 text-gray-400 ml-2 flex-shrink-0" />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-sm italic">No prompts in this category</p>
                )}
              </div>
            </div>
          ))}
          
          {/* Uncategorized prompts column */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-gray-700 rounded-t-lg p-3">
              <h2 className="font-bold text-md">Uncategorized</h2>
            </div>
            
            <div className="bg-dark-700 rounded-b-lg p-3 max-h-[calc(100vh-240px)] overflow-y-auto">
              {promptsByCategory['uncategorized']?.length > 0 ? (
                promptsByCategory['uncategorized'].map((prompt) => (
                  <div 
                    key={prompt.id}
                    className="bg-dark-600 p-2 rounded-lg mb-2 cursor-pointer hover:bg-dark-500 transition-colors"
                    onClick={() => handlePromptClick(prompt.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-full">
                        {prompt.description && (
                          <p className="text-xs text-gray-300 font-medium">{prompt.description}</p>
                        )}
                        {prompt.content && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-3">
                            {prompt.content}
                          </p>
                        )}
                      </div>
                      <ClipboardDocumentIcon className="h-4 w-4 text-gray-400 ml-2 flex-shrink-0" />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-sm italic">No uncategorized prompts</p>
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default PromptsPage; 