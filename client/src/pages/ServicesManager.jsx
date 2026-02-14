import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, X } from 'lucide-react';

const ServicesManager = ({ onClose }) => {
    const [services, setServices] = useState([]);
    const [newService, setNewService] = useState('');
    const [loading, setLoading] = useState(false);

    const fetchServices = async () => {
        try {
            const res = await axios.get('/api/services');
            setServices(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchServices();
    }, []);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newService) return;
        setLoading(true);
        try {
            await axios.post('/api/services', {
                service_name: newService,
                default_price: 0
            });
            setNewService('');
            fetchServices();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to add service');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this service?')) return;
        try {
            await axios.delete(`/api/services/${id}`);
            fetchServices();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <X size={24} />
                </button>

                <h2 className="text-xl font-bold mb-4">Manage Services</h2>

                {/* Add Form */}
                <form onSubmit={handleAdd} className="flex gap-2 mb-6">
                    <input
                        className="flex-1 border p-2 rounded"
                        placeholder="Service Name (e.g. Pan Card)"
                        value={newService}
                        onChange={e => setNewService(e.target.value)}
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
                    >
                        <Plus size={20} />
                    </button>
                </form>

                {/* List */}
                <div className="space-y-2 max-h-60 overflow-y-auto">
                    {services.length === 0 ? (
                        <p className="text-gray-500 text-center text-sm">No services added yet.</p>
                    ) : (
                        services.map(s => (
                            <div key={s.id} className="flex justify-between items-center p-3 bg-gray-50 rounded group">
                                <div>
                                    <p className="font-medium text-gray-800">{s.service_name}</p>
                                </div>
                                <button
                                    onClick={() => handleDelete(s.id)}
                                    className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ServicesManager;
