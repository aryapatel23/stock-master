const KpiCard = ({ title, value, icon, trend, trendValue, color = 'blue', isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
            <div className="h-8 bg-gray-200 rounded w-32"></div>
          </div>
          <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
        </div>
        {trend && (
          <div className="mt-4 h-4 bg-gray-200 rounded w-20"></div>
        )}
      </div>
    );
  }

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  const trendClasses = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-600',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        </div>
        {icon && (
          <div className={`h-12 w-12 rounded-full flex items-center justify-center ${colorClasses[color] || colorClasses.blue}`}>
            <span className="text-2xl">{icon}</span>
          </div>
        )}
      </div>
      {trend && trendValue !== undefined && (
        <div className="mt-4 flex items-center text-sm">
          <span className={`font-medium ${trendClasses[trend]}`}>
            {trend === 'up' && '↑'}
            {trend === 'down' && '↓'}
            {trend === 'neutral' && '→'}
            {' '}
            {typeof trendValue === 'number' ? `${Math.abs(trendValue)}%` : trendValue}
          </span>
          <span className="text-gray-500 ml-2">vs last period</span>
        </div>
      )}
    </div>
  );
};

export default KpiCard;
