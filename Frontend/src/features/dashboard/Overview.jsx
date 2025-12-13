import { useGetDashboardSummaryQuery } from '../../store/api/dashboardApi';
import KpiCard from './components/KpiCard';
import StockMovementChart from './components/StockMovementChart';
import LowStockChart from './components/LowStockChart';

const Overview = () => {
  const { data, isLoading, isError, error } = useGetDashboardSummaryQuery();

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">Error Loading Dashboard</h3>
          <p className="mt-1 text-sm text-gray-500">{error?.data?.message || 'Failed to fetch dashboard data'}</p>
        </div>
      </div>
    );
  }

  const summary = data?.data || {};
  const kpis = summary.kpis || {};
  const stockMovement = summary.stockMovement || [];
  const lowStockItems = summary.lowStockItems || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Overview of your inventory management system</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Products"
          value={kpis.totalProducts || 0}
          icon="📦"
          color="blue"
          trend={kpis.productsTrend > 0 ? 'up' : kpis.productsTrend < 0 ? 'down' : 'neutral'}
          trendValue={kpis.productsTrend}
          isLoading={isLoading}
        />
        <KpiCard
          title="Total Stock Value"
          value={kpis.totalStockValue ? `$${kpis.totalStockValue.toLocaleString()}` : '$0'}
          icon="💰"
          color="green"
          trend={kpis.valueTrend > 0 ? 'up' : kpis.valueTrend < 0 ? 'down' : 'neutral'}
          trendValue={kpis.valueTrend}
          isLoading={isLoading}
        />
        <KpiCard
          title="Low Stock Items"
          value={kpis.lowStockItems || 0}
          icon="⚠️"
          color="yellow"
          trend={kpis.lowStockTrend > 0 ? 'up' : kpis.lowStockTrend < 0 ? 'down' : 'neutral'}
          trendValue={kpis.lowStockTrend}
          isLoading={isLoading}
        />
        <KpiCard
          title="Pending Receipts"
          value={kpis.pendingReceipts || 0}
          icon="📋"
          color="purple"
          trend={kpis.receiptsTrend > 0 ? 'up' : kpis.receiptsTrend < 0 ? 'down' : 'neutral'}
          trendValue={kpis.receiptsTrend}
          isLoading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <StockMovementChart data={stockMovement} isLoading={isLoading} />
        <LowStockChart data={lowStockItems} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default Overview;
