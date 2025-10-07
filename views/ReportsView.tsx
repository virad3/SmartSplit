
import React, { useMemo, useState, useEffect } from 'react';
import { User, AppData, Group, Expense } from '../types';
import { Icons, CategoryIcons } from '../constants';

type MultiViewProps = {
  activeView: 'groups' | 'activity' | 'account';
  currentUser: User;
  data: AppData;
  onSelectGroup: (groupId: string) => void;
  onOpenCreateGroupModal: () => void;
  onLogout: () => void;
  onUpdateProfile: (name: string) => void;
};

const getAvatarColor = (id: string) => {
    const colors = ['bg-orange-200', 'bg-teal-200', 'bg-cyan-200', 'bg-fuchsia-200', 'bg-rose-200'];
    const hash = id.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
    return colors[Math.abs(hash) % colors.length];
}

const GroupsView: React.FC<Omit<MultiViewProps, 'activeView' | 'onLogout' | 'onUpdateProfile'>> = ({ currentUser, data, onSelectGroup, onOpenCreateGroupModal }) => {
    const userGroups = data.groups.filter(group => group.members.includes(currentUser.email));
    const nonGroupExpenses = data.expenses.filter(e => !e.groupId && e.participants.includes(currentUser.id));
    const nonGroupBalance = useMemo(() => {
        return nonGroupExpenses.reduce((acc, expense) => {
            const share = expense.amount / expense.participants.length;
            if (expense.paidBy === currentUser.id) {
                return acc + (expense.amount - share);
            } else {
                return acc - share;
            }
        }, 0);
    }, [nonGroupExpenses, currentUser.id]);

    const totalBalance = useMemo(() => {
        // A more comprehensive balance calculation would be needed here for production
        return 0;
    }, []);

    return (
     <div className="container mx-auto">
        <header className="p-4 flex justify-between items-center">
             <button className="p-2 text-gray-600 dark:text-gray-300">{Icons.search}</button>
             <button onClick={onOpenCreateGroupModal} className="font-semibold text-green-600 dark:text-green-400">Create group</button>
        </header>

        <div className="px-4 py-2">
            <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-200">Overall, you are owed</span>
                <button className="p-2 text-gray-600 dark:text-gray-300">{Icons.filter}</button>
            </div>
            <span className="text-2xl font-bold text-green-600 dark:text-green-400">₹{totalBalance.toFixed(2)}</span>
        </div>

        <div className="py-4">
             {userGroups.map((group) => (
                <div key={group.id} onClick={() => onSelectGroup(group.id)} className="px-4 py-3 flex items-center space-x-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                    <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-600 flex-shrink-0"></div>
                    <div className="flex-grow">
                        <p className="font-semibold text-gray-800 dark:text-gray-100">{group.name}</p>
                    </div>
                </div>
            ))}
             <div className="px-4 py-3 flex items-center space-x-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                    <div className="w-10 h-10 rounded-lg bg-orange-200 dark:bg-orange-800 flex-shrink-0"></div>
                    <div className="flex-grow">
                        <p className="font-semibold text-gray-800 dark:text-gray-100">Non-group expenses</p>
                    </div>
                    <div className="text-right">
                         {Math.abs(nonGroupBalance) > 0.01 && (
                            <>
                                <span className={`text-sm ${nonGroupBalance > 0 ? 'text-green-600' : 'text-red-500'}`}>{nonGroupBalance > 0 ? 'you are owed' : 'you owe'}</span>
                                <p className={`font-semibold ${nonGroupBalance > 0 ? 'text-green-600' : 'text-red-500'}`}>₹{Math.abs(nonGroupBalance).toFixed(2)}</p>
                            </>
                         )}
                    </div>
             </div>
        </div>
     </div>
    );
};

