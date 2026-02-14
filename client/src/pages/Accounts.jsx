import { useState, useEffect } from 'react';
import axios from 'axios';
import { PlusCircle, Wallet, Edit, Banknote, Trash2, Eye, X, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

const Accounts = () => {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [message, setMessage] = useState('');

    // Detail Modal State
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [accountTransactions, setAccountTransactions] = useState([]);
    const [loadingTxns, setLoadingTxns] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        account_name: '',
        holder_name: '',
        balance: '',
        type: 'savings_account', // savings_account, current_account, od_cc, cash, petty_cash
        low_balance_threshold: '1000'
    });

    const fetchAccounts = async () => {
        try {
            const res = await axios.get('/api/accounts');
            setAccounts(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const formatDenominations = (txn) => {
        const d = txn.inward_denominations || txn.outward_denominations;
        if (!d) return '-';
        return Object.entries(d)
            .filter(([k, v]) => v > 0)
            .map(([k, v]) => `${k}x${v}`)
            .join(', ');
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    // Fetch transactions when an account is selected
    useEffect(() => {
        if (selectedAccount) {
            const fetchTxns = async () => {
                setLoadingTxns(true);
                try {
                    const res = await axios.get(`/api/transactions?account_id=${selectedAccount.id}`);
                    setAccountTransactions(res.data);
                } catch (err) {
                    console.error("Failed to fetch account transactions", err);
                } finally {
                    setLoadingTxns(false);
                }
            };
            fetchTxns();
        } else {
            setAccountTransactions([]);
        }
    }, [selectedAccount]);

    // State for Update Balance Modal
    const [showUpdateBalance, setShowUpdateBalance] = useState(false);
    const [updateAmount, setUpdateAmount] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // initial_balance defaults to balance if not provided
            const payload = { ...formData, initial_balance: formData.balance };
            await axios.post('/api/accounts', payload);
            setMessage('Account created successfully');
            setShowModal(false);
            fetchAccounts();
            setFormData({
                account_name: '',
                holder_name: '',
                balance: '',
                type: 'savings_account',
                low_balance_threshold: '1000'
            });
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setMessage('Failed to create account');
        }
    };

    const handleUpdateBalance = async (e) => {
        e.preventDefault();
        if (!selectedAccount) return;
        try {
            await axios.put(`/api/accounts/${selectedAccount.id}`, {
                ...selectedAccount,
                initial_balance: updateAmount
            });
            setMessage('Initial Balance updated successfully');
            setShowUpdateBalance(false);
            setUpdateAmount('');
            // Refresh
            const res = await axios.get('/api/accounts');
            setAccounts(res.data);
            // Update selected account in view
            const updated = res.data.find(a => a.id === selectedAccount.id);
            setSelectedAccount(updated);
        } catch (err) {
            alert('Failed to update balance');
        }
    };

    const handleClearHistory = async () => {
        if (!selectedAccount) return;
        if (!window.confirm(`Are you sure you want to delete ALL transaction history for ${selectedAccount.account_name}? \n\nData will be AUTOMATICALLY EXPORTED before clearing from this view.`)) return;

        // 1. Auto Export (Safety)
        // We reuse the basic export logic but filtered for this account
        const headers = ['Date', 'Description', 'Type', 'Amount', 'Payment Mode', 'Admin'];
        const csvContent = [
            headers.join(','),
            ...accountTransactions.map(t => [
                `"${new Date(t.transaction_date).toLocaleDateString()}"`,
                `"${t.description || t.category || '-'}"`,
                t.type,
                t.amount,
                t.payment_mode,
                t.created_by || 'admin'
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedAccount.account_name}_History_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();

        // 2. Proceed to Clear (Soft Delete)
        try {
            await axios.delete(`/api/accounts/${selectedAccount.id}/transactions`);
            setMessage('Account history archived (removed from view)');
            // Refresh transactions
            const res = await axios.get(`/api/transactions?account_id=${selectedAccount.id}`);
            setAccountTransactions(res.data);
        } catch (err) {
            alert('Failed to clear history');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this account?')) return;
        try {
            await axios.delete(`/api/accounts/${id}`);
            // Optimistic update
            setAccounts(accounts.filter(a => a.id !== id));
            setMessage('Account deleted successfully');
        } catch (err) {
            console.error(err);
            alert('Failed to delete account. Ensure no active transactions depend on it.');
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* ... Header & List ... */}

            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Fund Accounts</h1>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                    <PlusCircle size={20} />
                    <span>Add New Account</span>
                </button>
            </div>

            {message && <div className="p-3 bg-green-100 text-green-700 rounded">{message}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {accounts.map(acc => (
                    <div key={acc.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 relative group">
                        {/* Action Buttons */}
                        <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => setSelectedAccount(acc)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                title="View Details"
                            >
                                <Eye size={18} />
                            </button>
                            <button
                                onClick={() => handleDelete(acc.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                title="Delete Account"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>

                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 rounded-full bg-blue-50 text-blue-600">
                                {['cash', 'petty_cash'].includes(acc.type) ? <Banknote size={24} /> : <Wallet size={24} />}
                            </div>
                            {parseFloat(acc.balance) < parseFloat(acc.low_balance_threshold) && (
                                <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full animate-pulse font-bold">
                                    Low Funds!
                                </span>
                            )}
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">{acc.account_name}</h3>
                        <p className="text-sm text-gray-500 mb-4">{acc.holder_name}</p>

                        <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Initial Fund:</span>
                                <span className="font-semibold">₹{parseFloat(acc.initial_balance || acc.balance).toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between items-baseline pt-2 border-t border-gray-100">
                                <span className="text-sm text-gray-500">Current:</span>
                                <span className={`text-xl font-bold ${parseFloat(acc.balance) < parseFloat(acc.low_balance_threshold) ? 'text-red-600' : 'text-green-700'}`}>
                                    ₹{parseFloat(acc.balance).toLocaleString('en-IN')}
                                </span>
                            </div>
                        </div>

                        {/* Denomination Preview (First 3) */}
                        {['cash', 'petty_cash'].includes(acc.type) && acc.denominations && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <div className="flex justify-between items-center mb-2">
                                    <p className="text-xs text-gray-500">Cash Breakdown</p>
                                    <button
                                        onClick={() => setSelectedAccount(acc)}
                                        className="text-xs text-blue-600 hover:underline"
                                    >
                                        View All
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs">
                                    {Object.entries(acc.denominations || {})
                                        .filter(([_, count]) => parseInt(count) > 0)
                                        .slice(0, 3)
                                        .map(([note, count]) => (
                                            <div key={note} className="bg-gray-50 px-2 py-1 rounded">
                                                <span className="font-semibold">{note}:</span> {count}
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Create Account Modal - unchanged mostly */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">Add New Account</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* ... Fields ... */}
                            <div>
                                <label className="block text-sm font-medium mb-1">Account Name</label>
                                <input
                                    required
                                    className="w-full border p-2 rounded"
                                    value={formData.account_name}
                                    onChange={e => setFormData({ ...formData, account_name: e.target.value })}
                                    placeholder="e.g. SBI Current, Petty Cash"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Holder Name</label>
                                <input
                                    className="w-full border p-2 rounded"
                                    value={formData.holder_name}
                                    onChange={e => setFormData({ ...formData, holder_name: e.target.value })}
                                    placeholder="e.g. Pratik Dhamane"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Type</label>
                                    <select
                                        className="w-full border p-2 rounded"
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                                    >
                                        <option value="savings_account">Savings Account</option>
                                        <option value="current_account">Current Account</option>
                                        <option value="od_cc">OD / Credit Card</option>
                                        <option value="wallet">Wallet / Other</option>
                                        <option value="cash">Cash Hand</option>
                                        <option value="petty_cash">Petty Cash</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Initial Balance</label>
                                    <input
                                        type="number"
                                        className="w-full border p-2 rounded"
                                        value={formData.balance}
                                        onChange={e => setFormData({ ...formData, balance: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Low Balance Alert Limit</label>
                                <input
                                    type="number"
                                    className="w-full border p-2 rounded"
                                    value={formData.low_balance_threshold}
                                    onChange={e => setFormData({ ...formData, low_balance_threshold: e.target.value })}
                                />
                            </div>
                            <div className="flex gap-4 mt-6">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-100 py-2 rounded">Cancel</button>
                                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Details Modal */}
            {selectedAccount && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-5xl relative overflow-hidden flex flex-col max-h-[90vh]">
                        <button
                            onClick={() => setSelectedAccount(null)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            <X size={24} />
                        </button>

                        <div className="flex-shrink-0 mb-6 border-b border-gray-100 pb-6">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                                    {['cash', 'petty_cash'].includes(selectedAccount.type) ? <Banknote size={28} /> : <Wallet size={28} />}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-800">{selectedAccount.account_name}</h2>
                                    <p className="text-sm text-gray-500">{selectedAccount.holder_name} • {selectedAccount.type}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Initial Fund Card */}
                                <div className="bg-purple-50 p-4 rounded-lg flex flex-col justify-center relative group">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-xs text-purple-600 font-semibold uppercase mb-1">Initial / Opening Fund</p>
                                            <p className="text-2xl font-bold text-purple-900">₹{parseFloat(selectedAccount.initial_balance || selectedAccount.balance).toLocaleString('en-IN')}</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setUpdateAmount(selectedAccount.initial_balance || selectedAccount.balance);
                                                setShowUpdateBalance(true);
                                            }}
                                            className="p-1 text-purple-600 hover:bg-purple-100 rounded"
                                            title="Update Initial Balance"
                                        >
                                            <Edit size={16} />
                                        </button>
                                    </div>
                                    {showUpdateBalance && (
                                        <div className="absolute inset-0 bg-white p-2 rounded shadow-lg flex items-center space-x-2">
                                            <input
                                                autoFocus
                                                type="number"
                                                className="w-full p-1 border rounded text-sm"
                                                value={updateAmount}
                                                onChange={e => setUpdateAmount(e.target.value)}
                                            />
                                            <button
                                                onClick={handleUpdateBalance}
                                                className="bg-green-600 text-white p-1 rounded hover:bg-green-700"
                                            ><ArrowDownLeft size={16} /></button>
                                            <button
                                                onClick={() => setShowUpdateBalance(false)}
                                                className="bg-gray-200 text-gray-600 p-1 rounded hover:bg-gray-300"
                                            ><X size={16} /></button>
                                        </div>
                                    )}
                                </div>

                                {/* Current Balance Card */}
                                <div className={`p-4 rounded-lg flex flex-col justify-center ${parseFloat(selectedAccount.balance) < parseFloat(selectedAccount.low_balance_threshold) ? 'bg-red-50 border border-red-200' : 'bg-green-50'}`}>
                                    <p className={`text-xs font-semibold uppercase mb-1 ${parseFloat(selectedAccount.balance) < parseFloat(selectedAccount.low_balance_threshold) ? 'text-red-700' : 'text-green-700'}`}>Current Balance</p>
                                    <p className={`text-3xl font-bold ${parseFloat(selectedAccount.balance) < parseFloat(selectedAccount.low_balance_threshold) ? 'text-red-900' : 'text-green-900'}`}>
                                        ₹{parseFloat(selectedAccount.balance).toLocaleString('en-IN')}
                                    </p>
                                    {parseFloat(selectedAccount.balance) < parseFloat(selectedAccount.low_balance_threshold) && (
                                        <p className="text-xs font-bold text-red-600 mt-1 animate-pulse">Low Balance Alert!</p>
                                    )}
                                </div>

                                {/* Denominations Card */}
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 overflow-y-auto max-h-32">
                                    {['cash', 'petty_cash'].includes(selectedAccount.type) ? (
                                        <>
                                            <h3 className="font-bold text-gray-700 mb-2 border-b pb-1 text-xs sticky top-0 bg-gray-50">Current Notes</h3>
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                {Object.entries(selectedAccount.denominations || {}).map(([note, count]) => (
                                                    <div key={note} className="flex justify-between items-center bg-white p-1.5 rounded shadow-sm">
                                                        <span className="font-bold text-gray-700">₹{note}</span>
                                                        <span className="font-mono text-blue-600 font-bold">{count}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-gray-400 text-xs text-center">
                                            Denominations not applicable for Bank Accounts
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Transaction History Table */}
                        <div className="flex-1 overflow-hidden flex flex-col">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-lg font-bold text-gray-800">Transaction History</h3>
                                <button
                                    onClick={handleClearHistory}
                                    className="text-xs text-red-600 hover:bg-red-50 px-3 py-1.5 rounded border border-red-200 flex items-center"
                                >
                                    <Trash2 size={14} className="mr-1" /> Clear History
                                </button>
                            </div>
                            <div className="overflow-auto border rounded-lg max-h-full">
                                <table className="w-full text-left bg-white">
                                    <thead className="bg-gray-100 text-xs text-gray-600 uppercase font-semibold sticky top-0 z-10">
                                        <tr>
                                            <th className="p-3">Date</th>
                                            <th className="p-3">Description</th>
                                            <th className="p-3">Type</th>
                                            <th className="p-3">Admin</th>
                                            <th className="p-3 text-right">Amount</th>
                                            {['cash', 'petty_cash'].includes(selectedAccount.type) && (
                                                <th className="p-3">Notes</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-sm">
                                        {loadingTxns ? (
                                            <tr><td colSpan="6" className="p-4 text-center">Loading...</td></tr>
                                        ) : accountTransactions.length > 0 ? (
                                            accountTransactions.map(txn => {
                                                const isCredit = txn.inward_account_id == selectedAccount.id;
                                                return (
                                                    <tr key={txn.id} className={`hover:bg-gray-50 ${isCredit ? 'bg-green-50/30' : 'bg-red-50/30'}`}>
                                                        <td className="p-3 text-gray-500 whitespace-nowrap">
                                                            {new Date(txn.transaction_date).toLocaleDateString()}
                                                        </td>
                                                        <td className="p-3">
                                                            <div className="font-medium text-gray-900">{txn.client_name || '-'}</div>
                                                            <div className="text-xs text-gray-500 truncate max-w-xs">{txn.description || txn.category}</div>
                                                        </td>
                                                        <td className="p-3">
                                                            <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-bold ${isCredit ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                {isCredit ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                                                                <span className="uppercase">{isCredit ? 'Credit' : 'Debit'}</span>
                                                            </span>
                                                        </td>
                                                        <td className="p-3 text-xs text-gray-600 capitalize">
                                                            {txn.created_by || '-'}
                                                        </td>
                                                        <td className={`p-3 text-right font-bold ${isCredit ? 'text-green-700' : 'text-red-700'}`}>
                                                            {isCredit ? '+' : '-'}₹{txn.amount}
                                                        </td>
                                                        {['cash', 'petty_cash'].includes(selectedAccount.type) && (
                                                            <td className="p-3 text-xs text-gray-500 break-all max-w-xs">
                                                                {formatDenominations(txn)}
                                                            </td>
                                                        )}
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr><td colSpan="6" className="p-4 text-center text-gray-500">No transactions found.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="mt-4 flex justify-end flex-shrink-0">
                            <button
                                onClick={() => setSelectedAccount(null)}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-6 py-2 rounded-lg font-medium"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Accounts;
