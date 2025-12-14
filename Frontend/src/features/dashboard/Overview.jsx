import { useSelector } from 'react-redux';
import { useGetDashboardSummaryQuery } from '../../store/api/dashboardApi';
import { selectCurrentUser } from '../../store/slices/authSlice';
import KpiCard from './components/KpiCard';
import StockMovementChart from './components/StockMovementChart';
import LowStockChart from './components/LowStockChart';
import { Package, DollarSign, AlertTriangle, ClipboardList, CheckCircle } from 'lucide-react';

const Overview = () => {
  const user = useSelector(selectCurrentUser);
  const userRole = user?.role || 'employee';

  const shouldFetchData = userRole === 'admin' || userRole === 'manager';
  const { data, isLoading, isError, error } = useGetDashboardSummaryQuery(undefined, {
    skip: !shouldFetchData,
  });

  if (userRole === 'employee') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Welcome back, {user?.name || 'User'}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-8">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Welcome back!</h2>
            <p className="text-gray-600">Check your assigned tasks and manage your daily operations.</p>
          </div>
        </div>
      </div>
    );
  }

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

  const renderAdminDashboard = () => (
    <>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Products"
          value={kpis.totalProducts || 0}
          icon={Package}
          color="blue"
          trend={kpis.productsTrend > 0 ? 'up' : kpis.productsTrend < 0 ? 'down' : 'neutral'}
          trendValue={kpis.productsTrend}
          isLoading={isLoading}
        />
        <KpiCard
          title="Total Stock Value"
          value={kpis.totalStockValue ? `$${kpis.totalStockValue.toLocaleString()}` : '$0'}
          icon={DollarSign}
          color="green"
          trend={kpis.valueTrend > 0 ? 'up' : kpis.valueTrend < 0 ? 'down' : 'neutral'}
          trendValue={kpis.valueTrend}
          isLoading={isLoading}
        />
        <KpiCard
          title="Low Stock Items"
          value={kpis.lowStockItems || 0}
          icon={AlertTriangle}
          color="yellow"
          trend={kpis.lowStockTrend > 0 ? 'up' : kpis.lowStockTrend < 0 ? 'down' : 'neutral'}
          trendValue={kpis.lowStockTrend}
          isLoading={isLoading}
        />
        <KpiCard
          title="Pending Receipts"
          value={kpis.pendingReceipts || 0}
          icon={ClipboardList}
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
    </>
  );

  const renderManagerDashboard = () => (
    <>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2">
        <KpiCard
          title="Low Stock Items"
          value={kpis.lowStockItems || 0}
          icon={AlertTriangle}
          color="yellow"
          trend={kpis.lowStockTrend > 0 ? 'up' : kpis.lowStockTrend < 0 ? 'down' : 'neutral'}
          trendValue={kpis.lowStockTrend}
          isLoading={isLoading}
        />
        <KpiCard
          title="Pending Receipts"
          value={kpis.pendingReceipts || 0}
          icon={ClipboardList}
          color="purple"
          trend={kpis.receiptsTrend > 0 ? 'up' : kpis.receiptsTrend < 0 ? 'down' : 'neutral'}
          trendValue={kpis.receiptsTrend}
          isLoading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <StockMovementChart data={stockMovement} isLoading={isLoading} />
      </div>
    </>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          {userRole === 'admin' ? 'Complete overview of your inventory management system' : 'Manage your inventory operations'}
        </p>
      </div>

      {userRole === 'admin' && renderAdminDashboard()}
      {userRole === 'manager' && renderManagerDashboard()}
    </div>
  );
};

export default Overview;
