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
        category: '',
        description: '',
        cost_price: '',
        selling_price: '',
        service_charges: '',
        payment_mode: 'cash',
        inward_account_id: '',
        outward_account_id: '',
        is_urgent: false,
    });

    // Dual Cash Calculation State
    const [cashReceivedTotal, setCashReceivedTotal] = useState(0);
    const [cashReceivedNotes, setCashReceivedNotes] = useState({});
    const [cashReturnedTotal, setCashReturnedTotal] = useState(0);
    const [cashReturnedNotes, setCashReturnedNotes] = useState({});

    const topRef = useRef(null);

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

    const handleCashReceivedChange = (total, notesObj) => {
        setCashReceivedTotal(total);
        setCashReceivedNotes(notesObj);
    };

    const handleCashReturnedChange = (total, notesObj) => {
        setCashReturnedTotal(total);
        setCashReturnedNotes(notesObj);
    };

    // Calculate Totals
    const amount = parseFloat(formData.selling_price) || 0;
    const charges = parseFloat(formData.service_charges) || 0;
    const totalPayable = amount + charges;

    // Net cash summary (for display)
    const netCashReceived = cashReceivedTotal - cashReturnedTotal; // positive = net cash IN
    const netCashPaid = cashReturnedTotal - cashReceivedTotal;    // positive = net cash OUT

    // Handle Service Selection
    const handleServiceChange = (e) => {
        const serviceName = e.target.value;
        const service = services.find(s => s.service_name === serviceName);
        setFormData({
            ...formData,
            category: serviceName,
            selling_price: service ? service.default_price : formData.selling_price
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ text: '', type: '' });

        try {
            let finalAmount = 0;

            // === CASH MODE VALIDATION ===
            if (formData.payment_mode === 'cash') {
                if (activeTab === 'service_income') {
                    const netCash = cashReceivedTotal - cashReturnedTotal;
                    if (Math.abs(netCash - totalPayable) > 0.01) {
                        throw new Error(`Net Cash (Received ₹${cashReceivedTotal} - Returned ₹${cashReturnedTotal} = ₹${netCash}) must match Total Payable (₹${totalPayable})`);
                    }
                } else if (activeTab === 'deposit') {
                    // Deposit cash: customer gives cash, admin deposits to bank (net cash IN from customer)
                    const netCashIn = cashReceivedTotal - cashReturnedTotal;
                    const expectedDeposit = parseFloat(formData.selling_price) || 0;
                    if (Math.abs(netCashIn - expectedDeposit) > 0.01) {
                        throw new Error(`Net Cash Received (₹${cashReceivedTotal} - ₹${cashReturnedTotal} = ₹${netCashIn}) must match Deposit Amount (₹${expectedDeposit})`);
                    }
                } else if (activeTab === 'withdraw') {
                    // Withdraw cash: customer wants cash, admin gives cash out (net cash OUT to customer)
                    const netCashOut = cashReturnedTotal - cashReceivedTotal;
                    const expectedWithdraw = parseFloat(formData.selling_price) || 0;
                    if (Math.abs(netCashOut - expectedWithdraw) > 0.01) {
                        throw new Error(`Net Cash Given Out (₹${cashReturnedTotal} - returned ₹${cashReceivedTotal} = ₹${netCashOut}) must match Withdraw Amount (₹${expectedWithdraw})`);
                    }
                }
            }

            if (activeTab === 'service_income') {
                finalAmount = amount;
            } else {
                finalAmount = parseFloat(formData.selling_price) || 0;
            }

            // === BUILD PAYLOAD ===
            const payload = {
                type: activeTab,
                client_name: formData.client_name,
                client_phone: formData.client_phone,
                category: formData.category,
                description: formData.description,
                payment_mode: formData.payment_mode,

                // Financials
                amount: finalAmount,
                service_charges: charges,
                total_amount: activeTab === 'service_income' ? totalPayable : finalAmount + charges,
                cost_price: formData.cost_price || 0,
                selling_price: formData.selling_price || 0,

                // Account IDs — both inward and outward always sent (backend handles null)
                inward_account_id: formData.inward_account_id || null,
                outward_account_id: formData.outward_account_id || null,

                // Denominations — send for BOTH cash and online (online may have partial cash involved)
                inward_denominations: cashReceivedNotes,
                outward_denominations: cashReturnedNotes,

                // Status
                is_urgent: formData.is_urgent,
                status: formData.is_urgent ? 'completed' : (activeTab === 'withdraw' ? 'completed' : 'pending'),

                // Admin tracking
                created_by: JSON.parse(localStorage.getItem('user'))?.username || 'admin',
            };

            // Deposit/Withdraw specific status
            if (activeTab === 'deposit') {
                payload.status = formData.is_urgent ? 'completed' : 'pending';
            } else if (activeTab === 'withdraw') {
                payload.status = 'completed';
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
                inward_account_id: '',
                outward_account_id: '',
            });
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

    // Helper: get account balance display
    const getAccountBadge = (accountId) => {
        const acc = accounts.find(a => a.id == accountId);
        if (!acc) return null;
        const isLow = parseFloat(acc.balance) < parseFloat(acc.low_balance_threshold);
        return (
            <div className={`text-xs mt-1 font-semibold ${isLow ? 'text-red-600 animate-pulse' : 'text-green-600'}`}>
                {isLow ? '⚠️ Low Balance! ' : '✅ '}₹{parseFloat(acc.balance).toLocaleString('en-IN')}
            </div>
        );
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

                            {/* ============ LEFT COLUMN: Form Fields ============ */}
                            <div className="space-y-6">

                                {/* Service Selection */}
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

                                {/* Client Details */}
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

                                <div>
                                    <label className="block text-xs uppercase text-gray-500 font-semibold mb-1">Address / Note</label>
                                    <textarea
                                        rows="2"
                                        className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500"
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Address or Description"
                                    />
                                </div>

                                {/* Financials */}
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

                                {/* ===================== ACCOUNT SELECTION ===================== */}
                                {/* All tabs now show BOTH inward and outward account dropdowns */}
                                <div className="space-y-3">
                                    {/* ---------- INWARD ACCOUNT ---------- */}
                                    {/* service_income: money comes IN to admin account */}
                                    {/* deposit: customer deposits cash, admin's CASH HAND account receives */}
                                    {/* withdraw: customer gives online, admin's BANK account receives (online in) */}
                                    <div>
                                        <label className="block text-xs uppercase font-semibold mb-1 text-green-700">
                                            {activeTab === 'service_income' && '⬇️ Inward Account (Money In)'}
                                            {activeTab === 'deposit' && '⬇️ Cash Received In — Account (e.g. Cash Hand)'}
                                            {activeTab === 'withdraw' && '⬇️ Received From Customer — Account (e.g. Online/Bank)'}
                                        </label>
                                        <select
                                            className="w-full p-2 border border-green-300 rounded bg-green-50"
                                            value={formData.inward_account_id}
                                            onChange={e => setFormData({ ...formData, inward_account_id: e.target.value })}
                                        >
                                            <option value="">— None / Not Applicable —</option>
                                            {accounts.map(acc => (
                                                <option key={acc.id} value={acc.id}>
                                                    {acc.account_name} ({acc.type.replace(/_/g, ' ').toUpperCase()})
                                                </option>
                                            ))}
                                        </select>
                                        {formData.inward_account_id && getAccountBadge(formData.inward_account_id)}
                                    </div>

                                    {/* ---------- OUTWARD ACCOUNT ---------- */}
                                    {/* service_income: money goes OUT from admin's bank (pays provider) — optional */}
                                    {/* deposit: admin sends from BANK account to customer's account */}
                                    {/* withdraw: admin gives cash OUT from Cash Hand */}
                                    <div>
                                        <label className="block text-xs uppercase font-semibold mb-1 text-red-700">
                                            {activeTab === 'service_income' && '⬆️ Outward Account (Pays Provider — optional)'}
                                            {activeTab === 'deposit' && '⬆️ Sent From — Account (e.g. SBI Bank, deducted)'}
                                            {activeTab === 'withdraw' && '⬆️ Cash Given Out — Account (e.g. Cash Hand)'}
                                        </label>
                                        <select
                                            className="w-full p-2 border border-red-300 rounded bg-red-50"
                                            value={formData.outward_account_id}
                                            onChange={e => setFormData({ ...formData, outward_account_id: e.target.value })}
                                        >
                                            <option value="">— None / Not Applicable —</option>
                                            {accounts.map(acc => (
                                                <option key={acc.id} value={acc.id}>
                                                    {acc.account_name} ({acc.type.replace(/_/g, ' ').toUpperCase()})
                                                </option>
                                            ))}
                                        </select>
                                        {formData.outward_account_id && getAccountBadge(formData.outward_account_id)}
                                    </div>
                                </div>

                                {/* ===================== PAYMENT MODE + STATUS ===================== */}
                                {activeTab === 'service_income' && (
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
                                )}

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

                                {activeTab === 'withdraw' && (
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
                                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-semibold">Auto: Completed</span>
                                        </div>
                                    </div>
                                )}

                            </div>

                            {/* ============ RIGHT COLUMN: Cash Transaction Details ============ */}
                            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 text-sm">
                                <h3 className="text-md font-bold text-gray-700 mb-1">Cash Transaction Details</h3>

                                {/* Mode indicator */}
                                <div className={`text-xs font-semibold mb-4 px-2 py-1 rounded inline-block ${formData.payment_mode === 'cash' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-700'}`}>
                                    {formData.payment_mode === 'cash' ? '💵 Cash Mode' : '📱 Online / UPI Mode'}
                                    {formData.payment_mode === 'online' && ' — enter cash denominations if any cash is also involved'}
                                </div>

                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                    {/* Received from Customer (IN) */}
                                    <div className="h-full">
                                        <CashCalculator
                                            key={'received-' + activeTab}
                                            title={
                                                activeTab === 'withdraw'
                                                    ? 'Received from Customer (IN)'
                                                    : 'Received from Customer (IN)'
                                            }
                                            onChange={handleCashReceivedChange}
                                        />
                                    </div>

                                    {/* Returned / Given to Customer (OUT) */}
                                    <div className="h-full">
                                        <CashCalculator
                                            key={'returned-' + activeTab}
                                            title={
                                                activeTab === 'withdraw'
                                                    ? 'Cash Given to Customer (OUT)'
                                                    : 'Returned to Customer (OUT)'
                                            }
                                            onChange={handleCashReturnedChange}
                                        />
                                    </div>

                                    {/* Summary Box */}
                                    <div className="xl:col-span-2 bg-white p-3 rounded-lg border border-gray-200 space-y-1">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-600">Received (IN):</span>
                                            <span className="font-mono text-green-700 font-bold">+₹{cashReceivedTotal.toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-600">Given Out (OUT):</span>
                                            <span className="font-mono text-red-700 font-bold">-₹{cashReturnedTotal.toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="flex justify-between items-center border-t border-gray-100 pt-1 mt-1">
                                            <span className="font-bold text-gray-700">
                                                {activeTab === 'withdraw' ? 'Net Cash Out:' : 'Net Cash In:'}
                                            </span>
                                            <span className={`font-mono font-bold text-base ${activeTab === 'withdraw'
                                                    ? (netCashPaid === amount ? 'text-blue-800' : 'text-orange-600')
                                                    : (netCashReceived === (activeTab === 'service_income' ? totalPayable : amount) ? 'text-blue-800' : 'text-orange-600')
                                                }`}>
                                                ₹{activeTab === 'withdraw' ? netCashPaid.toLocaleString('en-IN') : netCashReceived.toLocaleString('en-IN')}
                                            </span>
                                        </div>

                                        {/* Target amount vs actual */}
                                        <div className="text-xs text-gray-500 border-t pt-1">
                                            Target Amount: <span className="font-bold text-gray-700">₹{amount.toLocaleString('en-IN')}</span>
                                            {activeTab === 'service_income' && charges > 0 && (
                                                <span className="ml-2">+ Charges: <span className="font-bold text-gray-700">₹{charges.toLocaleString('en-IN')}</span> = ₹{totalPayable.toLocaleString('en-IN')}</span>
                                            )}
                                        </div>

                                        {/* Cash mode mismatch warning */}
                                        {formData.payment_mode === 'cash' && (() => {
                                            const target = activeTab === 'service_income' ? totalPayable : amount;
                                            const actual = activeTab === 'withdraw' ? netCashPaid : netCashReceived;
                                            if (amount > 0 && Math.abs(actual - target) > 0.01) {
                                                return (
                                                    <div className="text-xs text-orange-600 font-semibold bg-orange-50 px-2 py-1 rounded">
                                                        ⚠️ Mismatch! Entered: ₹{actual.toLocaleString('en-IN')} | Expected: ₹{target.toLocaleString('en-IN')}
                                                    </div>
                                                );
                                            }
                                            if (amount > 0 && Math.abs(actual - target) <= 0.01) {
                                                return (
                                                    <div className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-1 rounded">
                                                        ✅ Cash amount matches!
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>
                                </div>
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
                        fetchServices();
                    }}
                />
            )}
        </div>
    );
};

export default WorkEnquiry;
