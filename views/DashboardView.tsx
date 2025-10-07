
import React, { useMemo } from 'react';
import { User, AppData, Expense } from '../types';
import { Icons } from '../constants';

interface FriendsViewProps {
  currentUser: User;
  data: AppData;
  onSelectFriend: (friendId: string) => void;
  onAddFriendClick: () => void;
}

const getAvatarColor = (id: string) => {
    const colors = ['bg-orange-200', 'bg-teal-200', 'bg-cyan-200', 'bg-fuchsia-200', 'bg-rose-200'];
    const hash = id.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
    return colors[Math.abs(hash) % colors.length];
}

const FriendsView: React.FC<FriendsViewProps> = ({ currentUser, data, onSelectFriend, onAddFriendClick }) => {
  const balances = useMemo(() => {
    const friendBalances: { [friendId: string]: number } = {};
    const individualExpenses = data.expenses.filter(e => !e.groupId && e.participants.includes(currentUser.id));
    
    individualExpenses.forEach(expense => {
      const otherParticipantId = expense.participants.find(pId => pId !== currentUser.id);
      if (!otherParticipantId) return;

      if (!friendBalances[otherParticipantId]) {
        friendBalances[otherParticipantId] = 0;
      }
      
      if (!expense.split || expense.split.type === 'equally') {
        const share = expense.amount / expense.participants.length;
        if (expense.paidBy === currentUser.id) {
            friendBalances[otherParticipantId] += share;
        } else {
            friendBalances[otherParticipantId] -= share;
        }
      } else if (expense.split.type === 'percentage' && expense.split.distribution) {
          if (expense.paidBy === currentUser.id) {
              const friendShare = expense.amount * ((expense.split.distribution[otherParticipantId] || 0) / 100);
              friendBalances[otherParticipantId] += friendShare;
          } else { // friend paid
              const myShare = expense.amount * ((expense.split.distribution[currentUser.id] || 0) / 100);
              friendBalances[otherParticipantId] -= myShare;
          }
      } else if (expense.split.type === 'amount' && expense.split.distribution) {
          if (expense.paidBy === currentUser.id) {
              const friendShare = expense.split.distribution[otherParticipantId] || 0;
              friendBalances[otherParticipantId] += friendShare;
          } else { // friend paid
              const myShare = expense.split.distribution[currentUser.id] || 0;
              friendBalances[otherParticipantId] -= myShare;
          }
      }
    });

    // Collect all potential friends (from groups and explicit friend list)
    const allFriendIds = new Set<string>();

    // From groups
    data.groups.forEach(group => {
        if(group.members.includes(currentUser.email)) {
            group.members.forEach(memberEmail => {
                const user = data.users.find(u => u.email === memberEmail);
                if (user && user.id !== currentUser.id) {
                    allFriendIds.add(user.id);
                }
            });
        }
    });

    // From explicit friend list
    currentUser.friendIds?.forEach(id => {
      allFriendIds.add(id);
    });

    // Ensure all friends are in the balance list, even with 0 balance
    allFriendIds.forEach(id => {
        if (!friendBalances[id]) {
            friendBalances[id] = 0;
        }
    });


    return Object.entries(friendBalances).map(([friendId, balance]) => ({
      friend: data.users.find(u => u.id === friendId)!,
      balance,
    })).filter(item => item.friend);
  }, [data, currentUser]);

  const totalBalance = useMemo(() => {
    // Note: This is a simplified total of non-group balances. A full calculation would include group balances.
    return balances.reduce((acc, curr) => acc + curr.balance, 0);
  }, [balances]);

  return (
    <div className="container mx-auto">
        <header className="p-4 flex justify-between items-center">
             <button className="p-2 text-gray-600 dark:text-gray-300">{Icons.search}</button>
             <button onClick={onAddFriendClick} className="font-semibold text-green-600 dark:text-green-400">Add friends</button>
        </header>

        <div className="px-4 py-2">
            <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-200">Overall, you are owed</span>
                <button className="p-2 text-gray-600 dark:text-gray-300">{Icons.filter}</button>
            </div>
            <span className="text-2xl font-bold text-green-600 dark:text-green-400">₹{totalBalance.toFixed(2)}</span>
        </div>

        <div className="py-4">
             {balances.map(({ friend, balance }) => (
                <div key={friend.id} onClick={() => onSelectFriend(friend.id)} className="px-4 py-3 flex items-center space-x-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                    <div className={`w-10 h-10 rounded-full flex-shrink-0 ${getAvatarColor(friend.id)}`}></div>
                    <div className="flex-grow">
                        <p className="font-semibold text-gray-800 dark:text-gray-100">{friend.name || friend.email || friend.mobile}</p>
                    </div>
                    <div className="text-right">
                        {Math.abs(balance) < 0.01 && <span className="text-sm text-gray-500">settled up</span>}
                        {balance > 0.01 && <span className="text-sm text-green-600">owes you</span>}
                        {balance < -0.01 && <span className="text-sm text-red-500">you owe</span>}
                        <p className={`font-semibold ${balance > 0.01 ? 'text-green-600' : balance < -0.01 ? 'text-red-500' : 'text-gray-500'}`}>
                           ₹{Math.abs(balance).toFixed(2)}
                        </p>
                    </div>
                </div>
            ))}
        </div>
        
        <div className="px-4 py-6 text-center">
            <p className="text-sm text-gray-500 mb-2">Hiding friends you settled up with over 7 days ago</p>
            <button className="px-4 py-2 border border-green-600 text-green-600 rounded-md hover:bg-green-50 dark:hover:bg-gray-800">
                Show 0 settled-up friends
            </button>
        </div>
    </div>
  );
};

export default FriendsView;