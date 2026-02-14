import { useState, useEffect } from 'react';
import axios from 'axios';
import ServicesManager from './ServicesManager'; // Import ServicesManager

const ManualEntry = () => {
    const [admins, setAdmins] = useState([]);
    const [formData, setFormData] = useState({ username: '', password: '', full_name: '' });
    const [message, setMessage] = useState('');
    const [showServiceManager, setShowServiceManager] = useState(false); // State for Service Manager

    const fetchAdmins = async () => {
        try {
            const res = await axios.get('/api/admin/admins');
            setAdmins(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchAdmins();
    }, []);

    const handleAddAdmin = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/admin/admins', formData);
            setMessage('Admin added successfully');
            setFormData({ username: '', password: '', full_name: '' });
            fetchAdmins();
        } catch (err) {
            setMessage('Failed to add admin');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure?')) return;
        try {
            await axios.delete(`/api/admin/admins/${id}`);
            fetchAdmins();
        } catch (err) {
            alert('Failed to delete admin');
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">System Management</h1>
                <button
                    onClick={() => setShowServiceManager(true)}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 font-medium"
                >
                    Manage Services
                </button>
            </div>

            {/* Admin Management Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    Add New Admin
                </h3>
                {message && <p className="text-sm text-green-600 mb-4">{message}</p>}
                <form onSubmit={handleAddAdmin} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <input
                            type="text" required
                            className="w-full p-2 border border-gray-300 rounded"
                            value={formData.full_name}
                            onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                        <input
                            type="text" required
                            className="w-full p-2 border border-gray-300 rounded"
                            value={formData.username}
                            onChange={e => setFormData({ ...formData, username: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input
                            type="password" required
                            className="w-full p-2 border border-gray-300 rounded"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>
                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 h-10">
                        Create Admin
                    </button>
                </form>
            </div>

            {/* Admin List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <h3 className="text-lg font-bold text-gray-800 p-6 pb-0">Existing Admins</h3>
                <table className="w-full text-left mt-4">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-6 py-3 text-sm font-medium text-gray-500">Name</th>
                            <th className="px-6 py-3 text-sm font-medium text-gray-500">Username</th>
                            <th className="px-6 py-3 text-sm font-medium text-gray-500">Role</th>
                            <th className="px-6 py-3 text-sm font-medium text-gray-500">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {admins.map(admin => (
                            <tr key={admin.id} className="border-b last:border-0">
                                <td className="px-6 py-4">{admin.full_name}</td>
                                <td className="px-6 py-4">{admin.username}</td>
                                <td className="px-6 py-4 capitalize">{admin.role}</td>
                                <td className="px-6 py-4">
                                    <button
                                        onClick={() => handleDelete(admin.id)}
                                        className="text-red-600 hover:text-red-800"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Service Manager Modal */}
            {showServiceManager && (
                <ServicesManager
                    onClose={() => setShowServiceManager(false)}
                />
            )}
        </div>
    );
};
export default ManualEntry;
