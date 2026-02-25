import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, CheckCircle, Clock, Eye, X, Edit2 } from 'lucide-react';

const PendingWork = () => {
    const [pendingItems, setPendingItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedWork, setSelectedWork] = useState(null); // For View Modal
    const [editingTransaction, setEditingTransaction] = useState(null); // For Edit Modal
    const [editForm, setEditForm] = useState({});

    const fetchPendingWork = async () => {
        setLoading(true);
        try {
            // Get all transactions
            const res = await axios.get('/api/transactions');
            // Filter where status is 'pending'
            const pending = res.data.filter(t => t.status === 'pending');
            setPendingItems(pending);
        } catch (err) {
            console.error("Failed to fetch pending work", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingWork();
    }, []);

    const handleMarkDone = async (id) => {
        try {
            await axios.put(`/api/transactions/${id}/status`, { status: 'completed' });
            // Refresh list
            fetchPendingWork();
            if (selectedWork?.id === id) setSelectedWork(null); // Close modal if open
        } catch (err) {
            alert('Failed to update status');
        }
    };

    const handleEdit = (item) => {
        setEditingTransaction(item);
        setEditForm({ ...item });
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`/api/transactions/${editingTransaction.id}`, editForm);
            alert("Transaction updated successfully!");
            setEditingTransaction(null);
            fetchPendingWork();
        } catch (err) {
            console.error(err);
            alert("Failed to update transaction");
        }
    };

    // Filter logic
    const filteredItems = pendingItems.filter(item =>
        item.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Pending Work Queue</h1>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search pending work..."
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Table View Only */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Service / Work</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">Loading pending work...</td>
                                </tr>
                            ) : filteredItems.length > 0 ? (
                                filteredItems.map(item => (
                                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(item.transaction_date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{item.client_name}</div>
                                            <div className="text-xs text-gray-500">{item.client_phone}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{item.category}</div>
                                            <div className="text-xs text-gray-500 truncate max-w-xs">{item.description}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                                <Clock size={12} className="mr-1" /> Pending
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                            <button
                                                onClick={() => setSelectedWork(item)}
                                                className="text-blue-600 hover:text-blue-900 bg-blue-50 px-3 py-1 rounded-md"
                                                title="View Details"
                                            >
                                                View
                                            </button>
                                            <button
                                                onClick={() => handleEdit(item)}
                                                className="text-amber-600 hover:text-amber-900 bg-amber-50 px-3 py-1 rounded-md flex items-center inline-flex"
                                                title="Edit Details"
                                            >
                                                <Edit2 size={14} className="mr-1" /> Edit
                                            </button>
                                            <button
                                                onClick={() => handleMarkDone(item.id)}
                                                className="text-green-600 hover:text-green-900 bg-green-50 px-3 py-1 rounded-md flex items-center inline-flex"
                                                title="Mark as Completed"
                                            >
                                                <CheckCircle size={14} className="mr-1" /> Done
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">No pending work found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Details Modal */}
            {selectedWork && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg relative overflow-hidden">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-800">Work Details</h3>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => {
                                        const work = selectedWork;
                                        setSelectedWork(null);
                                        handleEdit(work);
                                    }}
                                    className="text-amber-600 hover:text-amber-700 p-1"
                                    title="Edit this work"
                                >
                                    <Edit2 size={20} />
                                </button>
                                <button onClick={() => setSelectedWork(null)} className="text-gray-400 hover:text-gray-600 p-1">
                                    <X size={24} />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-semibold">Client Name</label>
                                    <p className="text-gray-900 font-medium">{selectedWork.client_name}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-semibold">Phone</label>
                                    <p className="text-gray-900 font-medium">{selectedWork.client_phone}</p>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-gray-500 uppercase font-semibold">Service Category</label>
                                <p className="text-blue-600 font-medium text-lg">{selectedWork.category}</p>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                <label className="text-xs text-gray-500 uppercase font-semibold mb-1 block">Description / Notes</label>
                                <p className="text-gray-800 whitespace-pre-wrap">{selectedWork.description || 'No description provided.'}</p>
                            </div>

                            <div className="border-t pt-4">
                                <div className="grid grid-cols-3 gap-4 mb-4">
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase font-semibold">Base Amount</label>
                                        <p className="text-gray-900 font-bold">₹{selectedWork.amount || 0}</p>
                                    </div>
                                    <div className="text-center">
                                        <label className="text-xs text-gray-500 uppercase font-semibold">Charges</label>
                                        <p className="text-gray-900 font-medium">+ ₹{selectedWork.service_charges || 0}</p>
                                    </div>
                                    <div className="text-right">
                                        <label className="text-xs text-gray-500 uppercase font-semibold">Total Payable</label>
                                        <p className="text-blue-700 font-bold text-lg">
                                            ₹{selectedWork.total_amount || (parseFloat(selectedWork.amount || 0) + parseFloat(selectedWork.service_charges || 0))}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <label className="text-xs text-gray-500 uppercase font-semibold">Transaction Date</label>
                                    <p className="text-gray-600 text-sm">{new Date(selectedWork.transaction_date).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-end">
                            <button
                                onClick={() => handleMarkDone(selectedWork.id)}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center font-medium"
                            >
                                <CheckCircle size={18} className="mr-2" /> Mark as Completed
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editingTransaction && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-800">Edit Pending Work</h2>
                            <button onClick={() => setEditingTransaction(null)} className="text-gray-500 hover:text-gray-700">✕</button>
                        </div>
                        <form onSubmit={handleUpdate} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Client Name</label>
                                    <input
                                        type="text"
                                        className="mt-1 block w-full p-2 border rounded-md"
                                        value={editForm.client_name || ''}
                                        onChange={e => setEditForm({ ...editForm, client_name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Client Phone</label>
                                    <input
                                        type="text"
                                        className="mt-1 block w-full p-2 border rounded-md"
                                        value={editForm.client_phone || ''}
                                        onChange={e => setEditForm({ ...editForm, client_phone: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Base Amount (₹)</label>
                                    <input
                                        type="number"
                                        className="mt-1 block w-full p-2 border rounded-md"
                                        value={editForm.amount || 0}
                                        onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Service Charges (₹)</label>
                                    <input
                                        type="number"
                                        className="mt-1 block w-full p-2 border rounded-md"
                                        value={editForm.service_charges || 0}
                                        onChange={e => setEditForm({ ...editForm, service_charges: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Total Amount (₹)</label>
                                    <input
                                        type="number"
                                        className="mt-1 block w-full p-2 border rounded-md"
                                        value={editForm.total_amount || 0}
                                        onChange={e => setEditForm({ ...editForm, total_amount: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Status</label>
                                    <select
                                        className="mt-1 block w-full p-2 border rounded-md"
                                        value={editForm.status || 'pending'}
                                        onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700">Description</label>
                                    <textarea
                                        className="mt-1 block w-full p-2 border rounded-md"
                                        rows="2"
                                        value={editForm.description || ''}
                                        onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setEditingTransaction(null)}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Update Transaction
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PendingWork;

