import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { login, clearError } from '@/store/slices/authSlice';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { API_URL } from '@/config';

const LoginPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, error, isAuthenticated } = useAppSelector((state) => state.auth);
  const [showPassword, setShowPassword] = useState(false);
  
  // If user is authenticated, redirect them
  useEffect(() => {
    if (isAuthenticated) {
      console.log('🔐 User is authenticated, redirecting from login page');
      const from = location.state?.from || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location.state]);
  
  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema: Yup.object({
      email: Yup.string()
        .email('Invalid email address')
        .required('Email is required'),
      password: Yup.string()
        .required('Password is required'),
    }),
    onSubmit: async (values) => {
      try {
        console.log('🔑 Submitting login form:', { email: values.email });
        
        // Direct check of login endpoint to debug response structure
        try {
          // Using fetch for simpler response inspection
          console.log('🔍 Making direct fetch to login endpoint for debugging...');
          const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: values.email,
              password: values.password,
            }),
          });
          
          const contentType = response.headers.get('content-type');
          console.log('🔍 Response status:', response.status);
          console.log('🔍 Response content-type:', contentType);
          
          // Parse response based on content type
          let data;
          if (contentType && contentType.includes('application/json')) {
            data = await response.json();
            console.log('🔍 Response data (JSON):', data);
          } else {
            const text = await response.text();
            console.log('🔍 Response data (text):', text);
          }
        } catch (debugError) {
          console.error('🔍 Debug request error:', debugError);
        }
        
        // Continue with normal Redux login
        const result = await dispatch(login({
          email: values.email,
          password: values.password
        }));
        
        // Clear form on success
        if (!axios.isAxiosError(result.payload)) {
          formik.resetForm();
        }
      } catch (error) {
        console.error('Login error:', error);
      }
    },
  });

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-800 rounded-md text-red-200 text-sm">
          {error}
          <button
            className="float-right text-red-200 hover:text-white"
            onClick={() => dispatch(clearError())}
          >
            &times;
          </button>
        </div>
      )}

      <form onSubmit={formik.handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-300">
            Email
          </label>
          <div className="mt-1">
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="input w-full"
              value={formik.values.email}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            {formik.touched.email && formik.errors.email ? (
              <div className="mt-1 text-sm text-red-400">{formik.errors.email}</div>
            ) : null}
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-300">
            Password
          </label>
          <div className="mt-1 relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              className="input w-full pr-10"
              value={formik.values.password}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={togglePasswordVisibility}
            >
              {showPassword ? (
                <EyeSlashIcon className="h-5 w-5 text-gray-400" />
              ) : (
                <EyeIcon className="h-5 w-5 text-gray-400" />
              )}
            </button>
            {formik.touched.password && formik.errors.password ? (
              <div className="mt-1 text-sm text-red-400">{formik.errors.password}</div>
            ) : null}
          </div>
        </div>

        <div>
          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                Signing in...
              </div>
            ) : (
              'Sign in'
            )}
          </button>
        </div>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary-400 hover:text-primary-300">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage; 