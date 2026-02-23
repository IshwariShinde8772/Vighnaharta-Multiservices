import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Shield, User, Key, Plus, Trash2, Eye, EyeOff, AlertTriangle, CheckCircle } from 'lucide-react';

const Settings = () => {
    const { user, updateUser } = useAuth();

    // Profile
    const [profileData, setProfileData] = useState({
        full_name: user?.full_name || '',
        username: user?.username || ''
    });

    // Password
    const [passData, setPassData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false, newPass: false, confirm: false
    });

    // Admin Management
    const [admins, setAdmins] = useState([]);
    const [newAdmin, setNewAdmin] = useState({ username: '', password: '', full_name: '' });
    const [loadingAdmins, setLoadingAdmins] = useState(false);

    // Messages
    const [profileMsg, setProfileMsg] = useState({ text: '', type: '' });
    const [passMsg, setPassMsg] = useState({ text: '', type: '' });
    const [adminMsg, setAdminMsg] = useState({ text: '', type: '' });

    const showMsg = (setter, text, type, duration = 4000) => {
        setter({ text, type });
        setTimeout(() => setter({ text: '', type: '' }), duration);
    };

    // Fetch admins list
    const fetchAdmins = async () => {
        setLoadingAdmins(true);
        try {
            const res = await axios.get('/api/admin/admins');
            setAdmins(res.data);
        } catch (err) {
            console.error('Failed to fetch admins', err);
        } finally {
            setLoadingAdmins(false);
        }
    };

    useEffect(() => {
        if (user?.role === 'admin') fetchAdmins();
    }, [user]);

    // Update Profile
    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        try {
            await axios.put('/api/admin/profile', profileData);
            updateUser(profileData);
            showMsg(setProfileMsg, '✅ Profile updated successfully!', 'success');
        } catch (err) {
            showMsg(setProfileMsg, '❌ Failed to update profile', 'error');
        }
    };

    // Change Password
    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passData.newPassword !== passData.confirmPassword) {
            showMsg(setPassMsg, '❌ New passwords do not match', 'error');
            return;
        }
        if (passData.newPassword.length < 6) {
            showMsg(setPassMsg, '❌ New password must be at least 6 characters', 'error');
            return;
        }
        try {
            await axios.put('/api/admin/password', {
                currentPassword: passData.currentPassword,
                newPassword: passData.newPassword
            });
            showMsg(setPassMsg, '✅ Password changed successfully!', 'success');
            setPassData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            showMsg(setPassMsg, `❌ ${err.response?.data?.message || 'Failed to change password'}`, 'error');
        }
    };

    // Add new admin user
    const handleAddAdmin = async (e) => {
        e.preventDefault();
        if (!newAdmin.username || !newAdmin.password || !newAdmin.full_name) {
            showMsg(setAdminMsg, '❌ All fields are required', 'error');
            return;
        }
        if (newAdmin.password.length < 6) {
            showMsg(setAdminMsg, '❌ Password must be at least 6 characters', 'error');
            return;
        }
        try {
            await axios.post('/api/admin/admins', newAdmin);
            showMsg(setAdminMsg, `✅ Admin "${newAdmin.username}" created successfully!`, 'success');
            setNewAdmin({ username: '', password: '', full_name: '' });
            fetchAdmins();
        } catch (err) {
            showMsg(setAdminMsg, `❌ ${err.response?.data?.message || 'Failed to create admin'}`, 'error');
        }
    };

    // Delete admin
    const handleDeleteAdmin = async (adminId, adminUsername) => {
        if (!window.confirm(`Are you sure you want to delete admin "${adminUsername}"? This cannot be undone.`)) return;
        try {
            await axios.delete(`/api/admin/admins/${adminId}`);
            showMsg(setAdminMsg, `✅ Admin "${adminUsername}" deleted.`, 'success');
            fetchAdmins();
        } catch (err) {
            showMsg(setAdminMsg, `❌ ${err.response?.data?.message || 'Failed to delete admin'}`, 'error');
        }
    };

    const MessageBox = ({ msg }) => msg.text ? (
        <div className={`p-3 rounded-lg text-sm font-medium flex items-center gap-2 ${msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {msg.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
            {msg.text}
        </div>
    ) : null;

    const PasswordInput = ({ label, value, onChange, showKey, toggleKey }) => (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <div className="relative">
                <input
                    type={showPasswords[showKey] ? 'text' : 'password'}
                    required
                    className="w-full p-2 pr-10 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={value}
                    onChange={onChange}
                />
                <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, [showKey]: !prev[showKey] }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                    {showPasswords[showKey] ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
            </div>
        </div>
    );

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <div className="flex items-center gap-3">
                <Shield size={28} className="text-blue-700" />
                <h1 className="text-2xl font-bold text-gray-800">Settings & Access</h1>
            </div>

            {/* Current Session Info */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-700 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {(user?.full_name || user?.username || 'A').charAt(0).toUpperCase()}
                </div>
                <div>
                    <p className="font-bold text-gray-800">{user?.full_name || 'Admin'}</p>
                    <p className="text-sm text-gray-500">@{user?.username} · <span className="uppercase text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">{user?.role}</span></p>
                </div>
            </div>

            {/* ─── Profile Settings ─── */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-5">
                    <User size={20} className="text-gray-600" />
                    <h3 className="text-lg font-bold text-gray-800">Profile Settings</h3>
                </div>
                <MessageBox msg={profileMsg} />
                <form onSubmit={handleProfileUpdate} className="space-y-4 mt-3">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                            <input
                                type="text" required
                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                value={profileData.full_name}
                                onChange={e => setProfileData({ ...profileData, full_name: e.target.value })}
                                placeholder="e.g. Vighnaharta Services"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Login Username</label>
                            <input
                                type="text" required
                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                value={profileData.username}
                                onChange={e => setProfileData({ ...profileData, username: e.target.value })}
                                placeholder="e.g. vighnaharta"
                            />
                            <p className="text-xs text-orange-600 mt-1">⚠️ Changing username requires re-login</p>
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button type="submit" className="bg-blue-700 text-white px-5 py-2 rounded-lg hover:bg-blue-800 font-semibold text-sm">
                            Update Profile
                        </button>
                    </div>
                </form>
            </div>

            {/* ─── Change Password ─── */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-5">
                    <Key size={20} className="text-gray-600" />
                    <h3 className="text-lg font-bold text-gray-800">Change Password</h3>
                </div>
                <MessageBox msg={passMsg} />
                <form onSubmit={handlePasswordChange} className="space-y-4 mt-3">
                    <PasswordInput
                        label="Current Password"
                        value={passData.currentPassword}
                        onChange={e => setPassData({ ...passData, currentPassword: e.target.value })}
                        showKey="current"
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <PasswordInput
                            label="New Password"
                            value={passData.newPassword}
                            onChange={e => setPassData({ ...passData, newPassword: e.target.value })}
                            showKey="newPass"
                        />
                        <PasswordInput
                            label="Confirm New Password"
                            value={passData.confirmPassword}
                            onChange={e => setPassData({ ...passData, confirmPassword: e.target.value })}
                            showKey="confirm"
                        />
                    </div>
                    {passData.newPassword && passData.confirmPassword && passData.newPassword !== passData.confirmPassword && (
                        <p className="text-xs text-red-600 font-semibold">❌ Passwords do not match</p>
                    )}
                    {passData.newPassword && passData.confirmPassword && passData.newPassword === passData.confirmPassword && passData.newPassword.length >= 6 && (
                        <p className="text-xs text-green-600 font-semibold">✅ Passwords match</p>
                    )}
                    <div className="flex justify-end">
                        <button type="submit" className="bg-gray-800 text-white px-5 py-2 rounded-lg hover:bg-gray-900 font-semibold text-sm">
                            Change Password
                        </button>
                    </div>
                </form>
            </div>

            {/* ─── Admin Access Management ─── */}
            {user?.role === 'admin' && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                        <Shield size={20} className="text-blue-700" />
                        <h3 className="text-lg font-bold text-gray-800">Admin Access Management</h3>
                    </div>
                    <p className="text-xs text-gray-500 mb-5">Add or remove admin users who can log in to this system.</p>

                    <MessageBox msg={adminMsg} />

                    {/* Existing Admins */}
                    <div className="mt-4 mb-6">
                        <h4 className="text-sm font-bold text-gray-600 uppercase mb-3">Current Admin Users</h4>
                        {loadingAdmins ? (
                            <p className="text-sm text-gray-400">Loading...</p>
                        ) : (
                            <div className="space-y-2">
                                {admins.map(admin => (
                                    <div key={admin.id} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-lg px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm">
                                                {(admin.full_name || admin.username).charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-800 text-sm">{admin.full_name}</p>
                                                <p className="text-xs text-gray-400">@{admin.username} · {new Date(admin.created_at).toLocaleDateString('en-IN')}</p>
                                            </div>
                                        </div>
                                        {admin.id !== user.id ? (
                                            <button
                                                onClick={() => handleDeleteAdmin(admin.id, admin.username)}
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                                title="Delete admin"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        ) : (
                                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-semibold">YOU</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Add New Admin */}
                    <div className="border-t border-gray-100 pt-5">
                        <h4 className="text-sm font-bold text-gray-600 uppercase mb-3 flex items-center gap-2">
                            <Plus size={14} /> Add New Admin User
                        </h4>
                        <form onSubmit={handleAddAdmin} className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                                        value={newAdmin.full_name}
                                        onChange={e => setNewAdmin({ ...newAdmin, full_name: e.target.value })}
                                        placeholder="Owner / Staff Name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Username (for login)</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                                        value={newAdmin.username}
                                        onChange={e => setNewAdmin({ ...newAdmin, username: e.target.value })}
                                        placeholder="e.g. owner2025"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                                        value={newAdmin.password}
                                        onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })}
                                        placeholder="Min 6 characters"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button type="submit" className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 font-semibold text-sm">
                                    <Plus size={14} /> Create Admin
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── Default Credentials Reminder ─── */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <div className="flex items-start gap-3">
                    <AlertTriangle size={20} className="text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                        <h4 className="font-bold text-amber-800 mb-1">⚠️ Security Reminder</h4>
                        <p className="text-sm text-amber-700">
                            Default login credentials are <code className="bg-amber-100 px-1 rounded font-mono">admin</code> / <code className="bg-amber-100 px-1 rounded font-mono">password123</code>.
                            <strong> Please change your username and password before going live.</strong>
                        </p>
                        <ul className="text-xs text-amber-600 mt-2 space-y-1 list-disc list-inside">
                            <li>Change username using <strong>Profile Settings</strong> above</li>
                            <li>Change password using <strong>Change Password</strong> above</li>
                            <li>You can add more admins for staff members</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
