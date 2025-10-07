
import React, { useState, useMemo, useEffect } from 'react';
import { Expense, User } from '../types';
import Modal from '../components/Modal';
import { Icons, CategoryIcons } from '../constants';

interface FriendViewProps {
  currentUser: User;
  friend: User;
  expenses: Expense[];
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  onBack: () => void;
}

const FriendView: React.FC<FriendViewProps> = ({ currentUser, friend, expenses, onAddExpense, onBack }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(currentUser.id);
  const [splitType, setSplitType] = useState<'equally' | 'percentage' | 'amount'>('equally');
  const [percentages, setPercentages] = useState<{ [key: string]: string }>({});
  const [amounts, setAmounts] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (isModalOpen) {
        setPercentages({
            [currentUser.id]: '50.00',
            [friend.id]: '50.00'
        });
        setAmounts({
            [currentUser.id]: '',
            [friend.id]: ''
        });
        setSplitType('equally');
        setPaidBy(currentUser.id);
        setDescription('');
        setAmount('');
    }
  }, [isModalOpen, currentUser.id, friend.id]);

  const handleAddExpense = () => {
    const numericAmount = parseFloat(amount);
    if (!description.trim() || isNaN(numericAmount) || numericAmount <= 0) {
      alert('Please enter a valid description and amount.');
      return;
    }
    
    let splitData: Expense['split'];
    if (splitType === 'equally') {
      splitData = { type: 'equally' };
    } else if (splitType === 'percentage') {
      const totalPercentage = Object.values(percentages).reduce((sum, p) => sum + (parseFloat(p) || 0), 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        alert('Percentages must add up to 100.');
        return;
      }
      const distribution: { [key: string]: number } = {};
      Object.entries(percentages).forEach(([userId, p]) => {
        distribution[userId] = parseFloat(p);
      });
      splitData = { type: 'percentage', distribution };
    } else { // amount
      const totalAmount = Object.values(amounts).reduce((sum, a) => sum + (parseFloat(a) || 0), 0);
       if (Math.abs(totalAmount - numericAmount) > 0.01) {
        alert('The sum of split amounts must equal the total expense amount.');
        return;
      }
      const distribution: { [key: string]: number } = {};
      Object.entries(amounts).forEach(([userId, a]) => {
        distribution[userId] = parseFloat(a);
      });
      splitData = { type: 'amount', distribution };
    }

    onAddExpense({
      description,
      amount: numericAmount,
      paidBy,
      participants: [currentUser.id, friend.id],
      split: splitData,
      date: new Date().toISOString(),
      category: 'Other',
    });

    setIsModalOpen(false);
  };

  const balance = useMemo(() => {
    let netBalance = 0;
    expenses.forEach(expense => {
      if (!expense.split || expense.split.type === 'equally') {
        const share = expense.amount / 2;
        if (expense.paidBy === currentUser.id) {
            netBalance += share; // Friend owes me
        } else {
            netBalance -= share; // I owe friend
        }
      } else if (expense.split.type === 'percentage' && expense.split.distribution) {
          if(expense.paidBy === currentUser.id) {
            const friendShare = expense.amount * ((expense.split.distribution[friend.id] || 0) / 100);
            netBalance += friendShare;
          } else {
            const myShare = expense.amount * ((expense.split.distribution[currentUser.id] || 0) / 100);
            netBalance -= myShare;
          }
      } else if (expense.split.type === 'amount' && expense.split.distribution) {
           if(expense.paidBy === currentUser.id) {
            const friendShare = expense.split.distribution[friend.id] || 0;
            netBalance += friendShare;
          } else {
            const myShare = expense.split.distribution[currentUser.id] || 0;
            netBalance -= myShare;
          }
      }
    });
    return netBalance;
  }, [expenses, currentUser.id, friend.id]);
  
  const totalPercentage = useMemo(() => Object.values(percentages).reduce((sum, p) => sum + (parseFloat(p) || 0), 0), [percentages]);
  const totalAmount = useMemo(() => Object.values(amounts).reduce((sum, a) => sum + (parseFloat(a) || 0), 0), [amounts]);


  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex items-center mb-6">
        <button onClick={onBack} className="mr-4 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">{Icons.back}</button>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white truncate">Expenses with {friend.name || friend.email || friend.mobile}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">Expenses</h2>
              <button onClick={() => setIsModalOpen(true)} className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-green-700 transition-colors">
                {Icons.plus}<span>Add Expense</span>
              </button>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
            {expenses.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">No expenses recorded yet.</div>
            ) : (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {expenses.slice().reverse().map(expense => (
                    <li key={expense.id} className="p-4 flex justify-between items-center">
                        <div className="flex items-center space-x-4">
                            <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400">
                               {CategoryIcons[expense.category] || CategoryIcons['Other']}
                            </div>
                            <div>
                                <p className="font-semibold text-gray-800 dark:text-gray-200">{expense.description}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                Paid by {expense.paidBy === currentUser.id ? 'you' : (friend.name || friend.email?.split('@')[0] || friend.mobile)}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-lg text-gray-900 dark:text-white">₹{expense.amount.toFixed(2)}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">{new Date(expense.date).toLocaleDateString()}</p>
                        </div>
                    </li>
                ))}
                </ul>
            )}
            </div>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">Summary</h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
            {Math.abs(balance) < 0.01 && (
                <p className="text-lg text-gray-600 dark:text-gray-300">You are all settled up!</p>
            )}
            {balance > 0.01 && (
                <>
                 <p className="text-gray-500 dark:text-gray-400">{friend.name || friend.email || friend.mobile} owes you</p>
                 <p className="text-3xl font-bold text-green-600">₹{balance.toFixed(2)}</p>
                </>
            )}
            {balance < -0.01 && (
                <>
                 <p className="text-gray-500 dark:text-gray-400">You owe {friend.name || friend.email || friend.mobile}</p>
                 <p className="text-3xl font-bold text-red-600">₹{Math.abs(balance).toFixed(2)}</p>
                </>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Expense">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full input" placeholder="e.g., Lunch" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount (₹)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="mt-1 block w-full input" placeholder="0.00" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Paid by</label>
            <select value={paidBy} onChange={e => setPaidBy(e.target.value)} className="mt-1 block w-full input">
                <option value={currentUser.id}>You ({currentUser.name || currentUser.email || currentUser.mobile})</option>
                <option value={friend.id}>{friend.name || friend.email || friend.mobile}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Split</label>
            <div className="flex border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
                <button onClick={() => setSplitType('equally')} className={`px-3 py-2 text-sm flex-1 transition-colors ${splitType === 'equally' ? 'bg-green-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>Equally</button>
                <button onClick={() => setSplitType('percentage')} className={`px-3 py-2 text-sm flex-1 border-l border-gray-300 dark:border-gray-600 transition-colors ${splitType === 'percentage' ? 'bg-green-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>By Percentage</button>
                <button onClick={() => setSplitType('amount')} className={`px-3 py-2 text-sm flex-1 border-l border-gray-300 dark:border-gray-600 transition-colors ${splitType === 'amount' ? 'bg-green-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>By Amount</button>
            </div>
           </div>
            {splitType === 'percentage' && (
                <div className="space-y-2 pt-2">
                    {[currentUser, friend].map(user => (
                        <div key={user.id} className="flex items-center space-x-2">
                            <label className="w-2/5 truncate text-sm text-gray-600 dark:text-gray-300" title={user.email}>{user.id === currentUser.id ? 'You' : (user.name || user.email.split('@')[0])}</label>
                            <input
                                type="number"
                                value={percentages[user.id] || ''}
                                onChange={(e) => setPercentages(prev => ({ ...prev, [user.id]: e.target.value }))}
                                className="w-1/5 input text-right"
                            />
                            <span className="w-1/5 text-gray-500">%</span>
                            <span className="w-1/5 text-right text-sm text-gray-600 dark:text-gray-400">₹{((parseFloat(percentages[user.id]) || 0) / 100 * (parseFloat(amount) || 0)).toFixed(2)}</span>
                        </div>
                    ))}
                    <div className={`text-right font-semibold text-sm pr-2 ${Math.abs(totalPercentage - 100) > 0.01 ? 'text-red-500' : 'text-green-600'}`}>
                        Total: {totalPercentage.toFixed(2)}%
                    </div>
                </div>
            )}
            {splitType === 'amount' && (
                <div className="space-y-2 pt-2">
                     {[currentUser, friend].map(user => (
                        <div key={user.id} className="flex items-center space-x-2">
                            <label className="w-3/5 truncate text-sm text-gray-600 dark:text-gray-300" title={user.email}>{user.id === currentUser.id ? 'You' : (user.name || user.email.split('@')[0])}</label>
                            <span className="text-gray-500">₹</span>
                            <input
                                type="number"
                                value={amounts[user.id] || ''}
                                onChange={(e) => setAmounts(prev => ({ ...prev, [user.id]: e.target.value }))}
                                className="w-2/5 input text-right"
                            />
                        </div>
                    ))}
                    <div className={`text-right font-semibold text-sm pr-2 ${Math.abs(totalAmount - (parseFloat(amount) || 0)) > 0.01 ? 'text-red-500' : 'text-green-600'}`}>
                        Total: ₹{totalAmount.toFixed(2)}
                        <span className="font-normal text-gray-500 ml-2"> of ₹{(parseFloat(amount) || 0).toFixed(2)}</span>
                    </div>
                </div>
            )}
          <div className="flex justify-end pt-4">
            <button onClick={handleAddExpense} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
              Add Expense
            </button>
          </div>
        </div>
      </Modal>

      <style>{`
        .input {
          padding: 0.5rem 0.75rem;
          background-color: rgb(249 250 251);
          border: 1px solid rgb(209 213 219);
          border-radius: 0.375rem;
          box-shadow: inset 0 1px 2px 0 rgb(0 0 0 / 0.05);
          outline: 2px solid transparent;
          outline-offset: 2px;
        }
        .dark .input {
          background-color: rgb(55 65 81);
          border-color: rgb(75 85 99);
          color: rgb(229 231 235);
        }
        .input:focus {
          border-color: rgb(22 163 74);
          --tw-ring-color: rgb(22 163 74);
           box-shadow: 0 0 0 1px rgb(22 163 74);
        }
      `}</style>
    </div>
  );
};

export default FriendView;