import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { logout } from '@/store/slices/authSlice';
import { setCurrentCategory } from '@/store/slices/uiSlice';
import { Category } from '@/store/slices/categorySlice';
import {
  HomeIcon,
  DocumentTextIcon,
  FolderIcon,
  SparklesIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const { categories } = useAppSelector((state) => state.categories);
  const { currentCategoryId } = useAppSelector((state) => state.ui);
  const { user } = useAppSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
  };

  const handleCategoryClick = (categoryId: string) => {
    dispatch(setCurrentCategory(categoryId));
  };

  // Organize categories into a tree structure
  const organizeCategories = (categories: Category[]) => {
    const rootCategories = categories.filter((cat) => !cat.parentId);
    const childCategories = categories.filter((cat) => cat.parentId);

    return rootCategories.map((rootCat) => {
      const children = childCategories.filter((child) => child.parentId === rootCat.id);
      return {
        ...rootCat,
        children,
      };
    });
  };

  const organizedCategories = organizeCategories(categories);

  return (
    <div
      className={`flex flex-col h-full bg-dark-900 border-r border-dark-700 transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-dark-700">
        {!collapsed && (
          <h1 className="text-xl font-bold text-white truncate">SuperClip</h1>
        )}
        <button
          onClick={onToggle}
          className="p-1 rounded-md hover:bg-dark-700 focus:outline-none"
        >
          {collapsed ? (
            <ChevronRightIcon className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronLeftIcon className="h-5 w-5 text-gray-400" />
          )}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-1">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `sidebar-item ${isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'}`
          }
        >
          <HomeIcon className="h-5 w-5 mr-3" />
          {!collapsed && <span>Dashboard</span>}
        </NavLink>

        <NavLink
          to="/prompts"
          className={({ isActive }) =>
            `sidebar-item ${isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'}`
          }
        >
          <DocumentTextIcon className="h-5 w-5 mr-3" />
          {!collapsed && <span>All Prompts</span>}
        </NavLink>

        <NavLink
          to="/generator"
          className={({ isActive }) =>
            `sidebar-item ${isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'}`
          }
        >
          <SparklesIcon className="h-5 w-5 mr-3" />
          {!collapsed && <span>AI Generator</span>}
        </NavLink>

        {/* Categories Section */}
        {!collapsed && (
          <div className="pt-4 pb-2">
            <div className="flex items-center justify-between px-3 mb-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Categories
              </h3>
              <NavLink
                to="/categories"
                className="p-1 rounded-md hover:bg-dark-700 focus:outline-none"
              >
                <PlusIcon className="h-4 w-4 text-gray-400" />
              </NavLink>
            </div>
            <div className="space-y-1">
              {organizedCategories.map((category) => (
                <div key={category.id}>
                  <button
                    onClick={() => handleCategoryClick(category.id)}
                    className={`sidebar-item w-full text-left ${
                      currentCategoryId === category.id
                        ? 'sidebar-item-active'
                        : 'sidebar-item-inactive'
                    }`}
                  >
                    <FolderIcon
                      className="h-5 w-5 mr-3"
                      style={{ color: category.color || '#9ca3af' }}
                    />
                    <span className="truncate">{category.name}</span>
                  </button>
                  {/* Render children if any */}
                  {category.children && category.children.length > 0 && (
                    <div className="ml-6 space-y-1 mt-1">
                      {category.children.map((child) => (
                        <button
                          key={child.id}
                          onClick={() => handleCategoryClick(child.id)}
                          className={`sidebar-item w-full text-left ${
                            currentCategoryId === child.id
                              ? 'sidebar-item-active'
                              : 'sidebar-item-inactive'
                          }`}
                        >
                          <FolderIcon
                            className="h-4 w-4 mr-3"
                            style={{ color: child.color || '#9ca3af' }}
                          />
                          <span className="truncate">{child.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Favorites Section */}
        <NavLink
          to="/prompts?favorite=true"
          className={({ isActive }) =>
            `sidebar-item ${
              isActive || location.search.includes('favorite=true')
                ? 'sidebar-item-active'
                : 'sidebar-item-inactive'
            }`
          }
        >
          <StarIcon className="h-5 w-5 mr-3 text-yellow-500" />
          {!collapsed && <span>Favorites</span>}
        </NavLink>

        {/* Settings */}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `sidebar-item ${isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'}`
          }
        >
          <Cog6ToothIcon className="h-5 w-5 mr-3" />
          {!collapsed && <span>Settings</span>}
        </NavLink>
      </nav>

      {/* User Section */}
      <div className="border-t border-dark-700 p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 rounded-full bg-primary-700 flex items-center justify-center">
              <span className="text-white font-medium text-sm">
                {user?.name?.charAt(0) || 'U'}
              </span>
            </div>
          </div>
          {!collapsed && (
            <div className="ml-3">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="ml-auto p-1 rounded-md hover:bg-dark-700 focus:outline-none"
            title="Logout"
          >
            <ArrowLeftOnRectangleIcon className="h-5 w-5 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar; 