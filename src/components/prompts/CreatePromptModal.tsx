import React, { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { createPrompt } from '@/store/slices/promptSlice';
import { createCategory } from '@/store/slices/categorySlice';
import { closeModal } from '@/store/slices/uiSlice';
import Modal from '@/components/ui/Modal';
import { PlusIcon } from '@heroicons/react/24/outline';

// Validation schema - conditionally apply categoryId validation
const getValidationSchema = (isCreatingCategory: boolean) => {
  const baseSchema = {
    title: Yup.string().required('Title is required'),
    content: Yup.string().required('Content is required'),
    description: Yup.string(),
    tags: Yup.array().of(Yup.string()),
  };
  
  // Only require categoryId if not creating a new category
  if (!isCreatingCategory) {
    return Yup.object({
      ...baseSchema,
      categoryId: Yup.string().required('Category is required'),
    });
  }
  
  // When creating a new category, don't require categoryId in the form
  return Yup.object(baseSchema);
};

// Create category schema
const categorySchema = Yup.object({
  name: Yup.string().required('Category name is required'),
  description: Yup.string(),
  color: Yup.string(),
});

const NEW_CATEGORY_OPTION = 'new-category';

const CreatePromptModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const { modalOpen } = useAppSelector((state) => state.ui);
  const { categories } = useAppSelector((state) => state.categories);
  
  // State for new category mode
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState({ 
    name: '', 
    description: '', 
    color: '#6366F1' // Default indigo color
  });
  const [categoryError, setCategoryError] = useState('');

  const formik = useFormik({
    initialValues: {
      title: '',
      content: '',
      description: '',
      categoryId: '',
      tags: [] as string[],
    },
    validationSchema: getValidationSchema(isCreatingCategory),
    validateOnChange: true,
    validateOnBlur: true,
    enableReinitialize: true, // Re-validate when isCreatingCategory changes
    onSubmit: async (values) => {
      console.log('🚀 Form submitted with values:', values);
      
      try {
        // Make sure we have all required fields
        if (!values.title.trim() || !values.content.trim() || (!values.categoryId && !isCreatingCategory)) {
          console.error('❌ Missing required fields:', {
            title: Boolean(values.title.trim()),
            content: Boolean(values.content.trim()),
            categoryId: Boolean(values.categoryId) || isCreatingCategory,
          });
          formik.setErrors({
            title: !values.title.trim() ? 'Title is required' : undefined,
            content: !values.content.trim() ? 'Content is required' : undefined,
            categoryId: (!values.categoryId && !isCreatingCategory) ? 'Category is required' : undefined,
          });
          return;
        }
        
        // If we're creating a new category, save it first
        if (isCreatingCategory) {
          console.log('📂 Creating new category:', newCategory);
          
          // Validate new category
          if (!newCategory.name.trim()) {
            console.log('⚠️ Category name validation failed');
            setCategoryError('Category name is required');
            return;
          }
          
          // Create the category
          console.log('📂 Dispatching createCategory');
          const resultAction = await dispatch(createCategory({
            name: newCategory.name,
            description: newCategory.description,
            color: newCategory.color
          })).unwrap();
          
          // Get the new category ID
          const newCategoryId = resultAction.id;
          console.log('📂 New category created with ID:', newCategoryId);
          
          // Use the new category ID for the prompt
          values.categoryId = newCategoryId;
        }
        
        // Create a properly formatted data object for the API
        const promptData = {
          title: values.title.trim(),
          content: values.content.trim(),
          description: values.description ? values.description.trim() : '',  // Handle undefined
          categoryId: values.categoryId,
          tags: values.tags || []
        };
        
        // Create the prompt
        console.log('📝 Dispatching createPrompt with values:', promptData);
        const result = await dispatch(createPrompt(promptData)).unwrap();
        console.log('📝 Prompt created successfully:', result);
        
        handleClose();
      } catch (error) {
        console.error('❌ Error creating prompt:', error);
      }
    },
  });

  const handleClose = () => {
    dispatch(closeModal('createPrompt'));
    formik.resetForm();
    setIsCreatingCategory(false);
    setNewCategory({ name: '', description: '', color: '#6366F1' });
    setCategoryError('');
  };

  // Handle category selection change
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    
    if (value === NEW_CATEGORY_OPTION) {
      setIsCreatingCategory(true);
      // When switching to create category mode, reset the categoryId field
      formik.setFieldValue('categoryId', '');
      // Re-validate the form with the new validation schema
      formik.validateForm();
    } else {
      setIsCreatingCategory(false);
      formik.setFieldValue('categoryId', value);
    }
  };

  // Manual form submission helper
  const handleManualSubmit = () => {
    console.log('🔨 Manual submit triggered');
    
    // Get current form values
    const values = formik.values;
    console.log('🔨 Current form values:', values);
    
    // Do manual validation for critical fields
    const errors: any = {};
    if (!values.title.trim()) errors.title = 'Title is required';
    if (!values.content.trim()) errors.content = 'Content is required';
    if (!values.categoryId && !isCreatingCategory) errors.categoryId = 'Category is required';
    
    console.log('🔨 Manual validation errors:', errors);
    
    // If there are validation errors, show them
    if (Object.keys(errors).length > 0) {
      formik.setErrors(errors);
      return;
    }
    
    // Proceed with form submission even if formik validation is stuck
    try {
      // Start the same submission flow as the regular form
      formik.submitForm();
    } catch (error) {
      console.error('🔨 Error in manual submission:', error);
    }
  };

  // Debug validation errors
  console.log('Form status:', {
    isValid: formik.isValid,
    dirty: formik.dirty,
    isSubmitting: formik.isSubmitting,
    errors: formik.errors,
    touched: formik.touched,
    categoryId: formik.values.categoryId,
    isCreatingCategory
  });

  return (
    <Modal
      isOpen={modalOpen.createPrompt}
      onClose={handleClose}
      title="Create New Prompt"
      size="md"
    >
      <form 
        onSubmit={(e) => {
          console.log('📋 Form onSubmit event triggered');
          formik.handleSubmit(e);
        }} 
        className="space-y-4"
      >
        {/* Title field */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-300">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            value={formik.values.title}
            className="mt-1 block w-full rounded-md bg-dark-600 border-dark-500 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-white"
          />
          {formik.touched.title && formik.errors.title && (
            <div className="mt-1 text-xs text-red-500">{formik.errors.title}</div>
          )}
        </div>

        {/* Content field */}
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-300">
            Content <span className="text-red-500">*</span>
          </label>
          <textarea
            id="content"
            name="content"
            rows={4}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            value={formik.values.content}
            className="mt-1 block w-full rounded-md bg-dark-600 border-dark-500 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-white"
          />
          {formik.touched.content && formik.errors.content && (
            <div className="mt-1 text-xs text-red-500">{formik.errors.content}</div>
          )}
        </div>

        {/* Description field */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-300">
            Description (Optional)
          </label>
          <textarea
            id="description"
            name="description"
            rows={2}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            value={formik.values.description}
            className="mt-1 block w-full rounded-md bg-dark-600 border-dark-500 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-white"
          />
        </div>

        {/* Category field */}
        <div>
          <label htmlFor="categoryId" className="block text-sm font-medium text-gray-300">
            Category <span className="text-red-500">*</span>
          </label>
          
          {!isCreatingCategory ? (
            <select
              id="categoryId"
              name="categoryId"
              onChange={handleCategoryChange}
              onBlur={formik.handleBlur}
              value={formik.values.categoryId}
              className="mt-1 block w-full rounded-md bg-dark-600 border-dark-500 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-white"
            >
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
              <option value={NEW_CATEGORY_OPTION}>✨ Create new category...</option>
            </select>
          ) : (
            <div className="space-y-3 mt-1 p-3 border border-dark-400 rounded-md bg-dark-700">
              <h4 className="text-sm font-medium text-primary-400">New Category</h4>
              
              {/* New category name */}
              <div>
                <label htmlFor="new-category-name" className="block text-xs text-gray-400">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="new-category-name"
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => {
                    setNewCategory({ ...newCategory, name: e.target.value });
                    if (e.target.value.trim()) setCategoryError('');
                  }}
                  className="mt-1 block w-full rounded-md bg-dark-600 border-dark-500 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-white text-sm"
                />
                {categoryError && (
                  <div className="mt-1 text-xs text-red-500">{categoryError}</div>
                )}
              </div>
              
              {/* New category description */}
              <div>
                <label htmlFor="new-category-description" className="block text-xs text-gray-400">
                  Description (Optional)
                </label>
                <input
                  id="new-category-description"
                  type="text"
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  className="mt-1 block w-full rounded-md bg-dark-600 border-dark-500 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-white text-sm"
                />
              </div>
              
              {/* New category color */}
              <div>
                <label htmlFor="new-category-color" className="block text-xs text-gray-400">
                  Color
                </label>
                <div className="flex items-center mt-1">
                  <input
                    id="new-category-color"
                    type="color"
                    value={newCategory.color}
                    onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                    className="h-8 w-8 rounded-md border-0 bg-transparent p-0"
                  />
                  <span className="ml-2 text-xs text-gray-400">{newCategory.color}</span>
                </div>
              </div>
              
              {/* Back to selection button */}
              <div>
                <button
                  type="button"
                  onClick={() => setIsCreatingCategory(false)}
                  className="text-xs text-gray-400 hover:text-primary-400"
                >
                  ← Back to category selection
                </button>
              </div>
            </div>
          )}
          
          {formik.touched.categoryId && formik.errors.categoryId && !isCreatingCategory && (
            <div className="mt-1 text-xs text-red-500">{formik.errors.categoryId}</div>
          )}
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 border border-dark-500 rounded-md shadow-sm bg-dark-600 text-white hover:bg-dark-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={(e) => {
              console.log('🖱️ Create button clicked');
              
              // If the regular form submission doesn't work, try this backup
              if (formik.isValid || isCreatingCategory) {
                e.preventDefault();
                handleManualSubmit();
              }
            }}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm bg-primary-600 text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 flex items-center"
            disabled={formik.isSubmitting}
          >
            {formik.isSubmitting ? (
              <>
                <span className="animate-spin mr-2">↻</span>
                <span>Creating...</span>
              </>
            ) : (
              <>
                <PlusIcon className="h-4 w-4 mr-1" />
                <span>Create Prompt</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreatePromptModal; 