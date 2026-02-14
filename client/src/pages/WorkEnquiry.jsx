import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { PlusCircle } from 'lucide-react';
import CashCalculator from '../components/CashCalculator';
import ServicesManager from './ServicesManager';

const WorkEnquiry = () => {
    const [activeTab, setActiveTab] = useState('service_income'); // 'service_income', 'deposit', 'withdraw'
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [accounts, setAccounts] = useState([]);

    // Services State
    const [services, setServices] = useState([]);
    const [showServiceManager, setShowServiceManager] = useState(false);

    const [formData, setFormData] = useState({
        client_name: '',
        client_phone: '',
        category: '', // For service
        description: '',
        cost_price: '',
        selling_price: '',
        service_charges: '',
        payment_mode: 'cash',
        inward_account_id: '',
        outward_account_id: '',
        is_urgent: false,
    });

    const [notes, setNotes] = useState({});
    const [cashTotal, setCashTotal] = useState(0);

    // New State for Dual Cash Calculation
    const [cashReceivedTotal, setCashReceivedTotal] = useState(0);
    const [cashReceivedNotes, setCashReceivedNotes] = useState({});

    const [cashReturnedTotal, setCashReturnedTotal] = useState(0);
    const [cashReturnedNotes, setCashReturnedNotes] = useState({});

    const topRef = useRef(null);

    // Fetch Accounts and Services
    const fetchAccounts = async () => {
        try {
            const res = await axios.get('/api/accounts');
            setAccounts(res.data);
        } catch (err) {
            console.error("Failed to fetch accounts", err);
        }
    };

    const fetchServices = async () => {
        try {
            const res = await axios.get('/api/services');
            setServices(res.data);
        } catch (err) {
            console.error("Failed to fetch services", err);
        }
    };

    useEffect(() => {
        fetchAccounts();
        fetchServices();
    }, []);

    // Legacy handler kept for compatibility if needed, but we use specific handlers below
    const handleCashChange = (total, notesObj) => {
        setCashTotal(total);
        setNotes(notesObj);
    };

    const handleCashReceivedChange = (total, notesObj) => {
        setCashReceivedTotal(total);
        setCashReceivedNotes(notesObj);
    };

    const handleCashReturnedChange = (total, notesObj) => {
        setCashReturnedTotal(total);
        setCashReturnedNotes(notesObj);
    };

    // Calculate Total
    const amount = parseFloat(formData.selling_price) || 0;
    const charges = parseFloat(formData.service_charges) || 0;
    const totalPayable = amount + charges;

    // Handle Service Selection
    const handleServiceChange = (e) => {
        const serviceName = e.target.value;
        const service = services.find(s => s.service_name === serviceName);
        setFormData({
            ...formData,
            category: serviceName,
            selling_price: service ? service.default_price : formData.selling_price // Auto-fill price if available
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ text: '', type: '' });

        try {
            // Validation
            let finalAmount = 0;

            if (formData.payment_mode === 'cash') {
                let expectedTotal = 0;
                if (activeTab === 'service_income') {
                    expectedTotal = totalPayable;

                    // Specific Validation for Service Income (Received - Returned = Payable)
                    const netCash = cashReceivedTotal - cashReturnedTotal;
                    if (Math.abs(netCash - expectedTotal) > 0.01) {
                        throw new Error(`Net Cash (Received ₹${cashReceivedTotal} - Returned ₹${cashReturnedTotal} = ₹${netCash}) must match Total Payable (₹${expectedTotal})`);
                    }

                } else {
                    // For Deposit and Withdraw
                    expectedTotal = parseFloat(formData.selling_price) || 0;

                    if (activeTab === 'deposit') {
                        // Deposit = Net Cash Coming IN (Received - Returned)
                        // Example: Customer gives 2000, Deposit 500. Returned 1500. Net In 500.
                        const netCashIn = cashReceivedTotal - cashReturnedTotal;
                        if (Math.abs(netCashIn - expectedTotal) > 0.01) {
                            throw new Error(`Net Cash Received (Received ₹${cashReceivedTotal} - Returned ₹${cashReturnedTotal} = ₹${netCashIn}) must match Deposit Amount (₹${expectedTotal})`);
                        }
                    } else if (activeTab === 'withdraw') {
                        // Withdraw = Net Cash Going OUT (Returned - Received)
                        // Example: Withdraw 1000. Customer gives 0. Returned 1000. Net Out 1000.
                        const netCashOut = cashReturnedTotal - cashReceivedTotal;
                        if (Math.abs(netCashOut - expectedTotal) > 0.01) {
                            throw new Error(`Net Cash Returned (Returned ₹${cashReturnedTotal} - Received ₹${cashReceivedTotal} = ₹${netCashOut}) must match Withdraw Amount (₹${expectedTotal})`);
                        }
                    }
                }
            }

            if (activeTab === 'service_income') {
                finalAmount = amount;
            } else {
                // Deposit/Withdraw
                finalAmount = parseFloat(formData.selling_price) || 0;
            }

            // Prepare Payload
            const payload = {
                type: activeTab,
                client_name: formData.client_name,
                client_phone: formData.client_phone,
                category: formData.category,
                description: formData.description,
                payment_mode: formData.payment_mode,

                // Financials
                amount: activeTab === 'service_income' ? amount : (parseFloat(formData.selling_price) || 0),
                service_charges: charges,
                total_amount: totalPayable,
                cost_price: formData.cost_price || 0,
                selling_price: formData.selling_price || 0,

                // Account Logic
                inward_account_id: formData.inward_account_id || null,
                outward_account_id: formData.outward_account_id || null,

                // Status logic handled by backend mainly, but we pass is_urgent
                is_urgent: formData.is_urgent,
                // Explicitly send pending if not urgent for work enquiries
                status: formData.is_urgent ? 'completed' : 'pending',

                // Denominations
                // Send BOTH received and returned for ALL types if Cash mode (supports exchange)
                inward_denominations: (formData.payment_mode === 'cash') ? cashReceivedNotes : {},
                outward_denominations: (formData.payment_mode === 'cash') ? cashReturnedNotes : {},

                // Legacy support (optional, can send if backend expects 'notes')
                notes: ((activeTab === 'service_income' && formData.payment_mode === 'cash') || activeTab !== 'service_income') ? notes : {},

                // Add Admin Username
                created_by: JSON.parse(localStorage.getItem('user'))?.username || 'admin',
            };

            // Adjust logic for Deposit/Withdraw specific mapping
            if (activeTab !== 'service_income') {
                payload.amount = parseFloat(formData.selling_price) || 0;
                payload.total_amount = payload.amount + charges;

                if (activeTab === 'deposit') {
                    // For deposits, if marked as 'Completed' (is_urgent=true), status is completed.
                    // If marked as 'Pending' (is_urgent=false), status is pending.
                    payload.status = formData.is_urgent ? 'completed' : 'pending';
                } else {
                    // Withdraws always completed
                    payload.status = 'completed';
                }
            }

            await axios.post('/api/transactions', payload);

            setMessage({ text: 'Transaction saved successfully!', type: 'success' });
            topRef.current?.scrollIntoView({ behavior: 'smooth' });

            // Reset form
            setFormData({
                ...formData,
                client_name: '',
                client_phone: '',
                description: '',
                cost_price: '',
                selling_price: '',
                service_charges: '',
                is_urgent: false,
                category: '',
            });
            setNotes({});
            setCashTotal(0);
            setCashReceivedTotal(0);
            setCashReturnedTotal(0);
            setCashReceivedNotes({});
            setCashReturnedNotes({});

        } catch (err) {
            setMessage({
                text: err.response?.data?.message || err.message || 'Transaction failed',
                type: 'error'
            });
            topRef.current?.scrollIntoView({ behavior: 'smooth' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-[95%] mx-auto" ref={topRef}>
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Work Enquiry / Transaction</h1>

            {message.text && (
                <div className={`p-4 mb-6 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message.text}
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                    {[
                        { id: 'service_income', label: 'New Work / Service' },
                        { id: 'deposit', label: 'Deposit (In)' },
                        { id: 'withdraw', label: 'Withdraw (Out)' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${activeTab === tab.id
                                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="p-6">
                    <form onSubmit={handleSubmit} autoComplete="off">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                            {/* Left Column: Form Fields */}
                            <div className="space-y-6">

                                {/* 0. Service Selection (First Priority) */}
                                {activeTab === 'service_income' && (
                                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="block text-sm uppercase text-blue-700 font-bold">Select Service</label>
                                            <button
                                                type="button"
                                                onClick={() => setShowServiceManager(true)}
                                                className="text-xs text-blue-600 hover:underline flex items-center bg-white px-2 py-1 rounded border border-blue-200"
                                            >
                                                <PlusCircle size={12} className="mr-1" /> Add New Service
                                            </button>
                                        </div>
                                        <select
                                            className="w-full p-2 border border-blue-300 rounded font-medium text-gray-700 focus:ring-2 focus:ring-blue-500"
                                            value={formData.category}
                                            onChange={handleServiceChange}
                                        >
                                            <option value="">-- Choose a Service --</option>
                                            {services.map(s => (
                                                <option key={s.id} value={s.service_name}>{s.service_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* 1. Client Details */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-xs uppercase text-gray-500 font-semibold mb-1">First Name / Client</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                            value={formData.client_name}
                                            onChange={e => setFormData({ ...formData, client_name: e.target.value })}
                                            placeholder="Client Name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase text-gray-500 font-semibold mb-1">Mobile</label>
                                        <input
                                            type="tel"
                                            className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                            value={formData.client_phone}
                                            onChange={e => setFormData({ ...formData, client_phone: e.target.value })}
                                            placeholder="Mobile"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1">
                                    <label className="block text-xs uppercase text-gray-500 font-semibold mb-1">Address / Note</label>
                                    <textarea
                                        rows="2"
                                        className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500"
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Address or Description"
                                    />
                                </div>

                                {/* 2. Financials */}
                                <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <div>
                                        <label className="block text-xs uppercase text-gray-500 font-semibold mb-1">Base Amount</label>
                                        <input
                                            type="number"
                                            className="w-full p-2 border border-gray-300 rounded font-semibold text-gray-800"
                                            value={formData.selling_price}
                                            onChange={e => setFormData({ ...formData, selling_price: e.target.value })}
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase text-gray-500 font-semibold mb-1">Charges</label>
                                        <input
                                            type="number"
                                            className="w-full p-2 border border-gray-300 rounded"
                                            value={formData.service_charges}
                                            onChange={e => setFormData({ ...formData, service_charges: e.target.value })}
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase text-gray-500 font-semibold mb-1">Total</label>
                                        <div className="w-full p-2 bg-gray-200 border border-gray-300 rounded font-bold text-gray-800">
                                            ₹{totalPayable || 0}
                                        </div>
                                    </div>
                                </div>

                                {/* 3. Account Selection */}
                                {/* 3. Account Selection */}
                                <div className="grid grid-cols-2 gap-4">
                                    {(activeTab === 'service_income' || activeTab === 'deposit') && (
                                        <div className="col-span-1">
                                            <label className="block text-xs uppercase text-gray-500 font-semibold mb-1">Inward Account (Admin)</label>
                                            <select
                                                className="w-full p-2 border border-gray-300 rounded bg-green-50"
                                                value={formData.inward_account_id}
                                                onChange={e => setFormData({ ...formData, inward_account_id: e.target.value })}
                                                required={activeTab !== 'withdraw'}
                                            >
                                                <option value="">Select Account (Receive)</option>
                                                {accounts.map(acc => (
                                                    <option key={acc.id} value={acc.id}>{acc.account_name} ({acc.type.replace(/_/g, ' ').toUpperCase()})</option>
                                                ))}
                                            </select>
                                            {/* Low Balance Warning for Inward Account */}
                                            {formData.inward_account_id && (() => {
                                                const acc = accounts.find(a => a.id == formData.inward_account_id);
                                                if (acc && parseFloat(acc.balance) < parseFloat(acc.low_balance_threshold)) {
                                                    return (
                                                        <div className="text-xs text-red-600 font-bold mt-1 animate-pulse">
                                                            ⚠️ Low Balance Alert: ₹{acc.balance}
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>
                                    )}

                                    {(activeTab === 'withdraw') && (
                                        <div className="col-span-1">
                                            <label className="block text-xs uppercase text-gray-500 font-semibold mb-1">Outward Account (Admin)</label>
                                            <select
                                                className="w-full p-2 border border-gray-300 rounded bg-red-50"
                                                value={formData.outward_account_id}
                                                onChange={e => setFormData({ ...formData, outward_account_id: e.target.value })}
                                                required
                                            >
                                                <option value="">Select Account (Pay)</option>
                                                {accounts.map(acc => (
                                                    <option key={acc.id} value={acc.id}>{acc.account_name} ({acc.type.replace(/_/g, ' ').toUpperCase()})</option>
                                                ))}
                                            </select>
                                            {/* Low Balance Warning for Outward Account */}
                                            {formData.outward_account_id && (() => {
                                                const acc = accounts.find(a => a.id == formData.outward_account_id);
                                                if (acc && parseFloat(acc.balance) < parseFloat(acc.low_balance_threshold)) {
                                                    return (
                                                        <div className="text-xs text-red-600 font-bold mt-1 animate-pulse">
                                                            ⚠️ Low Balance Alert: ₹{acc.balance}
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>
                                    )}
                                </div>

                                {/* Service Mode */}
                                {activeTab === 'service_income' && (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs uppercase text-gray-500 font-semibold mb-1">Mode</label>
                                                <select
                                                    className="w-full p-2 border border-gray-300 rounded"
                                                    value={formData.payment_mode}
                                                    onChange={e => setFormData({ ...formData, payment_mode: e.target.value })}
                                                >
                                                    <option value="cash">Cash</option>
                                                    <option value="online">Online / UPI</option>
                                                </select>
                                            </div>
                                            <div className="flex items-end pb-2">
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        type="checkbox"
                                                        id="urgent"
                                                        checked={formData.is_urgent}
                                                        onChange={e => setFormData(prev => ({ ...prev, is_urgent: e.target.checked }))}
                                                        className="w-5 h-5 text-red-600 rounded"
                                                    />
                                                    <label htmlFor="urgent" className="font-bold text-red-600">URGENT WORK</label>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Deposit Mode */}
                                {activeTab === 'deposit' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs uppercase text-gray-500 font-semibold mb-1">Mode</label>
                                            <select
                                                className="w-full p-2 border border-gray-300 rounded"
                                                value={formData.payment_mode}
                                                onChange={e => setFormData({ ...formData, payment_mode: e.target.value })}
                                            >
                                                <option value="cash">Cash</option>
                                                <option value="online">Online / UPI</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs uppercase text-gray-500 font-semibold mb-1">Status</label>
                                            <div className="flex items-center space-x-4 mt-2">
                                                <label className="flex items-center space-x-2">
                                                    <input
                                                        type="radio"
                                                        name="depositStatus"
                                                        checked={!formData.is_urgent}
                                                        onChange={() => setFormData(prev => ({ ...prev, is_urgent: false }))}
                                                    />
                                                    <span className="text-sm">Pending</span>
                                                </label>
                                                <label className="flex items-center space-x-2">
                                                    <input
                                                        type="radio"
                                                        name="depositStatus"
                                                        checked={formData.is_urgent}
                                                        onChange={() => setFormData(prev => ({ ...prev, is_urgent: true }))}
                                                    />
                                                    <span className="text-sm font-bold text-green-600">Completed</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </div>

                            {/* Right Column: Cash Calculator */}
                            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 text-sm">
                                <h3 className="text-md font-bold text-gray-700 mb-4">Cash Transaction Details</h3>
                                {(formData.payment_mode === 'cash') ? (
                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                        {/* Show BOTH calculators for ALL tabs if Cash (per user request for Deposits/Withdraws) */}
                                        <div className="h-full">
                                            <CashCalculator
                                                key={'received-' + activeTab}
                                                title="Received from Customer (IN)"
                                                onChange={handleCashReceivedChange}
                                            />
                                        </div>

                                        <div className="h-full">
                                            <CashCalculator
                                                key={'returned-' + activeTab}
                                                title="Returned to Customer (OUT)"
                                                onChange={handleCashReturnedChange}
                                            />
                                        </div>

                                        {/* Summary for Service Income */}
                                        {activeTab === 'service_income' && (
                                            <div className="xl:col-span-2 bg-blue-100 p-3 rounded-lg border border-blue-200">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span>Received:</span>
                                                    <span className="font-mono text-green-700 font-bold">+ {cashReceivedTotal}</span>
                                                </div>
                                                <div className="flex justify-between items-center mb-1">
                                                    <span>Returned:</span>
                                                    <span className="font-mono text-red-700 font-bold">- {cashReturnedTotal}</span>
                                                </div>
                                                <div className="flex justify-between items-center border-t border-blue-200 pt-1 mt-1">
                                                    <span className="font-bold">Net Cash:</span>
                                                    <span className={`font-mono font-bold ${(cashReceivedTotal - cashReturnedTotal) === totalPayable ? 'text-blue-800' : 'text-orange-600'}`}>
                                                        ₹{cashReceivedTotal - cashReturnedTotal}
                                                    </span>
                                                </div>
                                                {Math.abs((cashReceivedTotal - cashReturnedTotal) - totalPayable) > 0.01 && (
                                                    <div className="text-xs text-orange-600 mt-1 font-semibold">
                                                        ⚠️ Mismatch! Target: ₹{totalPayable}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                        <p>Cash Calculator disabled for Online payments.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end">
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex items-center space-x-2 bg-blue-900 text-white px-8 py-3 rounded-lg hover:bg-blue-800 disabled:opacity-50 font-bold"
                            >
                                {loading ? 'Processing...' : 'Add Work / Transaction'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Service Manager Modal */}
            {showServiceManager && (
                <ServicesManager
                    onClose={() => {
                        setShowServiceManager(false);
                        fetchServices(); // Refresh list on close
                    }}
                />
            )}
        </div>
    );
};

export default WorkEnquiry;
