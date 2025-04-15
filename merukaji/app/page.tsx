'use client';
import { useState } from 'react';
import { Menu, X, ChevronDown, Settings, CreditCard, Layout } from 'lucide-react';

export default function SideNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const history = [
    'history no 6',
    'history no 5',
    'history no 4',
    'history no 3',
    'history no 2',
    'history no 1',
  ];

  return (
    <>
      {/* Toggle Button - Mobile only */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 text-gray-700 hover:text-gray-900 transition-colors"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Side Navigation */}
      <div className={`
        fixed top-0 left-0 h-full bg-white w-64 z-50 shadow-lg
        transform transition-all duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
        border-r border-gray-100
      `}>
        {/* Header with Toggle Button */}
        <div className="px-4 h-16 flex items-center border-b border-gray-100 bg-gray-50/50">
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden text-gray-700 hover:text-gray-900 transition-colors"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <h1 className="text-xl font-medium text-gray-900 ml-4">Merukaji</h1>
        </div>

        {/* History Section */}
        <div className="flex-1 overflow-y-auto py-4">
          <h2 className="px-4 text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
            History
          </h2>
          <ul className="space-y-1">
            {history.map((item, index) => (
              <li
                key={index}
                className="px-4 py-2 text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors text-sm"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Profile Section */}
        <div className="border-t border-gray-100 bg-gray-50/50">
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="w-full px-4 py-3 flex items-center justify-between text-gray-700 hover:text-gray-900 transition-colors"
            >
              <span className="text-sm">username@email.com</span>
              <ChevronDown className={`h-4 w-4 transform transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isProfileOpen && (
              <div className="absolute bottom-full left-0 w-full bg-white border border-gray-100 rounded-t-lg shadow-lg mb-1">
                <ul className="py-1">
                  <li className="px-4 py-2 hover:bg-gray-50 cursor-pointer transition-colors flex items-center gap-2 text-sm text-gray-700">
                    <CreditCard className="h-4 w-4" />
                    <span>Plan Details</span>
                  </li>
                  <li className="px-4 py-2 hover:bg-gray-50 cursor-pointer transition-colors flex items-center gap-2 text-sm text-gray-700">
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </li>
                  <li className="px-4 py-2 hover:bg-gray-50 cursor-pointer transition-colors flex items-center gap-2 text-sm text-gray-700">
                    <Layout className="h-4 w-4" />
                    <span>View All Plans</span>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}