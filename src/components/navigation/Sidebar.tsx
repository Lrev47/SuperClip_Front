import { useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const { categories } = useAppSelector((state) => state.categories);
  const { currentCategoryId } = useAppSelector((state) => state.ui);
  const { user } = useAppSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
  };

  const handleCategoryClick = (categoryId: string) => {
    dispatch(setCurrentCategory(categoryId));
    navigate(`/categories/${categoryId}`);
  };

  // Organize categories into a tree structure
  const organizeCategories = (categories: Category[]) => {
    // Filter for top-level categories (those with null or empty string parentId)
    const topLevelCategories = categories.filter((cat) => 
      cat.parentId === null || cat.parentId === undefined || cat.parentId === '');
    
    console.log('🔍 All categories:', categories.map(c => ({id: c.id, name: c.name, parentId: c.parentId})));
    console.log('🔍 Filtered top-level categories:', topLevelCategories.map(c => c.name));
    
    return topLevelCategories;
  };

  const topLevelCategories = organizeCategories(categories);

  return (
    <div
      className={`flex flex-col h-full bg-dark-900 border-r border-dark-700 transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      } flex-shrink-0 sidebar-container`}
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
            `sidebar-item ${isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'} block`
          }
        >
          <div className="flex items-center">
            <HomeIcon className="h-5 w-5 mr-3" />
            {!collapsed && <span>Dashboard</span>}
          </div>
        </NavLink>

        <NavLink
          to="/prompts"
          className={({ isActive }) =>
            `sidebar-item ${isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'} block`
          }
        >
          <div className="flex items-center">
            <DocumentTextIcon className="h-5 w-5 mr-3" />
            {!collapsed && <span>All Prompts</span>}
          </div>
        </NavLink>

        <NavLink
          to="/generator"
          className={({ isActive }) =>
            `sidebar-item ${isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'} block`
          }
        >
          <div className="flex items-center">
            <SparklesIcon className="h-5 w-5 mr-3" />
            {!collapsed && <span>AI Generator</span>}
          </div>
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
              {topLevelCategories.map((category) => (
                <div key={category.id}>
                  <NavLink
                    to={`/categories/${category.id}`}
                    className={({ isActive }) =>
                      `sidebar-item w-full text-left block ${
                        isActive 
                          ? 'sidebar-item-active'
                          : 'sidebar-item-inactive'
                      }`
                    }
                  >
                    <div className="flex items-center">
                      <FolderIcon
                        className="h-5 w-5 mr-3"
                        style={{ color: category.color || '#9ca3af' }}
                      />
                      <span className="truncate">{category.name}</span>
                    </div>
                  </NavLink>
                </div>
              ))}
            </div>
          </div>
        )}
      </nav>
    </div>
  );
};

export default Sidebar;