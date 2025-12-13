import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

      {/* Main Content */}
      <div className="lg:pl-64">
        <Header setSidebarOpen={setSidebarOpen} />
        
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
