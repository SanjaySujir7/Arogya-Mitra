import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, ActivitySquare, Target, BookOpen, User, LogOut, PanelLeftClose, PanelLeftOpen, CheckSquare, Brain, Menu } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import './Sidebar.css';

const navItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/dashboard' },
    { icon: <ActivitySquare size={20} />, label: 'Health Log', path: '/health-log' },
    { icon: <CheckSquare size={20} />, label: 'Daily Check-in', path: '/check-in', hasBadge: true },
    { icon: <Brain size={20} />, label: 'Predictions', path: '/predictions' },
    { icon: <Target size={20} />, label: 'Goals', path: '/goals' },
    { icon: <BookOpen size={20} />, label: 'Reports', path: '/reports' },
    { icon: <User size={20} />, label: 'Profile', path: '/profile' },
];

function Sidebar({ collapsed, onToggle }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout, apiFetch } = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [logoutModalOpen, setLogoutModalOpen] = useState(false);
    const [checkInDone, setCheckInDone] = useState(true);

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await apiFetch('/daily-checkin/today/');
                if (res.ok) {
                    const data = await res.json();
                    setCheckInDone(data.completed);
                }
            } catch (err) {}
        };
        checkStatus();

        const handleCompleted = () => setCheckInDone(true);
        window.addEventListener('checkin-completed', handleCompleted);
        return () => window.removeEventListener('checkin-completed', handleCompleted);
    }, [apiFetch]);

    const handleLogoutClick = () => {
        setMobileMenuOpen(false);
        setLogoutModalOpen(true);
    };

    const confirmLogout = () => {
        setLogoutModalOpen(false);
        logout();
        navigate('/login');
    };

    // Close mobile menu when a link is clicked
    const handleMobileLinkClick = () => {
        setMobileMenuOpen(false);
    };

    return (
        <>
            {/* Desktop / Tablet sidebar */}
            <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
                <div className="sidebar-top">
                    <Link to="/dashboard" className="sidebar-logo">
                        <img src="/logo-1.png" alt="Arogya Mitra" />
                        {!collapsed && <span>Arogya Mitra</span>}
                    </Link>
                    <button
                        className="sidebar-toggle"
                        onClick={onToggle}
                        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`sidebar-link ${location.pathname === item.path ? 'active' : ''}`}
                            title={collapsed ? item.label : ''}
                        >
                            <span className="sidebar-icon">
                                {item.icon}
                                {item.hasBadge && !checkInDone && <span className="notification-badge" />}
                            </span>
                            {!collapsed && <span className="sidebar-label">{item.label}</span>}
                        </Link>
                    ))}
                </nav>

                <div className="sidebar-divider" />
                <div className="sidebar-bottom">
                    <button
                        className="sidebar-link sidebar-link--danger"
                        onClick={handleLogoutClick}
                        title={collapsed ? 'Logout' : ''}
                    >
                        <span className="sidebar-icon"><LogOut size={20} /></span>
                        {!collapsed && <span className="sidebar-label">Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Mobile bottom tab bar */}
            <nav className="mobile-tab-bar">
                {/* Show first 4 items directly on the bar */}
                {navItems.slice(0, 4).map((item) => (
                    <Link
                        key={item.path}
                        to={item.path}
                        className={`tab-item ${location.pathname === item.path ? 'active' : ''}`}
                        onClick={handleMobileLinkClick}
                    >
                        <span className="tab-icon">{item.icon}</span>
                        <span>{item.label}</span>
                    </Link>
                ))}

                {/* 5th item is the Menu button */}
                <button
                    className={`tab-item ${mobileMenuOpen ? 'active' : ''}`}
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    <span className="tab-icon"><Menu size={20} /></span>
                    <span>Menu</span>
                </button>
            </nav>

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <>
                    <div className="mobile-menu-backdrop" onClick={() => setMobileMenuOpen(false)} />
                    <div className="mobile-menu-sheet">
                        <div className="mobile-menu-header">
                            <h3>More Options</h3>
                        </div>
                        <div className="mobile-menu-content">
                            {/* Items that didn't fit in the main tab bar */}
                            {navItems.slice(4).map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`sidebar-link ${location.pathname === item.path ? 'active' : ''}`}
                                    onClick={handleMobileLinkClick}
                                >
                                    <span className="sidebar-icon">{item.icon}</span>
                                    <span className="sidebar-label">{item.label}</span>
                                </Link>
                            ))}

                            <div className="sidebar-divider" style={{ margin: '16px 0' }} />

                            <button className="sidebar-link sidebar-link--danger" onClick={handleLogoutClick}>
                                <span className="sidebar-icon"><LogOut size={20} /></span>
                                <span className="sidebar-label">Logout</span>
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Reusable Confirmation Modal for Logout */}
            <ConfirmModal
                isOpen={logoutModalOpen}
                title="Confirm Logout"
                message="Are you sure you want to sign out? You will need to log in again to access your dashboard."
                confirmText="Log Out"
                cancelText="Cancel"
                onConfirm={confirmLogout}
                onCancel={() => setLogoutModalOpen(false)}
                isDestructive={true}
            />
        </>
    );
}

export default Sidebar;
