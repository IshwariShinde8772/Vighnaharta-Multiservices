import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

const Layout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { name: 'Dashboard', path: '/' },
        { name: 'Work Enquiry', path: '/enquiry' },
        { name: 'Pending Work', path: '/pending' },
        { name: 'Fund Accounts', path: '/accounts' },
        { name: 'Reports', path: '/reports' },
    ];

    if (user?.role === 'admin') {
        navItems.push({ name: 'Manual Entry', path: '/manual-entry' });
    }

    navItems.push({ name: 'Settings', path: '/settings' });

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                ></div>
            )}

            {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 no-print ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex flex-col items-center justify-center py-6 bg-blue-900 text-white relative">
                    <img
                        src="/logo.jpeg"
                        alt="Logo"
                        className="w-20 h-20 mb-3 bg-white rounded-full p-1 object-contain"
                    />
                    <span className="text-xl font-bold text-center">Vighnaharta<br />Multiservices</span>
                    <button className="lg:hidden absolute top-4 right-4 text-white hover:text-gray-200" onClick={() => setSidebarOpen(false)}>
                        ✕
                    </button>
                </div>
                <nav className="p-4 space-y-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={() => setSidebarOpen(false)}
                            className={({ isActive }) =>
                                `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
                                }`
                            }
                        >
                            <span className="font-medium">{item.name}</span>
                        </NavLink>
                    ))}

                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors mt-8"
                    >
                        <span className="font-medium">Logout</span>
                    </button>
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top Header */}
                <header className="h-16 bg-white shadow-sm flex items-center justify-between px-6">
                    <button className="lg:hidden text-gray-600" onClick={() => setSidebarOpen(true)}>
                        Menu
                    </button>

                    <div className="flex items-center space-x-4 ml-auto">
                        <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
                            <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                        </div>
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                            {user?.full_name?.charAt(0) || 'U'}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
