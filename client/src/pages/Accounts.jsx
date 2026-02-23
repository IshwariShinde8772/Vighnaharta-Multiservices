import { useState, useEffect } from 'react';
import axios from 'axios';
import { PlusCircle, Wallet, Edit2, Banknote, Trash2, Eye, X, ArrowDownLeft, ArrowUpRight, Save } from 'lucide-react';

const NOTE_DENOMINATIONS = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1];

const emptyDenominations = () =>
    NOTE_DENOMINATIONS.reduce((acc, n) => { acc[n] = 0; return acc; }, {});

const calcTotalFromDenominations = (denoms) =>
    NOTE_DENOMINATIONS.reduce((sum, n) => sum + (parseInt(denoms[n] || 0) * n), 0);

const Accounts = () => {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [message, setMessage] = useState('');

    // Detail Modal State
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [accountTransactions, setAccountTransactions] = useState([]);
    const [loadingTxns, setLoadingTxns] = useState(false);

    // Update Modal State
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [updateTarget, setUpdateTarget] = useState(null);
    const [updateForm, setUpdateForm] = useState({
        account_name: '',
        holder_name: '',
        low_balance_threshold: '',
        denominations: emptyDenominations(),
        balance: ''
    });

    // Form State
    const [formData, setFormData] = useState({
        account_name: '',
        holder_name: '',
        balance: '',
        type: 'savings_account',
        low_balance_threshold: '1000',
        denominations: emptyDenominations()
    });

    const isCashType = (type) => ['cash', 'petty_cash'].includes(type);

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
            .map(([k, v]) => `₹${k}×${v}`)
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

    // Handle denomination change in create form
    const handleCreateDenomChange = (note, value) => {
        const newDenoms = { ...formData.denominations, [note]: parseInt(value) || 0 };
        const total = calcTotalFromDenominations(newDenoms);
        setFormData({ ...formData, denominations: newDenoms, balance: total });
    };

    // Handle denomination change in update form
    const handleUpdateDenomChange = (note, value) => {
        const newDenoms = { ...updateForm.denominations, [note]: parseInt(value) || 0 };
        const total = calcTotalFromDenominations(newDenoms);
        setUpdateForm({ ...updateForm, denominations: newDenoms, balance: total });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                initial_balance: formData.balance,
                denominations: isCashType(formData.type) ? formData.denominations : {}
            };
            await axios.post('/api/accounts', payload);
            setMessage('Account created successfully');
            setShowModal(false);
            fetchAccounts();
            setFormData({
                account_name: '',
                holder_name: '',
                balance: '',
                type: 'savings_account',
                low_balance_threshold: '1000',
                denominations: emptyDenominations()
            });
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setMessage('Failed to create account');
        }
    };

    // Open edit modal for a card
    const openUpdateModal = (acc) => {
        setUpdateTarget(acc);
        setUpdateForm({
            account_name: acc.account_name,
            holder_name: acc.holder_name || '',
            low_balance_threshold: acc.low_balance_threshold || '1000',
            denominations: isCashType(acc.type)
                ? NOTE_DENOMINATIONS.reduce((obj, n) => {
                    obj[n] = parseInt((acc.denominations || {})[n] || 0);
                    return obj;
                }, {})
                : emptyDenominations(),
            balance: acc.balance || ''
        });
        setShowUpdateModal(true);
    };

    const handleUpdateSubmit = async (e) => {
        e.preventDefault();
        if (!updateTarget) return;
        try {
            const payload = {
                account_name: updateForm.account_name,
                holder_name: updateForm.holder_name,
                low_balance_threshold: updateForm.low_balance_threshold,
            };

            if (isCashType(updateTarget.type)) {
                payload.denominations = updateForm.denominations;
                payload.balance = calcTotalFromDenominations(updateForm.denominations);
            } else {
                payload.balance = updateForm.balance;
            }

            await axios.put(`/api/accounts/${updateTarget.id}`, payload);
            setMessage('Account updated successfully!');
            setShowUpdateModal(false);
            setUpdateTarget(null);
            await fetchAccounts();
            // If detail modal is open, refresh it
            if (selectedAccount?.id === updateTarget.id) {
                const res = await axios.get('/api/accounts');
                const updated = res.data.find(a => a.id === updateTarget.id);
                setSelectedAccount(updated);
            }
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            alert('Failed to update account');
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
            const res = await axios.get('/api/accounts');
            setAccounts(res.data);
            const updated = res.data.find(a => a.id === selectedAccount.id);
            setSelectedAccount(updated);
        } catch (err) {
            alert('Failed to update balance');
        }
    };

    const handleClearHistory = async () => {
        if (!selectedAccount) return;
        if (!window.confirm(`Are you sure you want to delete ALL transaction history for ${selectedAccount.account_name}? \n\nData will be AUTOMATICALLY EXPORTED before clearing from this view.`)) return;

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

        try {
            await axios.delete(`/api/accounts/${selectedAccount.id}/transactions`);
            setMessage('Account history archived (removed from view)');
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
            setAccounts(accounts.filter(a => a.id !== id));
            setMessage('Account deleted successfully');
        } catch (err) {
            console.error(err);
            alert('Failed to delete account. Ensure no active transactions depend on it.');
        }
    };

    return (
        <div className="p-6 space-y-6">
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
                                onClick={() => openUpdateModal(acc)}
                                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded"
                                title="Edit Account"
                            >
                                <Edit2 size={18} />
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
                                {isCashType(acc.type) ? <Banknote size={24} /> : <Wallet size={24} />}
                            </div>
                            {parseFloat(acc.balance) < parseFloat(acc.low_balance_threshold) && (
                                <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full animate-pulse font-bold">
                                    Low Funds!
                                </span>
                            )}
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">{acc.account_name}</h3>
                        <p className="text-sm text-gray-500 mb-2">{acc.holder_name}</p>
                        <p className="text-xs text-gray-400 mb-4 uppercase">{acc.type?.replace(/_/g, ' ')}</p>

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

                        {/* Denomination Preview for Cash accounts */}
                        {isCashType(acc.type) && acc.denominations && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <div className="flex justify-between items-center mb-2">
                                    <p className="text-xs text-gray-500 font-semibold">Note Breakdown</p>
                                    <button
                                        onClick={() => setSelectedAccount(acc)}
                                        className="text-xs text-blue-600 hover:underline"
                                    >
                                        View All
                                    </button>
                                </div>
                                {/* Note count table on card */}
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                    {NOTE_DENOMINATIONS.filter(n => parseInt(acc.denominations[n] || 0) > 0).slice(0, 6).map(note => (
                                        <div key={note} className="flex justify-between items-center bg-gray-50 px-2 py-1 rounded">
                                            <span className="font-semibold text-gray-700">₹{note}</span>
                                            <span className="font-bold text-blue-600">× {acc.denominations[note]}</span>
                                        </div>
                                    ))}
                                    {NOTE_DENOMINATIONS.filter(n => parseInt(acc.denominations[n] || 0) > 0).length === 0 && (
                                        <p className="text-gray-400 col-span-2">No notes recorded yet</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Always-visible Update button at bottom */}
                        <button
                            onClick={() => openUpdateModal(acc)}
                            className="mt-4 w-full flex items-center justify-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 py-1.5 rounded-lg hover:bg-amber-100 transition-colors"
                        >
                            <Edit2 size={14} /> Update Account
                        </button>
                    </div>
                ))}
            </div>

            {/* ===================== Create Account Modal ===================== */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Add New Account</h2>
                            <button onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
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
                                        onChange={e => setFormData({ ...formData, type: e.target.value, denominations: emptyDenominations(), balance: '' })}
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
                                    <label className="block text-sm font-medium mb-1">Low Balance Alert</label>
                                    <input
                                        type="number"
                                        className="w-full border p-2 rounded"
                                        value={formData.low_balance_threshold}
                                        onChange={e => setFormData({ ...formData, low_balance_threshold: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Cash Denomination Table - shown only for cash/petty_cash */}
                            {isCashType(formData.type) ? (
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-blue-700">
                                        💵 Enter Note Count (Cash In Hand)
                                    </label>
                                    <div className="border rounded-lg overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-100 text-gray-600 text-xs uppercase">
                                                <tr>
                                                    <th className="px-3 py-2 text-left">Note</th>
                                                    <th className="px-3 py-2 text-center">Count</th>
                                                    <th className="px-3 py-2 text-right">Total Value</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {NOTE_DENOMINATIONS.map(note => (
                                                    <tr key={note} className="hover:bg-gray-50">
                                                        <td className="px-3 py-1.5 font-bold text-gray-700">₹{note}</td>
                                                        <td className="px-3 py-1.5">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                className="w-full border rounded px-2 py-1 text-center text-sm"
                                                                value={formData.denominations[note] || ''}
                                                                onChange={e => handleCreateDenomChange(note, e.target.value)}
                                                                placeholder="0"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-1.5 text-right text-green-700 font-semibold">
                                                            {(parseInt(formData.denominations[note] || 0) * note) > 0
                                                                ? `₹${(parseInt(formData.denominations[note]) * note).toLocaleString('en-IN')}`
                                                                : '-'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot className="bg-blue-50">
                                                <tr>
                                                    <td colSpan={2} className="px-3 py-2 font-bold text-blue-700">Total Balance</td>
                                                    <td className="px-3 py-2 text-right font-bold text-blue-800 text-base">
                                                        ₹{parseFloat(formData.balance || 0).toLocaleString('en-IN')}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">Balance is auto-calculated from note counts above.</p>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium mb-1">Initial Balance (₹)</label>
                                    <input
                                        type="number"
                                        className="w-full border p-2 rounded"
                                        value={formData.balance}
                                        onChange={e => setFormData({ ...formData, balance: e.target.value })}
                                    />
                                </div>
                            )}

                            <div className="flex gap-4 mt-6">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-100 py-2 rounded">Cancel</button>
                                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded">Save Account</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ===================== Update Account Modal ===================== */}
            {showUpdateModal && updateTarget && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-amber-700">
                                ✏️ Update Account: {updateTarget.account_name}
                            </h2>
                            <button onClick={() => { setShowUpdateModal(false); setUpdateTarget(null); }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleUpdateSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Account Name</label>
                                <input
                                    required
                                    className="w-full border p-2 rounded"
                                    value={updateForm.account_name}
                                    onChange={e => setUpdateForm({ ...updateForm, account_name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Holder Name</label>
                                <input
                                    className="w-full border p-2 rounded"
                                    value={updateForm.holder_name}
                                    onChange={e => setUpdateForm({ ...updateForm, holder_name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Low Balance Alert Limit (₹)</label>
                                <input
                                    type="number"
                                    className="w-full border p-2 rounded"
                                    value={updateForm.low_balance_threshold}
                                    onChange={e => setUpdateForm({ ...updateForm, low_balance_threshold: e.target.value })}
                                />
                            </div>

                            {isCashType(updateTarget.type) ? (
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-amber-700">
                                        💵 Update Note Count (Current Cash in Hand)
                                    </label>
                                    <div className="border rounded-lg overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-100 text-gray-600 text-xs uppercase">
                                                <tr>
                                                    <th className="px-3 py-2 text-left">Note</th>
                                                    <th className="px-3 py-2 text-center">Count</th>
                                                    <th className="px-3 py-2 text-right">Value</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {NOTE_DENOMINATIONS.map(note => (
                                                    <tr key={note} className="hover:bg-amber-50">
                                                        <td className="px-3 py-1.5 font-bold text-gray-700">₹{note}</td>
                                                        <td className="px-3 py-1.5">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                className="w-full border rounded px-2 py-1 text-center text-sm"
                                                                value={updateForm.denominations[note] || ''}
                                                                onChange={e => handleUpdateDenomChange(note, e.target.value)}
                                                                placeholder="0"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-1.5 text-right text-amber-700 font-semibold">
                                                            {(parseInt(updateForm.denominations[note] || 0) * note) > 0
                                                                ? `₹${(parseInt(updateForm.denominations[note]) * note).toLocaleString('en-IN')}`
                                                                : '-'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot className="bg-amber-50">
                                                <tr>
                                                    <td colSpan={2} className="px-3 py-2 font-bold text-amber-700">Total Balance</td>
                                                    <td className="px-3 py-2 text-right font-bold text-amber-900 text-base">
                                                        ₹{parseFloat(updateForm.balance || 0).toLocaleString('en-IN')}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">Balance is auto-calculated from note counts.</p>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium mb-1">Current Balance (₹)</label>
                                    <input
                                        type="number"
                                        className="w-full border p-2 rounded"
                                        value={updateForm.balance}
                                        onChange={e => setUpdateForm({ ...updateForm, balance: e.target.value })}
                                    />
                                </div>
                            )}

                            <div className="flex gap-4 mt-6">
                                <button
                                    type="button"
                                    onClick={() => { setShowUpdateModal(false); setUpdateTarget(null); }}
                                    className="flex-1 bg-gray-100 py-2 rounded"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="flex-1 bg-amber-500 text-white py-2 rounded flex items-center justify-center gap-2">
                                    <Save size={16} /> Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ===================== View Details Modal ===================== */}
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
                                    {isCashType(selectedAccount.type) ? <Banknote size={28} /> : <Wallet size={28} />}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-800">{selectedAccount.account_name}</h2>
                                    <p className="text-sm text-gray-500">{selectedAccount.holder_name} • {selectedAccount.type?.replace(/_/g, ' ')}</p>
                                </div>
                                <button
                                    onClick={() => { setSelectedAccount(null); openUpdateModal(selectedAccount); }}
                                    className="ml-auto flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-100"
                                >
                                    <Edit2 size={14} /> Edit Account
                                </button>
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
                                            <Edit2 size={16} />
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

                                {/* Denominations Card - Full Note Table for Cash */}
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 overflow-y-auto max-h-48">
                                    {isCashType(selectedAccount.type) ? (
                                        <>
                                            <h3 className="font-bold text-gray-700 mb-2 border-b pb-1 text-xs sticky top-0 bg-gray-50">Current Notes in Hand</h3>
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="text-gray-500">
                                                        <th className="text-left py-0.5">Note</th>
                                                        <th className="text-center py-0.5">Count</th>
                                                        <th className="text-right py-0.5">Value</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {NOTE_DENOMINATIONS.map(note => {
                                                        const count = parseInt((selectedAccount.denominations || {})[note] || 0);
                                                        return (
                                                            <tr key={note} className={count > 0 ? 'bg-white' : ''}>
                                                                <td className="py-0.5 font-bold text-gray-700">₹{note}</td>
                                                                <td className="text-center font-mono text-blue-600 font-bold">{count > 0 ? count : '-'}</td>
                                                                <td className="text-right text-green-700 font-semibold">{count > 0 ? `₹${(count * note).toLocaleString('en-IN')}` : '-'}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                                <tfoot>
                                                    <tr className="border-t font-bold">
                                                        <td className="py-1 text-gray-700">Total</td>
                                                        <td className="text-center text-blue-700">
                                                            {NOTE_DENOMINATIONS.reduce((s, n) => s + parseInt((selectedAccount.denominations || {})[n] || 0), 0)}
                                                        </td>
                                                        <td className="text-right text-green-800">₹{parseFloat(selectedAccount.balance).toLocaleString('en-IN')}</td>
                                                    </tr>
                                                </tfoot>
                                            </table>
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
                                            {isCashType(selectedAccount.type) && (
                                                <th className="p-3">Notes Used</th>
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
                                                            {isCredit ? '+' : '-'}₹{parseFloat(txn.amount).toLocaleString('en-IN')}
                                                        </td>
                                                        {isCashType(selectedAccount.type) && (
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
