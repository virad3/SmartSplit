import React, { useState } from 'react';
import { Icons } from '../constants';

interface LoginViewProps {
  onLogin: (identifier: string) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier) {
      setError('Email or Mobile Number is required.');
      return;
    }
    
    const isEmail = /\S+@\S+\.\S+/.test(identifier);
    const isMobile = /^\d{10}$/.test(identifier);

    if (!isEmail && !isMobile) {
      setError('Please enter a valid email or a 10-digit mobile number.');
      return;
    }
    
    setError('');
    onLogin(identifier);
  };
  
  const LoginIllustration = () => (
    <div className="hidden lg:block lg:w-1/2 p-12 bg-green-50 dark:bg-gray-800 rounded-l-2xl">
      <div className="flex flex-col justify-center items-center h-full">
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-48 h-48">
           <path fill="#A5D6A7" d="M49.8,-57.9C64.3,-46.8,75.7,-30.9,79.5,-13.3C83.2,4.3,79.2,23.5,69.5,39.3C59.8,55,44.4,67.3,27.1,74.3C9.8,81.3,-9.4,83,-27.2,77.7C-45,72.4,-61.4,60.1,-69.8,44.7C-78.2,29.3,-78.6,10.8,-74.6,-6.2C-70.7,-23.2,-62.4,-38.7,-50.2,-50.1C-38.1,-61.5,-22,-68.8,-4.2,-66.9C13.6,-65,27.2,-69,40.8,-57.9" transform="translate(100 100)" />
        </svg>
        <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300 mt-4 text-center">Simplify Shared Expenses</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-4 text-center max-w-sm">Track balances, organize expenses, and settle up easily with friends and family.</p>
      </div>
    </div>
  );


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-4xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex">
        <LoginIllustration />
        <div className="w-full lg:w-1/2 p-8 sm:p-12 space-y-8">
            <div className="text-center">
                <div className="flex items-center justify-center space-x-2 mb-4">
                   {Icons.logo}
                  <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Smartsplit</h1>
                </div>
              <p className="text-gray-500 dark:text-gray-400">Sign in to manage your expenses</p>
            </div>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="identifier" className="text-sm font-medium text-gray-700 dark:text-gray-300">Email or Mobile Number</label>
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  autoComplete="email tel"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm text-gray-900 dark:text-gray-200"
                  placeholder="you@example.com or 1234567890"
                />
              </div>
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <div>
                <button
                  type="submit"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                >
                  Sign in / Register
                </button>
              </div>
            </form>
        </div>
      </div>
    </div>
  );
};

export default LoginView;