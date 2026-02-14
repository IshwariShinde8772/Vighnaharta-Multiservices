import { useEffect, useState } from 'react';
import axios from 'axios';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import StatCard from '../components/StatCard';

const Dashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    const fetchData = async () => {
        try {
            const res = await axios.get('/api/dashboard');
            setData(res.data);
        } catch (err) {
            console.error('Failed to fetch dashboard data', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000); // Poll every 10s

        // Clock timer
        const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);

        return () => {
            clearInterval(interval);
            clearInterval(clockInterval);
        }
    }, []);

    if (loading) {
        return <div className="flex justify-center items-center h-full">Loading...</div>;
    }

    const { stats, accounts, chartData } = data || {};

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <h1 className="text-2xl font-bold text-gray-800">Overview</h1>
                <div className="text-right">
                    <p className="text-xl font-mono font-bold text-blue-900">
                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </p>
                    <p className="text-sm text-gray-500">
                        {currentTime.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
            </div>

            {/* Cash & Profit Summary Section - New Layout requested by user */}

            {/* 1. Global Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Total Cash In Hand"
                    value={
                        <div>
                            <span>₹{data?.cashStats?.totalCashInHand || 0}</span>
                            <div className="text-xs font-normal opacity-80 mt-1">
                                {data?.cashStats?.totalNotesCount || 0} Notes Total
                            </div>
                        </div>
                    }
                    colorClass="bg-green-600"
                />
                <StatCard
                    title="Today's Profit"
                    value={`₹${stats?.todayProfit || 0}`}
                    colorClass="bg-purple-600"
                />
                <StatCard
                    title="Pending Orders"
                    value={stats?.pendingWork || 0}
                    colorClass="bg-orange-500"
                />
            </div>

            {/* 2. Daily Cash Tally (New Format Request) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-800">DAILY CASH TALLY</h3>
                    <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-bold">
                        Cash Present: ₹{data?.cashStats?.totalCashInHand || 0}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="text-xs text-gray-600 uppercase bg-gray-100">
                            <tr>
                                <th className="px-4 py-3 border-b">Note Type</th>
                                <th className="px-4 py-3 border-b text-center text-green-700 bg-green-50">Cash In (Count)</th>
                                <th className="px-4 py-3 border-b text-center text-red-700 bg-red-50">Cash Out (Count)</th>
                                <th className="px-4 py-3 border-b text-center font-bold">Total (Net Value)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[2000, 500, 200, 100, 50, 20, 10, 5, 2, 1].map(denom => {
                                const inCount = data?.cashStats?.todayInward?.denominations?.[denom] || 0;
                                const outCount = data?.cashStats?.todayOutward?.denominations?.[denom] || 0;
                                const netVal = (inCount * denom) - (outCount * denom);

                                // Show row if there is ANY activity or if it's a common note
                                // Actually user wants "exact table" usually implies all rows. 
                                // We'll show all main notes.

                                return (
                                    <tr key={denom} className="border-b hover:bg-gray-50">
                                        <td className="px-4 py-2 font-bold text-gray-700">₹{denom}</td>

                                        {/* IN */}
                                        <td className="px-4 py-2 text-center bg-green-50/30">
                                            {inCount > 0 ? <span className="font-bold text-green-700">{inCount}</span> : '-'}
                                        </td>

                                        {/* OUT */}
                                        <td className="px-4 py-2 text-center bg-red-50/30">
                                            {outCount > 0 ? <span className="font-bold text-red-700">{outCount}</span> : '-'}
                                        </td>

                                        {/* TOTAL (Net for this note type today) */}
                                        {/* Note: User asked for "Total" column. Could be Count or Value. Value makes more sense for balancing. */}
                                        <td className={`px-4 py-2 text-center font-bold ${netVal >= 0 ? 'text-blue-600' : 'text-red-700'}`}>
                                            {netVal !== 0 ? `₹${Math.abs(netVal)}` : '-'}
                                        </td>
                                    </tr>
                                );
                            })}

                            {/* Grand Total Row */}
                            <tr className="bg-gray-50 font-bold border-t-2 border-gray-200">
                                <td className="px-4 py-3">Total</td>
                                <td className="px-4 py-3 text-center text-green-700">
                                    {Object.values(data?.cashStats?.todayInward?.denominations || {}).reduce((a, b) => a + parseInt(b), 0)}
                                </td>
                                <td className="px-4 py-3 text-center text-red-700">
                                    {Object.values(data?.cashStats?.todayOutward?.denominations || {}).reduce((a, b) => a + parseInt(b), 0)}
                                </td>
                                <td className={`px-4 py-3 text-center ${((data?.cashStats?.todayInward?.total || 0) - (data?.cashStats?.todayOutward?.total || 0)) >= 0 ? 'text-blue-800' : 'text-red-700'}`}>
                                    ₹{Math.abs((data?.cashStats?.todayInward?.total || 0) - (data?.cashStats?.todayOutward?.total || 0))} (Net Flow)
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>


            {/* Pending Work & Fund Accounts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pending Work Breakdown */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Pending Work Breakdown</h3>
                    {stats?.pendingBreakdown && stats.pendingBreakdown.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                                    <tr>
                                        <th className="p-3">Category / Service</th>
                                        <th className="p-3">Pending Count</th>
                                        <th className="p-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {stats.pendingBreakdown.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="p-3 font-medium text-gray-800">{item.category || 'General'}</td>
                                            <td className="p-3">
                                                <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-bold">
                                                    {item.count}
                                                </span>
                                            </td>
                                            <td className="p-3 text-sm text-gray-500">Pending Action</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-4">No pending work found.</p>
                    )}
                </div>

                {/* Piggy Bank / Accounts Status */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Fund Accounts (Piggy Bank)</h3>
                    <div className="flex-1 overflow-auto space-y-4">
                        {accounts && accounts.length > 0 ? (
                            accounts.map(acc => (
                                <div key={acc.id} className="p-4 rounded-lg bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors">
                                    <div className="flex justify-between items-center mb-1">
                                        <h4 className="font-semibold text-gray-800">{acc.account_name}</h4>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${['cash', 'petty_cash'].includes(acc.type) ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {acc.type.replace(/_/g, ' ').toUpperCase()}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 mb-2">{acc.holder_name}</p>
                                    <div className="flex justify-between items-end">
                                        <span className="text-xl font-bold text-gray-900">₹{parseFloat(acc.balance).toLocaleString('en-IN')}</span>
                                        {parseFloat(acc.balance) < parseFloat(acc.low_balance_threshold) && (
                                            <span className="text-xs font-bold text-red-500 animate-pulse">Low Funds!</span>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-gray-400 text-center py-4">No accounts found. Add one in Accounts page.</div>
                        )}
                    </div>
                </div>
            </div>
        </div >
    );
};

export default Dashboard;
