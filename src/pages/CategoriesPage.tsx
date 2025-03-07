import React, { useEffect, useState, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { 
  fetchCategories, 
  createCategory, 
  updateCategory, 
  deleteCategory 
} from '@/store/slices/categorySlice';
import { fetchPrompts } from '@/store/slices/promptSlice';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  FolderIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ClipboardDocumentIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import * as Yup from 'yup';
import { useFormik } from 'formik';
import Modal from '@/components/ui/Modal';
import { Category } from '@/store/slices/categorySlice';
import { closeModal, openModal } from '@/store/slices/uiSlice';

// Form validation schemas
const categorySchema = Yup.object({
  name: Yup.string().required('Category name is required'),
  description: Yup.string(),
  color: Yup.string(),
  parentId: Yup.string()
});

const CategoriesPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { categories, loading: categoriesLoading } = useAppSelector((state) => state.categories);
  const { prompts, loading: promptsLoading } = useAppSelector((state) => state.prompts);
  const { modalOpen } = useAppSelector((state) => state.ui);
  
  // State for managing expanded categories
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  
  // State for category operations
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  
  // Set the current category and expand category in the UI when ID changes
  useEffect(() => {
    if (id && categories.length > 0) {      
      // Create a new expanded state object without referencing the current state
      const newExpandedState: Record<string, boolean> = {};
      
      // Find and expand the current category
      newExpandedState[id] = true;
      
      // Find and expand all parent categories
      let parentId = categories.find(cat => cat.id === id)?.parentId;
      while (parentId) {
        newExpandedState[parentId] = true;
        parentId = categories.find(cat => cat.id === parentId)?.parentId;
      }
      
      // Use a functional update to avoid dependency on expandedCategories
      setExpandedCategories(prevState => ({
        ...prevState,
        ...newExpandedState
      }));
    }
  }, [id, categories]); // Remove expandedCategories from dependencies
  
  // Fetch categories and prompts on component mount
  useEffect(() => {
    dispatch(fetchCategories());
    dispatch(fetchPrompts());
  }, [dispatch]);
  
  // Function to toggle category expansion
  const toggleCategoryExpand = (categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };
  
  // Create formik form for category operations
  const formik = useFormik({
    initialValues: {
      name: currentCategory?.name || '',
      description: currentCategory?.description || '',
      color: currentCategory?.color || '#6366F1',
      parentId: currentCategory?.parentId || ''
    },
    validationSchema: categorySchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      try {
        if (currentCategory?.id) {
          // Update existing category
          await dispatch(updateCategory({
            id: currentCategory.id,
            categoryData: values
          })).unwrap();
          toast.success('Category updated successfully');
        } else {
          // Create new category
          await dispatch(createCategory(values)).unwrap();
          toast.success('Category created successfully');
        }
        
        handleCloseModal();
      } catch (error) {
        console.error('Failed to save category:', error);
        toast.error('Failed to save category');
      }
    }
  });
  
  // Handle opening modal for creating/editing categories
  const handleOpenCreateModal = (parentId?: string) => {
    setCurrentCategory(null);
    formik.resetForm();
    
    if (parentId) {
      console.log(`🔍 Setting parent ID for new subcategory: ${parentId}`);
      // Set a slight delay to ensure the form is reset before setting the parent ID
      setTimeout(() => {
        formik.setFieldValue('parentId', parentId);
        console.log('🔍 Form values after setting parentId:', formik.values);
      }, 0);
    } else {
      console.log('🔍 Creating a top-level category (no parent)');
      // Explicitly set parentId to empty string for top-level categories
      formik.setFieldValue('parentId', '');
    }
    
    dispatch(openModal('createCategory'));
  };
  
  const handleOpenEditModal = (category: Category) => {
    setCurrentCategory(category);
    dispatch(openModal('editCategory'));
  };
  
  const handleCloseModal = () => {
    setCurrentCategory(null);
    formik.resetForm();
    dispatch(closeModal('createCategory'));
    dispatch(closeModal('editCategory'));
  };
  
  // Handle deleting categories
  const handleConfirmDelete = () => {
    if (currentCategory?.id) {
      dispatch(deleteCategory(currentCategory.id))
        .unwrap()
        .then(() => {
          toast.success('Category deleted successfully');
          setDeleteConfirmOpen(false);
          setCurrentCategory(null);
        })
        .catch((error) => {
          console.error('Failed to delete category:', error);
          toast.error('Failed to delete category');
        });
    }
  };
  
  const handleDeleteClick = (category: Category) => {
    setCurrentCategory(category);
    setDeleteConfirmOpen(true);
  };
  
  // Navigation to prompt details
  const handlePromptClick = (promptId: string) => {
    navigate(`/prompts/${promptId}`);
  };
  
  // Build hierarchical category structure
  const categoryHierarchy = useMemo(() => {
    // Root categories (no parent)
    const rootCategories = categories.filter(category => !category.parentId);
    
    // Map of parent ID to child categories
    const childrenMap: Record<string, Category[]> = {};
    
    // Organize children by parent ID
    categories.forEach(category => {
      if (category.parentId) {
        if (!childrenMap[category.parentId]) {
          childrenMap[category.parentId] = [];
        }
        childrenMap[category.parentId].push(category);
      }
    });
    
    return { rootCategories, childrenMap };
  }, [categories]);
  
  // Group prompts by category
  const promptsByCategory = useMemo(() => {
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
  
  const getCategoryColor = (colorHex?: string) => {
    // If no color provided, return a default CSS class
    if (!colorHex) return 'bg-gray-700'; 
    
    // If color is provided as a hex, return it as inline style
    return colorHex;
  };
  
  // Recursive component to render a category and its subcategories
  const CategoryItem = ({ category, depth = 0, childrenMap }: { category: Category, depth?: number, childrenMap: Record<string, Category[]> }) => {
    const children = childrenMap[category.id] || [];
    const hasChildren = children.length > 0;
    const isExpanded = expandedCategories[category.id] || false;
    const categoryPrompts = promptsByCategory[category.id] || [];
    
    return (
      <div className="mb-3">
        {/* Category header */}
        <div 
          className="flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-dark-600"
          style={{ marginLeft: `${depth * 16}px` }}
        >
          <div 
            className="flex items-center" 
            onClick={() => toggleCategoryExpand(category.id)}
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDownIcon className="h-4 w-4 mr-2 text-gray-400" />
              ) : (
                <ChevronRightIcon className="h-4 w-4 mr-2 text-gray-400" />
              )
            ) : (
              <FolderIcon className="h-4 w-4 mr-2 text-gray-400" />
            )}
            
            <div 
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: getCategoryColor(category.color) }}
            />
            
            <span className="font-medium">{category.name}</span>
            
            {category.description && (
              <span className="ml-2 text-xs text-gray-400">{category.description}</span>
            )}
          </div>
          
          <div className="flex space-x-2">
            <button 
              onClick={() => handleOpenCreateModal(category.id)}
              className="p-1 rounded hover:bg-dark-500"
              title="Add subcategory"
            >
              <PlusIcon className="h-4 w-4 text-gray-400" />
            </button>
            
            <button 
              onClick={() => handleOpenEditModal(category)}
              className="p-1 rounded hover:bg-dark-500"
              title="Edit category"
            >
              <PencilIcon className="h-4 w-4 text-gray-400" />
            </button>
            
            <button 
              onClick={() => handleDeleteClick(category)}
              className="p-1 rounded hover:bg-dark-500"
              title="Delete category"
            >
              <TrashIcon className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        </div>
        
        {/* Subcategories and prompts */}
        {isExpanded && (
          <div className="ml-6">
            {/* Render subcategories */}
            {children.length > 0 && (
              <div className="mt-2">
                {children.map(childCategory => (
                  <CategoryItem 
                    key={childCategory.id}
                    category={childCategory}
                    depth={depth + 1}
                    childrenMap={childrenMap}
                  />
                ))}
              </div>
            )}
            
            {/* Render prompts in this category */}
            {categoryPrompts.length > 0 && (
              <div className="mt-2 pl-4">
                <h3 className="text-xs text-gray-400 mb-2">Prompts in this category:</h3>
                {categoryPrompts.map(prompt => (
                  <div
                    key={prompt.id}
                    className="bg-dark-600 p-2 rounded-lg mb-2 cursor-pointer hover:bg-dark-500 transition-colors"
                    onClick={() => handlePromptClick(prompt.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-full">
                        <p className="text-xs font-medium">{prompt.title}</p>
                        {prompt.description && (
                          <p className="text-xs text-gray-400 mt-1">{prompt.description}</p>
                        )}
                      </div>
                      <ClipboardDocumentIcon className="h-4 w-4 text-gray-400 ml-2 flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Empty state */}
            {children.length === 0 && categoryPrompts.length === 0 && (
              <div className="p-2 text-xs text-gray-400 italic">
                No subcategories or prompts in this category
              </div>
            )}
          </div>
        )}
      </div>
    );
  };
  
  // Function to navigate back to all categories 
  const handleBackToAllCategories = () => {
    navigate('/categories');
  };
  
  // Filtered view - get the current category and its child categories
  const filteredView = useMemo(() => {
    if (!id) return null;
    
    const selectedCategory = categories.find(cat => cat.id === id);
    if (!selectedCategory) return null;
    
    // Recursively find all subcategories
    const findAllSubcategories = (categoryId: string): Category[] => {
      const directChildren = categories.filter(cat => cat.parentId === categoryId);
      let allChildren: Category[] = [...directChildren];
      
      directChildren.forEach(child => {
        const childrenOfChild = findAllSubcategories(child.id);
        allChildren = [...allChildren, ...childrenOfChild];
      });
      
      return allChildren;
    };
    
    const subcategories = findAllSubcategories(id);
    const categoryPrompts = promptsByCategory[id] || [];
    
    return {
      category: selectedCategory,
      subcategories,
      prompts: categoryPrompts
    };
  }, [id, categories, promptsByCategory]);
  
  // Loading state
  if (categoriesLoading || promptsLoading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Categories</h1>
        <div className="bg-dark-700 rounded-lg p-6 flex justify-center">
          <p className="text-gray-300">Loading categories and prompts...</p>
        </div>
      </div>
    );
  }
  
  // Specific category view
  if (id && filteredView) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <button
              onClick={handleBackToAllCategories}
              className="p-2 mr-2 rounded-md bg-dark-600 hover:bg-dark-500 text-gray-300"
              title="Back to all categories"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-bold flex items-center">
              <div 
                className="w-4 h-4 rounded-full mr-2"
                style={{ backgroundColor: getCategoryColor(filteredView.category.color) }}
              />
              {filteredView.category.name}
            </h1>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => {
                console.log(`🔍 Adding subcategory to parent: ${id}`);
                handleOpenCreateModal(id);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md flex items-center text-sm"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Subcategory
            </button>
            
            <button
              onClick={() => handleOpenEditModal(filteredView.category)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md flex items-center text-sm"
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit Category
            </button>
            
            <button
              onClick={() => handleDeleteClick(filteredView.category)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md flex items-center text-sm"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Delete Category
            </button>
          </div>
        </div>
        
        {filteredView.category.description && (
          <div className="bg-dark-700 rounded-lg p-4 mb-6">
            <p className="text-gray-300">{filteredView.category.description}</p>
          </div>
        )}
        
        <div className="bg-dark-700 rounded-lg p-6">
          {/* Subcategories */}
          {filteredView.subcategories.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-4">Subcategories</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredView.subcategories.map(subcat => (
                  <div 
                    key={subcat.id}
                    className="bg-dark-600 p-4 rounded-lg cursor-pointer hover:bg-dark-500 transition-colors"
                    onClick={() => navigate(`/categories/${subcat.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: getCategoryColor(subcat.color) }}
                        />
                        <span className="font-medium">{subcat.name}</span>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(subcat);
                          }}
                          className="p-1 rounded hover:bg-dark-400"
                        >
                          <PencilIcon className="h-4 w-4 text-gray-400" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(subcat);
                          }}
                          className="p-1 rounded hover:bg-dark-400"
                        >
                          <TrashIcon className="h-4 w-4 text-gray-400" />
                        </button>
                      </div>
                    </div>
                    {subcat.description && (
                      <p className="text-xs text-gray-400 mt-2">{subcat.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Prompts in this category */}
          <div>
            <h2 className="text-xl font-bold mb-4">Prompts in this Category</h2>
            {filteredView.prompts.length > 0 ? (
              <div className="space-y-2">
                {filteredView.prompts.map(prompt => (
                  <div
                    key={prompt.id}
                    className="bg-dark-600 p-3 rounded-lg cursor-pointer hover:bg-dark-500 transition-colors"
                    onClick={() => handlePromptClick(prompt.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-full">
                        <h3 className="font-medium">{prompt.title}</h3>
                        {prompt.description && (
                          <p className="text-xs text-gray-400 mt-1">{prompt.description}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                          {prompt.content}
                        </p>
                      </div>
                      <ClipboardDocumentIcon className="h-5 w-5 text-gray-400 ml-2 flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center italic py-4">
                No prompts in this category yet.
              </p>
            )}
          </div>
        </div>
        
        {/* Category Modal */}
        {renderCategoryModal()}
        
        {/* Delete confirmation dialog */}
        {renderDeleteConfirmation()}
      </div>
    );
  }
  
  // All categories view (default)
  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">All Categories</h1>
        <button
          onClick={() => handleOpenCreateModal()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md flex items-center text-sm"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Create Category
        </button>
      </div>
      
      <div className="bg-dark-700 rounded-lg p-6">
        {/* Root categories */}
        {categoryHierarchy.rootCategories.map(category => (
          <CategoryItem 
            key={category.id}
            category={category}
            childrenMap={categoryHierarchy.childrenMap}
          />
        ))}
        
        {/* Uncategorized prompts */}
        {promptsByCategory['uncategorized']?.length > 0 && (
          <div className="mt-4">
            <h2 className="font-bold text-md mb-2">Uncategorized Prompts</h2>
            <div className="bg-dark-600 rounded-lg p-3">
              {promptsByCategory['uncategorized'].map((prompt) => (
                <div 
                  key={prompt.id}
                  className="bg-dark-500 p-2 rounded-lg mb-2 cursor-pointer hover:bg-dark-400 transition-colors"
                  onClick={() => handlePromptClick(prompt.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-full">
                      <p className="text-xs font-medium">{prompt.title}</p>
                      {prompt.description && (
                        <p className="text-xs text-gray-400 mt-1">{prompt.description}</p>
                      )}
                    </div>
                    <ClipboardDocumentIcon className="h-4 w-4 text-gray-400 ml-2 flex-shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Category Modal */}
      {renderCategoryModal()}
      
      {/* Delete confirmation dialog */}
      {renderDeleteConfirmation()}
    </div>
  );
  
  // Helper function to render the category modal
  function renderCategoryModal() {
    const isCreateMode = !currentCategory;
    const modalTitle = isCreateMode ? "Create Category" : "Edit Category";
    const submitText = isCreateMode ? "Create" : "Save Changes";
    
    return (
      <Modal
        isOpen={modalOpen.createCategory || modalOpen.editCategory}
        onClose={handleCloseModal}
        title={modalTitle}
      >
        <form onSubmit={formik.handleSubmit} className="space-y-4">
          {/* Category Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.name}
              className="mt-1 block w-full rounded-md bg-dark-600 border-dark-500 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-white"
            />
            {formik.touched.name && formik.errors.name && (
              <div className="mt-1 text-xs text-red-500">{formik.errors.name}</div>
            )}
          </div>
          
          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300">
              Description (Optional)
            </label>
            <input
              id="description"
              name="description"
              type="text"
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.description}
              className="mt-1 block w-full rounded-md bg-dark-600 border-dark-500 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-white"
            />
          </div>
          
          {/* Color */}
          <div>
            <label htmlFor="color" className="block text-sm font-medium text-gray-300">
              Color
            </label>
            <div className="flex items-center mt-1">
              <input
                id="color"
                name="color"
                type="color"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.color}
                className="h-8 w-8 rounded-md border-0 bg-transparent p-0"
              />
              <span className="ml-2 text-xs text-gray-400">{formik.values.color}</span>
            </div>
          </div>
          
          {/* Parent Category */}
          <div>
            <label htmlFor="parentId" className="block text-sm font-medium text-gray-300">
              Parent Category (Optional)
            </label>
            <select
              id="parentId"
              name="parentId"
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.parentId}
              className="mt-1 block w-full rounded-md bg-dark-600 border-dark-500 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-white"
            >
              <option value="">No parent (Root category)</option>
              
              {/* Group categories with indicators for hierarchy */}
              {categories
                .filter(category => category.id !== currentCategory?.id) // Don't allow setting itself as parent
                .map((category) => {
                  // Determine if this is a top-level category
                  const isTopLevel = !category.parentId;
                  
                  // Find the parent name if this is a subcategory
                  let parentName = '';
                  if (!isTopLevel) {
                    const parent = categories.find(c => c.id === category.parentId);
                    parentName = parent ? parent.name : '';
                  }
                  
                  return (
                    <option key={category.id} value={category.id}>
                      {isTopLevel ? 
                        `${category.name} (Top-Level)` : 
                        `${category.name} (Sub of ${parentName})`}
                    </option>
                  );
                })}
            </select>
            <p className="mt-1 text-xs text-gray-400">
              Top-level categories appear in the sidebar. Subcategories are only visible within their parent category.
            </p>
          </div>
          
          {/* Form Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-2 bg-dark-500 hover:bg-dark-400 rounded-md text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm"
            >
              {submitText}
            </button>
          </div>
        </form>
      </Modal>
    );
  }
  
  // Helper function to render the delete confirmation dialog
  function renderDeleteConfirmation() {
    return deleteConfirmOpen && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-dark-700 rounded-lg p-6 max-w-md w-full mx-4">
          <h2 className="text-xl font-bold mb-4">Confirm Delete</h2>
          <p className="text-gray-300 mb-6">
            Are you sure you want to delete the category "{currentCategory?.name}"? This will not delete any prompts, but they will become uncategorized.
          </p>
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setDeleteConfirmOpen(false)}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  }
};

export default CategoriesPage; 