import React from 'react';
import { Icons } from '../constants';
import { MainView } from '../App';

interface BottomNavProps {
  activeView: MainView;
  setView: (view: MainView) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeView, setView }) => {
  const navItems: { view: MainView, icon: React.ReactNode, label: string }[] = [
    { view: 'friends', icon: Icons.friends, label: 'Friends' },
    { view: 'groups', icon: Icons.groups, label: 'Groups' },
    { view: 'activity', icon: Icons.activity, label: 'Activity' },
    { view: 'account', icon: Icons.account, label: 'Account' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 grid grid-cols-4 z-20">
      {navItems.map(item => (
        <button
          key={item.view}
          onClick={() => setView(item.view)}
          className={`flex flex-col items-center space-y-1 py-2 text-xs font-medium transition-colors ${
            activeView === item.view
              ? 'text-green-600 dark:text-green-400'
              : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
          }`}
          aria-current={activeView === item.view ? 'page' : undefined}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default BottomNav;
