import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { fetchCategories } from '@/store/slices/categorySlice';
import { toggleSidebar } from '@/store/slices/uiSlice';
import Sidebar from '@/components/navigation/Sidebar';
import SearchBar from '@/components/search/SearchBar';

const MainLayout = () => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const { sidebarCollapsed, searchOpen } = useAppSelector((state) => state.ui);

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  return (
    <div className="main-layout">
      {/* Sidebar */}
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => dispatch(toggleSidebar())} />

      {/* Main Content */}
      <div className="main-content">
        {/* Search Bar */}
        {searchOpen && <SearchBar />}

        {/* Content Area */}
        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout; 