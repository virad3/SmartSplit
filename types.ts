
export interface User {
  id: string;
  name?: string;
  email: string;
  mobile: string;
  friendIds?: string[]; // Array of user IDs
}

export interface Expense {
  id:string;
  groupId?: string;
  description: string;
  amount: number;
  paidBy: string; // User ID
  participants: string[]; // Array of user IDs
  split: {
    type: 'equally' | 'percentage' | 'amount';
    distribution?: { [key: string]: number }; // userId: percentage OR userId: amount
  };
  date: string;
  category: string;
}

export interface Group {
  id: string;
  name: string;
  members: string[]; // Array of user emails
  expenses: string[]; // Array of expense IDs
  createdBy: string; // User ID
}

export interface AppData {
  users: User[];
  groups: Group[];
  expenses: Expense[];
}