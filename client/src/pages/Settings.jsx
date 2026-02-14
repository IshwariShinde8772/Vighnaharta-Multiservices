import { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Settings = () => {
    const { user } = useAuth();
    const [passData, setPassData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [profileData, setProfileData] = useState({ full_name: user?.full_name || '', username: user?.username || '' });
    const [message, setMessage] = useState({ text: '', type: '' });

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        try {
            await axios.put('/api/admin/profile', profileData);
            setMessage({ text: 'Profile updated successfully', type: 'success' });
        } catch (err) {
            setMessage({ text: 'Failed to update profile', type: 'error' });
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passData.newPassword !== passData.confirmPassword) {
            setMessage({ text: 'New passwords do not match', type: 'error' });
            return;
        }
        try {
            await axios.put('/api/admin/password', {
                currentPassword: passData.currentPassword,
                newPassword: passData.newPassword
            });
            setMessage({ text: 'Password changed successfully', type: 'success' });
            setPassData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            setMessage({ text: err.response?.data?.message || 'Failed to change password', type: 'error' });
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <h1 className="text-2xl font-bold text-gray-800">Settings</h1>

            {message.text && (
                <div className={`p-4 rounded ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message.text}
                </div>
            )}

            {/* Profile Settings */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-6">Profile Settings</h3>
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <input
                            type="text" required
                            className="w-full p-2 border border-gray-300 rounded"
                            value={profileData.full_name}
                            onChange={e => setProfileData({ ...profileData, full_name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                        <input
                            type="text" required
                            className="w-full p-2 border border-gray-300 rounded"
                            value={profileData.username}
                            onChange={e => setProfileData({ ...profileData, username: e.target.value })}
                        />
                    </div>
                    <div className="flex justify-end">
                        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                            Update Profile
                        </button>
                    </div>
                </form>
            </div>

            {/* Password Settings */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-6">Change Password</h3>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                        <input
                            type="password" required
                            className="w-full p-2 border border-gray-300 rounded"
                            value={passData.currentPassword}
                            onChange={e => setPassData({ ...passData, currentPassword: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                        <input
                            type="password" required
                            className="w-full p-2 border border-gray-300 rounded"
                            value={passData.newPassword}
                            onChange={e => setPassData({ ...passData, newPassword: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                        <input
                            type="password" required
                            className="w-full p-2 border border-gray-300 rounded"
                            value={passData.confirmPassword}
                            onChange={e => setPassData({ ...passData, confirmPassword: e.target.value })}
                        />
                    </div>
                    <div className="flex justify-end">
                        <button type="submit" className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900">
                            Change Password
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
export default Settings;
