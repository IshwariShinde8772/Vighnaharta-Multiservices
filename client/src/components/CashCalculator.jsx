import { useState, useEffect } from 'react';

const CashCalculator = ({ onChange, initialNotes = {}, title = "Cash Denominations" }) => {
    const [counts, setCounts] = useState({
        2000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0,
        ...initialNotes
    });

    const denominations = [2000, 500, 200, 100, 50, 20, 10];

    useEffect(() => {
        let total = 0;
        denominations.forEach(val => {
            total += (counts[val] || 0) * val;
        });
        onChange(total, counts);
    }, [counts]);

    const handleChange = (denom, value) => {
        const val = parseInt(value) || 0;
        setCounts(prev => ({ ...prev, [denom]: val }));
    };

    const totalAmount = denominations.reduce((sum, denom) => sum + (counts[denom] || 0) * denom, 0);

    return (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">{title}</h3>
            <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-sm">
                <div className="text-gray-500 font-medium">Note</div>
                <div className="text-gray-500 font-medium text-center">Count</div>
                <div className="text-gray-500 font-medium text-right">Total</div>

                {denominations.map(denom => (
                    <div key={denom} className="contents items-center">
                        <div className="py-2 text-gray-700 font-medium self-center">₹{denom}</div>
                        <input
                            type="number"
                            min="0"
                            className="w-full p-1.5 border border-gray-300 rounded text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={counts[denom] || ''}
                            onChange={(e) => handleChange(denom, e.target.value)}
                            placeholder="0"
                        />
                        <div className="py-2 text-right text-gray-900 font-medium self-center">
                            ₹{(counts[denom] || 0) * denom}
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-300 flex justify-between items-center">
                <span className="font-bold text-gray-700">TOTAL CASH</span>
                <span className="text-xl font-bold text-blue-600">₹{totalAmount}</span>
            </div>
        </div>
    );
};

export default CashCalculator;
