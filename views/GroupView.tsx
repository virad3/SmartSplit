
import React, { useState, useMemo, useEffect } from 'react';
import { Group, Expense, User } from '../types';
import Modal from '../components/Modal';
import { Icons, EXPENSE_CATEGORIES, CategoryIcons } from '../constants';

interface GroupViewProps {
  group: Group;
  expenses: Expense[];
  users: User[];
  currentUser: User;
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  onBack: () => void;
}

const GroupView: React.FC<GroupViewProps> = ({ group, expenses, users, currentUser, onAddExpense, onBack }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [paidBy, setPaidBy] = useState(currentUser.id);
  const [splitType, setSplitType] = useState<'equally' | 'percentage' | 'amount'>('equally');
  const [percentages, setPercentages] = useState<{ [key: string]: string }>({});
  const [amounts, setAmounts] = useState<{ [key: string]: string }>({});

  const groupMembers = useMemo(() => users.filter(u => group.members.includes(u.email)), [users, group.members]);

  useEffect(() => {
    if (isModalOpen) {
      const numMembers = groupMembers.length;
      if (numMembers > 0) {
        // Reset percentages
        const pct = (100 / numMembers);
        const initialPercentages: { [key: string]: string } = {};
        groupMembers.forEach((member) => {
          initialPercentages[member.id] = pct.toFixed(2);
        });
        const totalPct = Object.values(initialPercentages).reduce((sum, p) => sum + parseFloat(p), 0);
        const lastMemberId = groupMembers[numMembers - 1].id;
        initialPercentages[lastMemberId] = (parseFloat(initialPercentages[lastMemberId]) + (100 - totalPct)).toFixed(2);
        setPercentages(initialPercentages);
        
        // Reset amounts
        const initialAmounts: { [key: string]: string } = {};
        groupMembers.forEach(member => initialAmounts[member.id] = '');
        setAmounts(initialAmounts);
      }
    }
  }, [isModalOpen, groupMembers]);
  
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
      groupId: group.id,
      description,
      amount: numericAmount,
      paidBy,
      participants: groupMembers.map(m => m.id),
      split: splitData,
      // FIX: Changed `new date()` to `new Date()`
      date: new Date().toISOString(),
      category,
    });

    setIsModalOpen(false);
    setDescription('');
    setAmount('');
    setCategory(EXPENSE_CATEGORIES[0]);
    setPaidBy(currentUser.id);
    setSplitType('equally');
  };
  
  const balances = useMemo(() => {
    const memberBalances: { [key: string]: number } = {};
    groupMembers.forEach(member => {
      memberBalances[member.id] = 0;
    });

    expenses.forEach(expense => {
      memberBalances[expense.paidBy] += expense.amount;
      if (!expense.split || expense.split.type === 'equally') {
        const share = expense.amount / expense.participants.length;
        expense.participants.forEach(participantId => {
          memberBalances[participantId] -= share;
        });
      } else if (expense.split.type === 'percentage' && expense.split.distribution) {
          expense.participants.forEach(participantId => {
            const percentage = expense.split.distribution![participantId] || 0;
            const share = expense.amount * (percentage / 100);
            memberBalances[participantId] -= share;
          });
      } else if (expense.split.type === 'amount' && expense.split.distribution) {
          expense.participants.forEach(participantId => {
            const share = expense.split.distribution![participantId] || 0;
            memberBalances[participantId] -= share;
          });
      }
    });

    return memberBalances;
  }, [expenses, groupMembers]);

  const simplifiedDebts = useMemo(() => {
    const debtors = Object.entries(balances)
      .filter(([, balance]) => balance < -0.01)
      .map(([id, balance]) => ({ id, amount: balance }));

    const creditors = Object.entries(balances)
      .filter(([, balance]) => balance > 0.01)
      .map(([id, balance]) => ({ id, amount: balance }));
      
    debtors.sort((a, b) => a.amount - b.amount);
    creditors.sort((a, b) => b.amount - a.amount);
    
    const settlements: { fromName: string; toName: string; amount: number }[] = [];

    while(debtors.length > 0 && creditors.length > 0) {
        const debtor = debtors[0];
        const creditor = creditors[0];
        const amount = Math.min(-debtor.amount, creditor.amount);
        const fromUser = users.find(u => u.id === debtor.id);
        const toUser = users.find(u => u.id === creditor.id);

        settlements.push({
            fromName: fromUser?.name || fromUser?.email || 'Unknown',
            toName: toUser?.name || toUser?.email || 'Unknown',
            amount: amount,
        });

        debtor.amount += amount;
        creditor.amount -= amount;

        if (Math.abs(debtor.amount) < 0.01) debtors.shift();
        if (Math.abs(creditor.amount) < 0.01) creditors.shift();
    }
    
    return settlements;
  }, [balances, users]);

  const totalPercentage = useMemo(() => Object.values(percentages).reduce((sum, p) => sum + (parseFloat(p) || 0), 0), [percentages]);
  const totalAmount = useMemo(() => Object.values(amounts).reduce((sum, a) => sum + (parseFloat(a) || 0), 0), [amounts]);


  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex items-center mb-6">
        <button onClick={onBack} className="mr-4 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">{Icons.back}</button>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white truncate">{group.name}</h1>
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
                {expenses.slice().reverse().map(expense => {
                    const paidByUser = users.find(u => u.id === expense.paidBy);
                    return (
                    <li key={expense.id} className="p-4 flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400">
                           {CategoryIcons[expense.category] || CategoryIcons['Other']}
                        </div>
                        <div>
                            <p className="font-semibold text-gray-800 dark:text-gray-200">{expense.description}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Paid by {paidByUser?.name || paidByUser?.email || '...'}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-lg text-gray-900 dark:text-white">₹{expense.amount.toFixed(2)}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{new Date(expense.date).toLocaleDateString()}</p>
                    </div>
                    </li>
                )})}
                </ul>
            )}
            </div>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">Balances</h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 space-y-3">
            {groupMembers.map(member => (
              <div key={member.id} className="flex justify-between items-center text-sm">
                <span className="text-gray-700 dark:text-gray-300">{member.name || member.email}</span>
                <span className={`font-semibold ${balances[member.id] >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {balances[member.id] >= 0 ? `gets back` : `owes`} ₹{Math.abs(balances[member.id]).toFixed(2)}
                </span>
              </div>
            ))}
             <hr className="border-gray-200 dark:border-gray-700 my-4"/>
             <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Settle Up</h3>
             {simplifiedDebts.length === 0 ? (
                 <p className="text-sm text-gray-500 dark:text-gray-400">Everyone is settled up!</p>
             ) : (
                 <ul className="space-y-2">
                     {simplifiedDebts.map((debt, index) => (
                         <li key={index} className="text-sm text-gray-800 dark:text-gray-200">
                             <span className="font-semibold text-red-500">{debt.fromName}</span> pays <span className="font-semibold text-green-500">{debt.toName}</span>: ₹{debt.amount.toFixed(2)}
                         </li>
                     ))}
                 </ul>
             )}
          </div>
        </div>
      </div>


      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Expense">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full input" placeholder="e.g., Dinner" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount (₹)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="mt-1 block w-full input" placeholder="0.00" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="mt-1 block w-full input">
              {EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Paid by</label>
            <select value={paidBy} onChange={e => setPaidBy(e.target.value)} className="mt-1 block w-full input">
              {groupMembers.map(member => <option key={member.id} value={member.id}>{member.name || member.email}</option>)}
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
                    <p className="text-sm text-gray-500 dark:text-gray-400">Enter percentage for each member:</p>
                    {groupMembers.map(member => (
                        <div key={member.id} className="flex items-center space-x-2">
                            <label className="w-2/5 truncate text-sm text-gray-600 dark:text-gray-300" title={member.email}>{member.name || member.email.split('@')[0]}</label>
                            <input
                                type="number"
                                value={percentages[member.id] || ''}
                                onChange={(e) => setPercentages(prev => ({ ...prev, [member.id]: e.target.value }))}
                                className="w-1/5 input text-right"
                            />
                            <span className="w-1/5 text-gray-500">%</span>
                            <span className="w-1/5 text-right text-sm text-gray-600 dark:text-gray-400">₹{((parseFloat(percentages[member.id]) || 0) / 100 * (parseFloat(amount) || 0)).toFixed(2)}</span>
                        </div>
                    ))}
                    <div className={`text-right font-semibold text-sm pr-2 ${Math.abs(totalPercentage - 100) > 0.01 ? 'text-red-500' : 'text-green-600'}`}>
                        Total: {totalPercentage.toFixed(2)}%
                    </div>
                </div>
            )}
            {splitType === 'amount' && (
                 <div className="space-y-2 pt-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Enter amount for each member:</p>
                    {groupMembers.map(member => (
                        <div key={member.id} className="flex items-center space-x-2">
                            <label className="w-3/5 truncate text-sm text-gray-600 dark:text-gray-300" title={member.email}>{member.name || member.email.split('@')[0]}</label>
                             <span className="text-gray-500">₹</span>
                            <input
                                type="number"
                                value={amounts[member.id] || ''}
                                onChange={(e) => setAmounts(prev => ({ ...prev, [member.id]: e.target.value }))}
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

export default GroupView;