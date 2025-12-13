import { useSelector } from 'react-redux';
import { Link, useLocation } from 'react-router-dom';
import { selectCurrentUser } from '../../store/slices/authSlice';
import clsx from 'clsx';

const navigationConfig = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: '📊',
    roles: ['admin', 'manager', 'employee'],
  },
  {
    name: 'Products',
    href: '/products',
    icon: '📦',
    roles: ['admin', 'manager'],
  },
  {
    name: 'Warehouses',
    href: '/warehouses',
    icon: '🏢',
    roles: ['admin'],
  },
  {
    name: 'Stock',
    href: '/stock',
    icon: '📊',
    roles: ['admin', 'manager'],
  },
  {
    name: 'Receipts',
    href: '/receipts',
    icon: '📥',
    roles: ['admin', 'manager'],
  },
  {
    name: 'Delivery Orders',
    href: '/delivery-orders',
    icon: '📤',
    roles: ['admin', 'manager'],
  },
  {
    name: 'Transfers',
    href: '/transfers',
    icon: '🔄',
    roles: ['admin', 'manager'],
  },
  {
    name: 'Adjustments',
    href: '/adjustments',
    icon: '⚖️',
    roles: ['admin'],
  },
  {
    name: 'Ledger',
    href: '/ledger',
    icon: '📖',
    roles: ['admin'],
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: '📈',
    roles: ['admin', 'manager'],
  },
  {
    name: 'My Tasks',
    href: '/tasks',
    icon: '✅',
    roles: ['employee'],
  },
  {
    name: 'Users',
    href: '/users',
    icon: '👥',
    roles: ['admin'],
  },
  {
    name: 'Profile',
    href: '/profile',
    icon: '👤',
    roles: ['employee'],
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: '⚙️',
    roles: ['admin'],
  },
];

const Sidebar = ({ open, setOpen }) => {
  const location = useLocation();
  const user = useSelector(selectCurrentUser);
  const userRole = user?.role || 'employee';

  const allowedNavigation = navigationConfig.filter((item) =>
    item.roles.includes(userRole)
  );

  const SidebarContent = () => (
    <>
      <div className="flex h-16 shrink-0 items-center px-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-primary-600">StockMaster</h1>
      </div>
      <nav className="flex flex-1 flex-col px-6 py-4">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {allowedNavigation.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    onClick={() => setOpen && setOpen(false)}
                    className={clsx(
                      location.pathname === item.href
                        ? 'bg-primary-50 text-primary-600'
                        : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50',
                      'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                    )}
                  >
                    <span className="text-xl">{item.icon}</span>
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        </ul>
      </nav>
    </>
  );

  return (
    <>
      {open !== undefined && (
        <div
          className={clsx(
            'fixed inset-0 z-40 bg-gray-900/80 lg:hidden',
            open ? 'block' : 'hidden'
          )}
          onClick={() => setOpen(false)}
        />
      )}

      <div
        className={clsx(
          'fixed inset-y-0 z-50 flex w-64 flex-col bg-white border-r border-gray-200 lg:static',
          open !== undefined
            ? open
              ? 'translate-x-0'
              : '-translate-x-full lg:translate-x-0'
            : '',
          'transition-transform duration-300 ease-in-out'
        )}
      >
        <SidebarContent />
      </div>
    </>
  );
};

export default Sidebar;
