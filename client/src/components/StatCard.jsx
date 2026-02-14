const StatCard = ({ title, value, colorClass }) => (
    <div className="bg-white rounded-xl shadow-sm p-6 flex items-center space-x-4 border border-gray-100">
        <div className={`p-3 rounded-full ${colorClass} w-12 h-12 flex items-center justify-center text-white font-bold`}>
            {title.charAt(0)}
        </div>
        <div>
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        </div>
    </div>
);

export default StatCard;
