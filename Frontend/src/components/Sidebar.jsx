import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Products', href: '/products', icon: '📦' },
  { name: 'Warehouses', href: '/warehouses', icon: '🏢' },
  { name: 'Receipts', href: '/receipts', icon: '📥' },
  { name: 'Deliveries', href: '/deliveries', icon: '📤' },
  { name: 'Transfers', href: '/transfers', icon: '🔄' },
  { name: 'Adjustments', href: '/adjustments', icon: '⚖️' },
  { name: 'Purchase Orders', href: '/purchase-orders', icon: '📋' },
  { name: 'Vendors', href: '/vendors', icon: '🏪' },
  { name: 'Alerts', href: '/alerts', icon: '⚠️' },
  { name: 'Reports', href: '/reports', icon: '📈' },
  { name: 'Settings', href: '/settings', icon: '⚙️' },
];

export default function Sidebar({ open, setOpen }) {
  const location = useLocation();

  const SidebarContent = () => (
    <>
      <div className="flex h-16 shrink-0 items-center px-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-primary-600">Stock Manager</h1>
      </div>
      <nav className="flex flex-1 flex-col px-6 py-4">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.href}
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
      {/* Mobile sidebar */}
      <Transition.Root show={open} as={Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={setOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/80" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white">
                  <SidebarContent />
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white">
          <SidebarContent />
        </div>
      </div>
    </>
  );
}
