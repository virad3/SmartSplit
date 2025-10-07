import React, { useState, useMemo, useEffect } from 'react';
import useLocalStorage from './hooks/useLocalStorage';
import { AppData, User, Expense, Group } from './types';
import * as firebase from './services/firebase';
import LoginView from './views/LoginView';
import FriendsView from './views/DashboardView'; // Repurposed for Friends
import MultiViewContainer from './views/ReportsView'; // Repurposed for Groups, Activity, Account
import GroupView from './views/GroupView';
import FriendView from './views/FriendView';
import BottomNav from './components/Header'; // Repurposed for BottomNav
import { Icons } from './constants';
import Modal from './components/Modal';
import Spinner from './components/Spinner';


export type MainView = 'friends' | 'groups' | 'activity' | 'account';
export type View = MainView | 'groupDetails' | 'friendDetails' | 'login';

const initialData: AppData = {
  users: [],
  groups: [],
  expenses: [],
};

const App: React.FC = () => {
  const [data, setData] = useState<AppData>(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useLocalStorage<User | null>('smartsplit-user', null);
  
  const [view, setView] = useState<View>(currentUser ? 'friends' : 'login');
  const [activeMainView, setActiveMainView] = useState<MainView>('friends');
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [activeFriendId, setActiveFriendId] = useState<string | null>(null);
  const [isAddExpenseModalOpen, setAddExpenseModalOpen] = useState(false);
  const [isAddFriendModalOpen, setAddFriendModalOpen] = useState(false);
  const [isCreateGroupModalOpen, setCreateGroupModalOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const dbData = await firebase.getAllData();
        setData(dbData);
      } catch (error) {
        console.error("Failed to load data from Firebase", error);
      } finally {
        setIsLoading(false);
        if (currentUser) {
            setView('friends');
        } else {
            setView('login');
        }
      }
    };
    loadData();
  }, []); // currentUser dependency removed to prevent re-running on login

  const findOrCreateUser = async (identifier: string): Promise<User> => {
    let user = await firebase.findUserByIdentifier(identifier);

    if (user) {
      return user;
    }

    const isEmail = /\S+@\S+\.\S+/.test(identifier);
    const isMobile = /^\d{10}$/.test(identifier);

    const newUser: User = {
      id: `user_${Date.now()}_${Math.random()}`,
      name: isEmail ? identifier.split('@')[0] : identifier,
      email: isEmail ? identifier : '',
      mobile: isMobile ? identifier : '',
    };
    
    await firebase.setUser(newUser);
    setData(prevData => ({ ...prevData, users: [...prevData.users, newUser] }));
    return newUser;
  };

  const handleLogin = async (identifier: string) => {
    const user = await findOrCreateUser(identifier);
    setCurrentUser(user);
    setView('friends');
    setActiveMainView('friends');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setView('login');
  };
  
  const handleSetMainView = (mainView: MainView) => {
      setView(mainView);
      setActiveMainView(mainView);
      setActiveGroupId(null);
      setActiveFriendId(null);
  }

  const handleSelectGroup = (groupId: string) => {
    setActiveGroupId(groupId);
    setView('groupDetails');
  };

  const handleSelectFriend = (friendId: string) => {
    setActiveFriendId(friendId);
    setView('friendDetails');
  };
  
  const handleBack = () => {
      setView(activeMainView);
      setActiveGroupId(null);
      setActiveFriendId(null);
  }

  const handleAddExpense = async (newExpenseData: Omit<Expense, 'id'>) => {
    const newExpense: Expense = {
      ...newExpenseData,
      id: `exp_${Date.now()}`,
    };
    try {
        await firebase.setExpense(newExpense);
        if(newExpense.groupId) {
            const group = data.groups.find(g => g.id === newExpense.groupId)!;
            const updatedGroup = {...group, expenses: [...group.expenses, newExpense.id]};
            await firebase.setGroup(updatedGroup);

            setData(prevData => ({
                ...prevData,
                expenses: [...prevData.expenses, newExpense],
                groups: prevData.groups.map(g => g.id === newExpense.groupId ? updatedGroup : g)
            }));
        } else {
             setData(prevData => ({
                ...prevData,
                expenses: [...prevData.expenses, newExpense],
            }));
        }
    } catch(error) {
        console.error("Failed to add expense", error);
    }
    setAddExpenseModalOpen(false);
  };
  
    const handleAddFriend = async (identifier: string) => {
        let friend = await firebase.findUserByIdentifier(identifier);
        
        let newFriendCreated = false;
        if (!friend) {
            const isEmail = /\S+@\S+\.\S+/.test(identifier);
            friend = {
                id: `user_${Date.now()}_${Math.random()}`,
                name: isEmail ? identifier.split('@')[0] : identifier,
                email: isEmail ? identifier : '',
                mobile: isEmail ? '' : identifier,
                friendIds: [],
            };
            newFriendCreated = true;
        }

        if (friend.id === currentUser!.id) {
            alert("You can't add yourself as a friend.");
            return;
        }

        const me = data.users.find(u => u.id === currentUser!.id)!;
        if (me.friendIds?.includes(friend.id)) {
            alert("This user is already your friend.");
            setAddFriendModalOpen(false);
            return;
        }
        
        const updatedMe = { ...me, friendIds: [...(me.friendIds || []), friend.id] };
        const updatedFriend = { ...friend, friendIds: [...(friend.friendIds || []), currentUser!.id] };
        
        try {
            await firebase.setUser(updatedMe);
            await firebase.setUser(updatedFriend);

            let updatedUsers;
            if (newFriendCreated) {
                updatedUsers = [...data.users.filter(u => u.id !== me.id), updatedMe, updatedFriend];
            } else {
                updatedUsers = data.users.map(u => {
                    if (u.id === updatedMe.id) return updatedMe;
                    if (u.id === updatedFriend.id) return updatedFriend;
                    return u;
                });
            }

            setData(prev => ({...prev, users: updatedUsers}));
            setCurrentUser(updatedMe);
            setAddFriendModalOpen(false);
        } catch(error) {
            console.error("Failed to add friend", error);
        }
    };

    const handleUpdateProfile = async (name: string) => {
        if (!currentUser) return;
        
        const updatedUser = { ...currentUser, name };
        try {
            await firebase.setUser(updatedUser);
            setData(prevData => ({
                ...prevData,
                users: prevData.users.map(u => 
                    u.id === currentUser.id ? updatedUser : u
                )
            }));
            setCurrentUser(updatedUser);
        } catch (error) {
            console.error("Failed to update profile", error);
        }
    };

    const handleCreateGroup = async (name: string, memberIdentifiers: string[]) => {
      if (!name.trim()) {
          alert("Group name cannot be empty.");
          return;
      }
      if (!currentUser) return;

      const newUsersToCreate: User[] = [];
      const memberEmails = new Set<string>([currentUser.email].filter(Boolean));
      
      const allMemberUsers: User[] = [currentUser];
      
      for (const identifier of memberIdentifiers) {
           if (identifier.trim() === '') continue;
           
           let existingUser = await firebase.findUserByIdentifier(identifier);

          if (existingUser) {
              if(!allMemberUsers.some(u => u.id === existingUser.id)) {
                allMemberUsers.push(existingUser);
                if (existingUser.email) memberEmails.add(existingUser.email);
              }
          } else {
               const isEmail = /\S+@\S+\.\S+/.test(identifier);
               const newUser: User = {
                    id: `user_${Date.now()}_${Math.random()}`,
                    name: isEmail ? identifier.split('@')[0] : identifier,
                    email: isEmail ? identifier : '',
                    mobile: isEmail ? '' : identifier,
               };
               newUsersToCreate.push(newUser);
               allMemberUsers.push(newUser);
               if(newUser.email) memberEmails.add(newUser.email);
          }
      }
      
      const newGroup: Group = {
          id: `group_${Date.now()}`,
          name: name.trim(),
          members: Array.from(memberEmails),
          expenses: [],
          createdBy: currentUser.id,
      };

      try {
        await firebase.createGroupWithUsers(newGroup, newUsersToCreate);

        setData(prevData => ({
            ...prevData,
            users: [...prevData.users, ...newUsersToCreate],
            groups: [...prevData.groups, newGroup],
        }));
        setCreateGroupModalOpen(false);
      } catch (error) {
        console.error("Failed to create group", error);
      }
   };
  
  const FloatingActionButton: React.FC<{onClick: () => void}> = ({ onClick }) => (
    <div className="fixed bottom-20 right-4 z-20">
        <button 
            onClick={onClick}
            className="flex items-center justify-center bg-green-600 text-white rounded-full shadow-lg px-4 py-3 text-sm font-bold hover:bg-green-700 transition-transform hover:scale-105"
        >
            {Icons.addExpense}
            Add expense
        </button>
    </div>
  );
  
  const AddExpenseModal: React.FC<{isOpen: boolean, onClose: () => void}> = ({isOpen, onClose}) => {
      const [description, setDescription] = useState('');
      const [amount, setAmount] = useState('');
      const [friendId, setFriendId] = useState('');
      const [splitType, setSplitType] = useState<'equally' | 'percentage' | 'amount'>('equally');
      const [percentages, setPercentages] = useState<{ [key: string]: string }>({});
      const [amounts, setAmounts] = useState<{ [key: string]: string }>({});
      
      const friends = useMemo(() => data.users.filter(u => u.id !== currentUser!.id), [data.users, currentUser]);

      useEffect(() => {
        if(isOpen && friends.length > 0 && !friendId) {
            setFriendId(friends[0].id);
        }
        if(isOpen && friendId) {
            setPercentages({
                [currentUser!.id]: '50.00',
                [friendId]: '50.00'
            });
            setAmounts({
                [currentUser!.id]: '',
                [friendId]: ''
            });
        }
      }, [isOpen, friends, friendId, currentUser]);
      
      const handleSave = () => {
         const numericAmount = parseFloat(amount);
         if (!description || isNaN(numericAmount) || numericAmount <= 0) {
             alert('Please enter a valid description and amount');
             return;
         }
         if (!friendId) {
             alert("Please select a friend to split the expense with.");
             return;
         }

        let splitData: Expense['split'];
        if (splitType === 'equally') {
            splitData = { type: 'equally' };
        } else if (splitType === 'percentage') {
            const totalPercentage = (parseFloat(percentages[currentUser!.id]) || 0) + (parseFloat(percentages[friendId]) || 0);
            if (Math.abs(totalPercentage - 100) > 0.01) {
                alert('Percentages must add up to 100.');
                return;
            }
            const distribution: { [key: string]: number } = {};
            distribution[currentUser!.id] = parseFloat(percentages[currentUser!.id]);
            distribution[friendId] = parseFloat(percentages[friendId]);
            splitData = { type: 'percentage', distribution };
        } else { // amount
            const totalAmount = (parseFloat(amounts[currentUser!.id]) || 0) + (parseFloat(amounts[friendId]) || 0);
            if (Math.abs(totalAmount - numericAmount) > 0.01) {
              alert('The sum of split amounts must equal the total expense amount.');
              return;
            }
            const distribution: { [key: string]: number } = {};
            distribution[currentUser!.id] = parseFloat(amounts[currentUser!.id]);
            distribution[friendId] = parseFloat(amounts[friendId]);
            splitData = { type: 'amount', distribution };
        }

         handleAddExpense({
             description,
             amount: numericAmount,
             paidBy: currentUser!.id,
             participants: [currentUser!.id, friendId],
             split: splitData,
             date: new Date().toISOString(),
             category: 'Other'
         });
         setDescription('');
         setAmount('');
         setFriendId(friends.length > 0 ? friends[0].id : '');
         setSplitType('equally');
      }
      
    const totalPercentage = useMemo(() => friendId ? (parseFloat(percentages[currentUser!.id]) || 0) + (parseFloat(percentages[friendId]) || 0) : 0, [percentages, friendId, currentUser]);
    const totalAmount = useMemo(() => friendId ? (parseFloat(amounts[currentUser!.id]) || 0) + (parseFloat(amounts[friendId]) || 0) : 0, [amounts, friendId, currentUser]);

      return (
          <Modal isOpen={isOpen} onClose={onClose} title="Add Expense">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                    <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full input" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount (₹)</label>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="mt-1 block w-full input" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">With</label>
                     <select value={friendId} onChange={e => setFriendId(e.target.value)} className="mt-1 block w-full input">
                        {friends.map(f => <option key={f.id} value={f.id}>{f.name || f.email || f.mobile}</option>)}
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
                {splitType === 'percentage' && friendId && (
                     <div className="space-y-2 pt-2">
                        {[currentUser, data.users.find(u => u.id === friendId)].map(user => user && (
                            <div key={user.id} className="flex items-center space-x-2">
                                <label className="w-2/5 truncate text-sm text-gray-600 dark:text-gray-300" title={user.email}>{user.id === currentUser!.id ? 'You' : (user.name || user.email.split('@')[0])}</label>
                                <input type="number" value={percentages[user.id] || ''} onChange={(e) => setPercentages(prev => ({ ...prev, [user.id]: e.target.value }))} className="w-1/5 input text-right" />
                                <span className="w-1/5 text-gray-500">%</span>
                                <span className="w-1/5 text-right text-sm text-gray-600 dark:text-gray-400">₹{((parseFloat(percentages[user.id]) || 0) / 100 * (parseFloat(amount) || 0)).toFixed(2)}</span>
                            </div>
                        ))}
                         <div className={`text-right font-semibold text-sm pr-2 ${Math.abs(totalPercentage - 100) > 0.01 ? 'text-red-500' : 'text-green-600'}`}>
                            Total: {totalPercentage.toFixed(2)}%
                        </div>
                    </div>
                )}
                {splitType === 'amount' && friendId && (
                     <div className="space-y-2 pt-2">
                        {[currentUser, data.users.find(u => u.id === friendId)].map(user => user && (
                            <div key={user.id} className="flex items-center space-x-2">
                                <label className="w-3/5 truncate text-sm text-gray-600 dark:text-gray-300" title={user.email}>{user.id === currentUser!.id ? 'You' : (user.name || user.email.split('@')[0])}</label>
                                <span className="text-gray-500">₹</span>
                                <input type="number" value={amounts[user.id] || ''} onChange={(e) => setAmounts(prev => ({ ...prev, [user.id]: e.target.value }))} className="w-2/5 input text-right" />
                            </div>
                        ))}
                         <div className={`text-right font-semibold text-sm pr-2 ${Math.abs(totalAmount - (parseFloat(amount) || 0)) > 0.01 ? 'text-red-500' : 'text-green-600'}`}>
                            Total: ₹{totalAmount.toFixed(2)}
                            <span className="font-normal text-gray-500 ml-2"> of ₹{(parseFloat(amount) || 0).toFixed(2)}</span>
                        </div>
                    </div>
                )}
                <div className="flex justify-end pt-4">
                    <button onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                        Save
                    </button>
                </div>
            </div>
             <style>{`.input {padding: 0.5rem 0.75rem; background-color: #F9FAFB; border: 1px solid #D1D5DB; border-radius: 0.375rem;} .dark .input { background-color: #374151; border-color: #4B5563; color: #E5E7EB;} .input:focus { border-color: #10B981; box-shadow: 0 0 0 1px #10B981; }`}</style>
          </Modal>
      )
  }
  
    const AddFriendModal: React.FC<{isOpen: boolean, onClose: () => void, onAdd: (identifier: string) => void}> = ({isOpen, onClose, onAdd}) => {
        const [identifier, setIdentifier] = useState('');
        const [error, setError] = useState('');

        const handleSubmit = () => {
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
            onAdd(identifier);
            setIdentifier('');
        };
        
        return (
            <Modal isOpen={isOpen} onClose={onClose} title="Add a friend">
                 <div className="space-y-4">
                    <div>
                        <label htmlFor="friend-identifier" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Friend's Email or Mobile</label>
                        <input
                            id="friend-identifier"
                            type="text"
                            value={identifier}
                            onChange={e => setIdentifier(e.target.value)}
                            className="mt-1 block w-full input"
                            placeholder="friend@example.com or 1234567890"
                        />
                    </div>
                    {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                    <div className="flex justify-end pt-4">
                        <button onClick={handleSubmit} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                            Add friend
                        </button>
                    </div>
                </div>
                 <style>{`.input {padding: 0.5rem 0.75rem; background-color: #F9FAFB; border: 1px solid #D1D5DB; border-radius: 0.375rem;} .dark .input { background-color: #374151; border-color: #4B5563; color: #E5E7EB;} .input:focus { border-color: #10B981; box-shadow: 0 0 0 1px #10B981; }`}</style>
            </Modal>
        );
    };

    const CreateGroupModal: React.FC<{
      isOpen: boolean;
      onClose: () => void;
      onCreate: (name: string, members: string[]) => void;
    }> = ({ isOpen, onClose, onCreate }) => {
      const [name, setName] = useState('');
      const [memberInput, setMemberInput] = useState('');
      const [members, setMembers] = useState<string[]>([]);
      const [error, setError] = useState('');

      useEffect(() => {
        if (isOpen) {
          setName('');
          setMemberInput('');
          setMembers([]);
          setError('');
        }
      }, [isOpen]);

      const handleAddMember = () => {
        if (!memberInput) return;
        
        const isEmail = /\S+@\S+\.\S+/.test(memberInput);
        const isMobile = /^\d{10}$/.test(memberInput);

        if (!isEmail && !isMobile) {
          setError('Invalid email or 10-digit mobile number.');
          return;
        }
        
        if (members.includes(memberInput) || (currentUser?.email === memberInput) || (currentUser?.mobile === memberInput)) {
            setError('This member has already been added.');
            return;
        }

        setError('');
        setMembers(prev => [...prev, memberInput]);
        setMemberInput('');
      };

      const handleRemoveMember = (memberToRemove: string) => {
        setMembers(prev => prev.filter(m => m !== memberToRemove));
      };

      const handleCreate = () => {
        if (!name.trim()) {
            setError("Please enter a group name.");
            return;
        }
        onCreate(name, members);
      };

      return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create a new group">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Group Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="mt-1 block w-full input"
                placeholder="e.g., Trip to Goa"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Add Members</label>
              <div className="flex items-center space-x-2 mt-1">
                <input
                  type="text"
                  value={memberInput}
                  onChange={e => setMemberInput(e.target.value)}
                  className="block w-full input"
                  placeholder="friend@example.com or 1234567890"
                  onKeyDown={e => {if(e.key === 'Enter') handleAddMember()}}
                />
                <button onClick={handleAddMember} className="px-4 py-2 border border-green-600 text-green-600 rounded-md hover:bg-green-50 dark:hover:bg-gray-700 whitespace-nowrap">Add</button>
              </div>
            </div>
            {(members.length > 0 || currentUser) && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Group Members:</h3>
                <div className="flex flex-wrap gap-2">
                  {currentUser && (
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-sm rounded-full">
                      {currentUser.name || currentUser.email} (You)
                    </span>
                  )}
                  {members.map(member => (
                    <span key={member} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm rounded-full flex items-center gap-2">
                      {member}
                      <button onClick={() => handleRemoveMember(member)} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-300">
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <div className="flex justify-end pt-4">
              <button onClick={handleCreate} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                Create Group
              </button>
            </div>
          </div>
          <style>{`.input {padding: 0.5rem 0.75rem; background-color: #F9FAFB; border: 1px solid #D1D5DB; border-radius: 0.375rem;} .dark .input { background-color: #374151; border-color: #4B5563; color: #E5E7EB;} .input:focus { border-color: #10B981; box-shadow: 0 0 0 1px #10B981; }`}</style>
        </Modal>
      );
    };

  const renderView = () => {
    if (!currentUser) {
      return <LoginView onLogin={handleLogin} />;
    }

    switch (view) {
      case 'friends':
        return <FriendsView 
                  currentUser={currentUser} 
                  data={data}
                  onSelectFriend={handleSelectFriend}
                  onAddFriendClick={() => setAddFriendModalOpen(true)}
                />;
      case 'groups':
      case 'activity':
      case 'account':
        return <MultiViewContainer
                 activeView={view}
                 currentUser={currentUser}
                 data={data}
                 onSelectGroup={handleSelectGroup}
                 onOpenCreateGroupModal={() => setCreateGroupModalOpen(true)}
                 onLogout={handleLogout}
                 onUpdateProfile={handleUpdateProfile}
               />;
      case 'groupDetails':
        const activeGroup = data.groups.find(g => g.id === activeGroupId);
        if (!activeGroup) {
          setView('friends');
          return null;
        }
        const groupExpenses = data.expenses.filter(e => activeGroup.expenses.includes(e.id));
        return <GroupView 
                  group={activeGroup} 
                  expenses={groupExpenses}
                  users={data.users}
                  currentUser={currentUser}
                  onAddExpense={handleAddExpense}
                  onBack={handleBack}
                />;
       case 'friendDetails':
        const activeFriend = data.users.find(u => u.id === activeFriendId);
        if (!activeFriend) {
          setView('friends');
          return null;
        }
        const friendExpenses = data.expenses.filter(e => 
          !e.groupId && 
          e.participants.includes(currentUser.id) &&
          e.participants.includes(activeFriend.id)
        );
        return <FriendView
                  currentUser={currentUser}
                  friend={activeFriend}
                  expenses={friendExpenses}
                  onAddExpense={handleAddExpense}
                  onBack={handleBack}
                />
      default:
        return <LoginView onLogin={handleLogin} />;
    }
  };
  
  const mainViews: MainView[] = ['friends', 'groups', 'activity', 'account'];
  const isMainView = mainViews.includes(view as MainView);
  const showFab = ['friends', 'groups', 'activity'].includes(view);

  if (isLoading) {
      return (
          <div className="h-screen w-screen flex justify-center items-center bg-white dark:bg-gray-900">
              <Spinner size="lg" />
          </div>
      );
  }

  return (
    <div className="h-screen w-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
      <main className="h-full w-full overflow-y-auto pb-16">
        {renderView()}
      </main>
      
      {isMainView && <BottomNav activeView={view as MainView} setView={handleSetMainView} />}
      {currentUser && showFab && <FloatingActionButton onClick={() => setAddExpenseModalOpen(true)} />}
      {currentUser && <AddExpenseModal isOpen={isAddExpenseModalOpen} onClose={() => setAddExpenseModalOpen(false)} />}
      {currentUser && <AddFriendModal isOpen={isAddFriendModalOpen} onClose={() => setAddFriendModalOpen(false)} onAdd={handleAddFriend} />}
      {currentUser && <CreateGroupModal isOpen={isCreateGroupModalOpen} onClose={() => setCreateGroupModalOpen(false)} onCreate={handleCreateGroup} />}
    </div>
  );
};

export default App;