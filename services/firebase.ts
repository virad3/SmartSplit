// FIX: Refactored to use Firebase v8 namespaced API to resolve 'initializeApp' export error.
import firebase from 'firebase/app';
import 'firebase/firestore';
import { AppData, User, Group, Expense } from '../types';

// TODO: Replace with your actual Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCxxTN7X09QgEbiurNKH32eT5sYseSA2xg",
  authDomain: "smartsplit-9150c.firebaseapp.com",
  projectId: "smartsplit-9150c",
  storageBucket: "smartsplit-9150c.firebasestorage.app",
  messagingSenderId: "1096167114185",
  appId: "1:1096167114185:web:ee16b7408273661efc5418"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();

const getUsers = async (): Promise<User[]> => {
  const usersCol = db.collection('users');
  const userSnapshot = await usersCol.get();
  // Manually create plain objects to strip any Firebase-specific properties/prototypes
  return userSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      mobile: data.mobile,
      friendIds: data.friendIds || [],
    } as User;
  });
};

const getGroups = async (): Promise<Group[]> => {
  const groupsCol = db.collection('groups');
  const groupSnapshot = await groupsCol.get();
  // Manually create plain objects
  return groupSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: data.id,
      name: data.name,
      members: data.members,
      expenses: data.expenses,
      createdBy: data.createdBy,
    } as Group;
  });
};

const getExpenses = async (): Promise<Expense[]> => {
  const expensesCol = db.collection('expenses');
  const expenseSnapshot = await expensesCol.get();
  // Manually create plain objects
  return expenseSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
        id: data.id,
        groupId: data.groupId,
        description: data.description,
        amount: data.amount,
        paidBy: data.paidBy,
        participants: data.participants,
        split: data.split,
        date: data.date,
        category: data.category
    } as Expense;
  });
};

export const getAllData = async (): Promise<AppData> => {
    try {
        const [users, groups, expenses] = await Promise.all([
            getUsers(),
            getGroups(),
            getExpenses()
        ]);
        return { users, groups, expenses };
    } catch(error) {
        console.error("Error fetching all data from Firestore:", error);
        // Return empty data structure on error to prevent app crash
        return { users: [], groups: [], expenses: [] };
    }
};

export const findUserByIdentifier = async (identifier: string): Promise<User | null> => {
  const usersRef = db.collection("users");
  const isEmail = /\S+@\S+\.\S+/.test(identifier);
  
  const q = isEmail 
    ? usersRef.where("email", "==", identifier)
    : usersRef.where("mobile", "==", identifier);

  const querySnapshot = await q.get();
  if (!querySnapshot.empty) {
    const data = querySnapshot.docs[0].data();
     // Manually create a plain object to return
    return {
        id: data.id,
        name: data.name,
        email: data.email,
        mobile: data.mobile,
        friendIds: data.friendIds || [],
    } as User;
  }
  return null;
};


export const setUser = (user: User) => {
  return db.collection('users').doc(user.id).set(user, { merge: true });
};

export const setGroup = (group: Group) => {
  return db.collection('groups').doc(group.id).set(group, { merge: true });
};

export const setExpense = (expense: Expense) => {
  return db.collection('expenses').doc(expense.id).set(expense);
};

export const createGroupWithUsers = async (group: Group, newUsers: User[]) => {
    const batch = db.batch();
    
    // Add new users to the batch
    newUsers.forEach(user => {
        const userRef = db.collection("users").doc(user.id);
        batch.set(userRef, user);
    });

    // Add the new group to the batch
    const groupRef = db.collection("groups").doc(group.id);
    batch.set(groupRef, group);
    
    // Commit the batch
    await batch.commit();
}