const ActivityView: React.FC<Omit<MultiViewProps, 'activeView'| 'onSelectGroup' | 'onOpenCreateGroupModal' | 'onLogout' | 'onUpdateProfile'>> = ({ currentUser, data }) => {
    const sortedExpenses = useMemo(() => {
        const allUserExpenses = data.expenses.filter(e => e.participants.includes(currentUser.id));
        return allUserExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [data.expenses, currentUser.id]);

    return (
         <div className="container mx-auto">
            <header className="p-4 flex justify-between items-center">
                <button className="p-2 text-gray-600 dark:text-gray-300">{Icons.search}</button>
                <h1 className="text-xl font-bold">Recent activity</h1>
                <div className="w-10"></div>
            </header>
            <div className="py-2">
                {sortedExpenses.map(expense => {
                    const group = data.groups.find(g => g.id === expense.groupId);
                    const paidByUser = data.users.find(u => u.id === expense.paidBy);
                    const isCurrentUserPayer = expense.paidBy === currentUser.id;
                    
                    let amountText = '';
                    let myShare = 0;

                    if (!expense.split || expense.split.type === 'equally') {
                        myShare = expense.amount / expense.participants.length;
                    } else if (expense.split.type === 'percentage' && expense.split.distribution) {
                        myShare = expense.amount * ((expense.split.distribution[currentUser.id] || 0) / 100);
                    } else if (expense.split.type === 'amount' && expense.split.distribution) {
                        myShare = expense.split.distribution[currentUser.id] || 0;
                    }

                    if (isCurrentUserPayer) {
                        amountText = `You get back ₹${(expense.amount - myShare).toFixed(2)}`;
                    } else {
                        amountText = `You owe ₹${myShare.toFixed(2)}`;
                    }

                    return (
                        <div key={expense.id} className="px-4 py-3 flex items-start space-x-4 border-b border-gray-200 dark:border-gray-700">
                             <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 mt-1">
                                {CategoryIcons[expense.category] || CategoryIcons['Other']}
                            </div>
                            <div className="flex-grow">
                                <p className="text-gray-800 dark:text-gray-100">
                                    <span className="font-bold">{isCurrentUserPayer ? 'You' : (paidByUser?.name || paidByUser?.email || 'Someone')}</span> added "{expense.description}"
                                    {group && ` in "${group.name}"`}
                                </p>
                                <span className={isCurrentUserPayer ? 'text-green-600' : 'text-red-500'}>{amountText}</span>
                                <p className="text-sm text-gray-500">{new Date(expense.date).toLocaleDateString([], { weekday: 'long', hour: 'numeric', minute: 'numeric' })}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
         </div>
    );
};

const AccountView: React.FC<Omit<MultiViewProps, 'activeView'| 'onSelectGroup' | 'onOpenCreateGroupModal' | 'data'>> = ({ currentUser, onLogout, onUpdateProfile }) => {
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState(currentUser.name || '');
    
    useEffect(() => {
        setEditedName(currentUser.name || '');
    }, [currentUser.name]);

    const settings = ["Notifications", "Security", "Feedback"];
    
    const handleSaveName = () => {
        if (editedName.trim() && editedName.trim() !== currentUser.name) {
            onUpdateProfile(editedName.trim());
        }
        setIsEditingName(false);
    };

    const handleCancelEdit = () => {
        setEditedName(currentUser.name || '');
        setIsEditingName(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSaveName();
        } else if (e.key === 'Escape') {
            handleCancelEdit();
        }
    };

    return (
        <div className="container mx-auto">
            <header className="p-4 flex justify-center items-center">
                <h1 className="text-xl font-bold">Account</h1>
            </header>
            <div className="p-4">
                <div className="flex items-center space-x-4 mb-8">
                    <div className={`w-16 h-16 rounded-full flex-shrink-0 ${getAvatarColor(currentUser.id)}`}></div>
                    <div>
                        {isEditingName ? (
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={editedName}
                                    onChange={(e) => setEditedName(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="p-1 rounded bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 font-bold text-lg"
                                    autoFocus
                                />
                                <button onClick={handleSaveName} className="text-green-600 p-1 rounded-full hover:bg-green-100 dark:hover:bg-gray-700">{Icons.check}</button>
                                <button onClick={handleCancelEdit} className="text-gray-500 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">{Icons.close}</button>
                            </div>
                        ) : (
                            <div 
                                onClick={() => setIsEditingName(true)}
                                className="group flex items-center gap-2 cursor-pointer"
                            >
                                <p className="font-bold text-lg">{currentUser.name || currentUser.email || currentUser.mobile}</p>
                                <span className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {Icons.edit}
                                </span>
                            </div>
                        )}
                        <p className="text-sm text-gray-500">{currentUser.email || currentUser.mobile}</p>
                    </div>
                </div>

                <div className="space-y-1">
                    {settings.map(setting => (
                         <div 
                            key={setting}
                            className="p-3 flex justify-between items-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg cursor-pointer">
                            <span>{setting}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                         </div>
                    ))}
                </div>

                <div className="text-center mt-8">
                    <button onClick={onLogout} className="text-green-600 dark:text-green-400 font-semibold">Log out</button>
                </div>
                 <div className="text-center text-xs text-gray-400 mt-8">
                    <p>Smartsplit - Smart Expense Splitting</p>
                    <p>Copyright © 2024 Smartsplit</p>
                </div>
            </div>
        </div>
    );
};


const MultiViewContainer: React.FC<MultiViewProps> = (props) => {
  switch (props.activeView) {
    case 'groups':
      return <GroupsView {...props} />;
    case 'activity':
      return <ActivityView {...props} />;
    case 'account':
      return <AccountView {...props} />;
    default:
      return null;
  }
};

export default MultiViewContainer;