import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { 
  fetchPromptById, 
  updatePrompt, 
  deletePrompt, 
  clearCurrentPrompt 
} from '@/store/slices/promptSlice';
import { fetchCategories } from '@/store/slices/categorySlice';
import { 
  ArrowLeftIcon, 
  PencilIcon, 
  TrashIcon, 
  CheckIcon, 
  XMarkIcon,
  ClipboardDocumentIcon,
  ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import * as Yup from 'yup';
import { useFormik } from 'formik';

// Validation schema
const promptSchema = Yup.object({
  title: Yup.string().required('Title is required'),
  content: Yup.string().required('Content is required'),
  description: Yup.string(),
  categoryId: Yup.string(),
});

const PromptDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentPrompt, loading, error } = useAppSelector((state) => state.prompts);
  const { categories } = useAppSelector((state) => state.categories);
  
  // Extra debugging
  console.log('🔍 PromptDetailPage rendering with:', { 
    id, 
    currentPrompt, 
    loadingState: loading, 
    errorState: error,
    categoriesLoaded: categories.length 
  });

  const [isEditing, setIsEditing] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  
  useEffect(() => {
    if (id) {
      dispatch(fetchPromptById(id));
      dispatch(fetchCategories());
    }
    
    // Cleanup when component unmounts
    return () => {
      dispatch(clearCurrentPrompt());
    };
  }, [dispatch, id]);
  
  // Debug the current prompt state
  useEffect(() => {
    console.log('🔍 Current prompt from Redux:', currentPrompt);
    if (currentPrompt) {
      console.log('📅 Dates in currentPrompt:', {
        createdAt: currentPrompt.createdAt,
        updatedAt: currentPrompt.updatedAt,
        createdAtType: typeof currentPrompt.createdAt,
        updatedAtType: typeof currentPrompt.updatedAt
      });
    }
  }, [currentPrompt]);
  
  // Initialize formik
  const formik = useFormik({
    initialValues: {
      title: currentPrompt?.title || '',
      content: currentPrompt?.content || '',
      description: currentPrompt?.description || '',
      categoryId: currentPrompt?.categoryId || '',
    },
    validationSchema: promptSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      try {
        if (id) {
          await dispatch(updatePrompt({ 
            id, 
            promptData: {
              id,
              title: values.title,
              content: values.content,
              description: values.description,
              categoryId: values.categoryId
            }
          })).unwrap();
          
          setIsEditing(false);
          toast.success('Prompt updated successfully');
        }
      } catch (error) {
        console.error('Failed to update prompt:', error);
        toast.error('Failed to update prompt');
      }
    },
  });
  
  const handleDelete = async () => {
    try {
      if (id) {
        await dispatch(deletePrompt(id)).unwrap();
        toast.success('Prompt deleted successfully');
        navigate('/prompts');
      }
    } catch (error) {
      console.error('Failed to delete prompt:', error);
      toast.error('Failed to delete prompt');
    }
  };
  
  const handleCopyToClipboard = async () => {
    if (currentPrompt?.content) {
      try {
        await navigator.clipboard.writeText(currentPrompt.content);
        setCopied(true);
        toast.success('Copied to clipboard');
        
        // Reset copied status after 2 seconds
        setTimeout(() => {
          setCopied(false);
        }, 2000);
      } catch (error) {
        console.error('Failed to copy:', error);
        toast.error('Failed to copy to clipboard');
      }
    }
  };
  
  // Handle cancel edit
  const handleCancelEdit = () => {
    setIsEditing(false);
    formik.resetForm();
  };
  
  // Find category name from ID
  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return 'Uncategorized';
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Uncategorized';
  };
  
  // Get category color
  const getCategoryColor = (categoryId?: string) => {
    if (!categoryId) return 'bg-gray-700';
    const category = categories.find(cat => cat.id === categoryId);
    return category?.color ? category.color : 'bg-gray-700';
  };
  
  // Format date function to handle potentially invalid dates
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    
    try {
      // Try to parse the date and format it
      const date = new Date(dateString);
      
      // Check if date is valid before formatting
      if (isNaN(date.getTime())) {
        console.warn('Invalid date detected:', dateString);
        return 'Unknown';
      }
      
      return date.toLocaleString();
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return 'Unknown';
    }
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Prompt Details</h1>
        <div className="bg-dark-700 rounded-lg p-6 flex justify-center">
          <p className="text-gray-300">Loading prompt details...</p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Prompt Details</h1>
        <div className="bg-dark-700 rounded-lg p-6">
          <p className="text-red-400">Error loading prompt: {error}</p>
          <button 
            onClick={() => navigate('/prompts')}
            className="mt-4 px-4 py-2 bg-dark-600 hover:bg-dark-500 rounded-md flex items-center text-sm"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Prompts
          </button>
        </div>
      </div>
    );
  }
  
  // Not found state
  if (!currentPrompt) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Prompt Details</h1>
        <div className="bg-dark-700 rounded-lg p-6">
          <p className="text-gray-300">Prompt not found</p>
          <button 
            onClick={() => navigate('/prompts')}
            className="mt-4 px-4 py-2 bg-dark-600 hover:bg-dark-500 rounded-md flex items-center text-sm"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Prompts
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-6">
      {/* Header with back button and actions */}
      <div className="flex justify-between items-center mb-6">
        <button 
          onClick={() => navigate('/prompts')}
          className="px-4 py-2 bg-dark-700 hover:bg-dark-600 rounded-md flex items-center text-sm"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Prompts
        </button>
        
        <div className="flex space-x-2">
          {!isEditing && (
            <>
              <button 
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md flex items-center text-sm"
              >
                <PencilIcon className="h-4 w-4 mr-2" />
                Edit
              </button>
              
              <button 
                onClick={() => setDeleteConfirmOpen(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md flex items-center text-sm"
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                Delete
              </button>
            </>
          )}
          
          {isEditing && (
            <>
              <button 
                onClick={() => formik.handleSubmit()}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md flex items-center text-sm"
                type="button"
              >
                <CheckIcon className="h-4 w-4 mr-2" />
                Save
              </button>
              
              <button 
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md flex items-center text-sm"
              >
                <XMarkIcon className="h-4 w-4 mr-2" />
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Main content */}
      <div className="bg-dark-700 rounded-lg p-6">
        {/* Title */}
        <div className="mb-6">
          {isEditing ? (
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                name="title"
                type="text"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.title}
                className="w-full rounded-md bg-dark-600 border-dark-500 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-white"
              />
              {formik.touched.title && formik.errors.title && (
                <div className="mt-1 text-sm text-red-500">{formik.errors.title}</div>
              )}
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold">{currentPrompt.title || 'Untitled Prompt'}</h1>
              {!currentPrompt.title && (
                <p className="text-sm text-red-400">Title missing from prompt data</p>
              )}
            </>
          )}
        </div>
        
        {/* Category badge */}
        <div className="mb-6">
          {isEditing ? (
            <div>
              <label htmlFor="categoryId" className="block text-sm font-medium text-gray-300 mb-1">
                Category
              </label>
              <select
                id="categoryId"
                name="categoryId"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.categoryId}
                className="rounded-md bg-dark-600 border-dark-500 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-white"
              >
                <option value="">Uncategorized</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div 
              className="inline-block px-3 py-1 rounded-full text-sm"
              style={{ backgroundColor: getCategoryColor(currentPrompt.categoryId) }}
            >
              {getCategoryName(currentPrompt.categoryId)}
            </div>
          )}
        </div>
        
        {/* Description */}
        <div className="mb-6">
          {isEditing ? (
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
                Description (Optional)
              </label>
              <input
                id="description"
                name="description"
                type="text"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.description}
                className="w-full rounded-md bg-dark-600 border-dark-500 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-white"
              />
            </div>
          ) : (
            currentPrompt.description && (
              <p className="text-gray-300">{currentPrompt.description}</p>
            )
          )}
        </div>
        
        {/* Content with copy button */}
        <div className="relative">
          <div className="absolute top-2 right-2">
            <button 
              onClick={handleCopyToClipboard}
              className="p-2 rounded-md bg-dark-600 hover:bg-dark-500 text-gray-300 hover:text-white"
              title="Copy to clipboard"
            >
              {copied ? (
                <ClipboardDocumentCheckIcon className="h-5 w-5 text-green-500" />
              ) : (
                <ClipboardDocumentIcon className="h-5 w-5" />
              )}
            </button>
          </div>
          
          {isEditing ? (
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-300 mb-1">
                Content <span className="text-red-500">*</span>
              </label>
              <textarea
                id="content"
                name="content"
                rows={10}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.content}
                className="w-full rounded-md bg-dark-600 border-dark-500 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-white"
              />
              {formik.touched.content && formik.errors.content && (
                <div className="mt-1 text-sm text-red-500">{formik.errors.content}</div>
              )}
            </div>
          ) : (
            <>
              <div className="p-4 bg-dark-800 rounded-md whitespace-pre-wrap font-mono text-sm">
                {currentPrompt.content || 'No content available'}
              </div>
              {!currentPrompt.content && (
                <p className="text-sm text-red-400 mt-2">Content missing from prompt data</p>
              )}
            </>
          )}
        </div>
        
        {/* Metadata */}
        <div className="mt-6 text-xs text-gray-400">
          <p>Created: {formatDate(currentPrompt.createdAt)}</p>
          <p>Last Updated: {formatDate(currentPrompt.updatedAt)}</p>
        </div>
      </div>
      
      {/* Delete confirmation dialog */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-dark-700 rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Confirm Delete</h2>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete the prompt "{currentPrompt.title}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptDetailPage; 