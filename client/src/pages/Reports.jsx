import { useState, useEffect } from 'react';
import axios from 'axios';

const Reports = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        type: '',
        search: '',
        category: '',
        paymentMode: ''
    });

    const [services, setServices] = useState([]);

    const fetchServices = async () => {
        try {
            const res = await axios.get('/api/services');
            setServices(res.data);
        } catch (err) {
            console.error("Failed to fetch services", err);
        }
    };

    const fetchTransactions = async (currentFilters = filters) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (currentFilters.startDate) params.append('startDate', currentFilters.startDate);
            if (currentFilters.endDate) params.append('endDate', currentFilters.endDate);
            if (currentFilters.type) params.append('type', currentFilters.type);
            if (currentFilters.search) params.append('search', currentFilters.search);
            if (currentFilters.category) params.append('category', currentFilters.category);
            if (currentFilters.paymentMode) params.append('payment_mode', currentFilters.paymentMode);

            const res = await axios.get(`/api/transactions?${params.toString()}`);
            setTransactions(res.data);
        } catch (err) {
            console.error('Failed to fetch transactions', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
        fetchServices();
    }, []);

    const resetFilters = () => {
        const emptyFilters = {
            startDate: '',
            endDate: '',
            type: '',
            search: '',
            category: '',
            paymentMode: ''
        };
        setFilters(emptyFilters);
        fetchTransactions(emptyFilters);
    };

    // Calculate Totals
    const totalAmount = transactions.reduce((sum, t) => sum + (parseFloat(t.total_amount) || parseFloat(t.amount) || 0), 0);
    const totalCharges = transactions.reduce((sum, t) => {
        if (t.type === 'service_income') {
            return sum + (parseFloat(t.service_charges) || 0);
        }
        return sum;
    }, 0);

    const handleExport = () => {
        const headers = ['ID', 'Date', 'Type', 'Category', 'Client', 'Total Amount', 'Charges', 'Mode', 'Status'];
        const csvContent = [
            headers.join(','),
            ...transactions.map(t => [
                t.id,
                `"${new Date(t.transaction_date).toLocaleDateString()}"`,
                t.type,
                t.category || '-',
                `"${t.client_name || '-'}"`,
                t.total_amount || t.amount,
                t.type === 'service_income' ? t.service_charges : 0,
                t.payment_mode,
                t.status
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const handlePrint = () => {
        window.print();
    };

    const handleDeleteHistory = async () => {
        if (!window.confirm("WARNING: This will delete ALL transactions matching the current filters.\n\nData will be AUTOMATICALLY EXPORTED to CSV before deletion.\n\nAre you sure you want to proceed?")) {
            return;
        }

        // 1. Auto Export First (Safety)
        handleExport();

        // 2. Proceed with Delete
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            if (filters.type) params.append('type', filters.type);
            if (filters.category) params.append('category', filters.category);
            if (filters.paymentMode) params.append('payment_mode', filters.paymentMode);

            const res = await axios.delete(`/api/transactions?${params.toString()}`);
            alert(res.data.message);

            // Refresh
            fetchTransactions();
        } catch (err) {
            console.error(err);
            alert("Failed to delete transactions");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center no-print">
                <h1 className="text-2xl font-bold text-gray-800">Transaction Reports</h1>
                <div className="space-x-4">
                    <button
                        onClick={handleDeleteHistory}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                    >
                        Delete History
                    </button>
                    <button
                        onClick={handlePrint}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                        Print / Save PDF
                    </button>
                    <button
                        onClick={handleExport}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                    >
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-wrap gap-4 items-end no-print">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                        type="date"
                        className="p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                        value={filters.startDate}
                        onChange={e => setFilters({ ...filters, startDate: e.target.value })}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                        type="date"
                        className="p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-500"
                        value={filters.endDate}
                        onChange={e => setFilters({ ...filters, endDate: e.target.value })}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                        className="p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 w-32"
                        value={filters.type}
                        onChange={e => setFilters({ ...filters, type: e.target.value })}
                    >
                        <option value="">All</option>
                        <option value="service_income">Service</option>
                        <option value="deposit">Deposit</option>
                        <option value="withdraw">Withdraw</option>
                    </select>
                </div>

                {/* Category Filter */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                        className="p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 w-40"
                        value={filters.category}
                        onChange={e => setFilters({ ...filters, category: e.target.value })}
                    >
                        <option value="">All Categories</option>
                        {services.map(s => (
                            <option key={s.id} value={s.service_name}>{s.service_name}</option>
                        ))}
                    </select>
                </div>

                {/* Payment Mode Filter */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
                    <select
                        className="p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 w-32"
                        value={filters.paymentMode}
                        onChange={e => setFilters({ ...filters, paymentMode: e.target.value })}
                    >
                        <option value="">All</option>
                        <option value="cash">Cash</option>
                        <option value="online">Online</option>
                    </select>
                </div>

                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search client or description..."
                            className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                            value={filters.search}
                            onChange={e => setFilters({ ...filters, search: e.target.value })}
                        />
                    </div>
                </div>
                <button
                    onClick={() => fetchTransactions()}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    Apply
                </button>
                <button
                    onClick={resetFilters}
                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                    Reset
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3">Type</th>
                                <th className="px-6 py-3">Category</th>
                                <th className="px-6 py-3">Client</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Payment</th>
                                <th className="px-6 py-3 text-right">Total Amount</th>
                                <th className="px-6 py-3 text-right">Charges</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="8" className="text-center py-4">Loading...</td></tr>
                            ) : transactions.length === 0 ? (
                                <tr><td colSpan="8" className="text-center py-4 text-gray-500">No transactions found</td></tr>
                            ) : (
                                transactions.map((t) => (
                                    <tr key={t.id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            {new Date(t.transaction_date).toLocaleString('en-IN', {
                                                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </td>
                                        <td className="px-6 py-4 capitalize">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${t.type === 'service_income' ? 'bg-green-100 text-green-800' :
                                                t.type === 'deposit' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                {t.type.replace('_income', '')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">{t.category || '-'}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{t.client_name || '-'}</div>
                                            <div className="text-xs text-gray-500">{t.client_phone}</div>
                                        </td>
                                        <td className="px-6 py-4 capitalize">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${t.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                                                }`}>
                                                {t.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 capitalize">{t.payment_mode}</td>
                                        <td className="px-6 py-4 text-right font-bold">
                                            ₹{t.total_amount || t.amount}
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-500">
                                            {t.type === 'service_income' ? `₹${t.service_charges}` : '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        <tfoot className="bg-gray-100 font-bold text-gray-900">
                            <tr>
                                <td colSpan="6" className="px-6 py-4 text-right">Total:</td>
                                <td className="px-6 py-4 text-right">₹{totalAmount.toFixed(2)}</td>
                                <td className="px-6 py-4 text-right">₹{totalCharges.toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Reports;
