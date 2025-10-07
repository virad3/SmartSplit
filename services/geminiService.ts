
import { GoogleGenAI } from "@google/genai";
import { AppData, Group } from '../types';

if (!process.env.API_KEY) {
  console.warn("Gemini API key not found. AI features will be disabled. Please set process.env.API_KEY.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

export const generateReportSummary = async (data: AppData, currentUserEmail: string): Promise<string> => {
  if (!process.env.API_KEY) {
    return "AI features are disabled. API key not configured.";
  }

  const relevantGroups = data.groups.filter(g => g.members.includes(currentUserEmail));
  if (relevantGroups.length === 0) {
    return "No group data available to generate a summary.";
  }
  
  const simplifiedData = relevantGroups.map(group => {
      const groupExpenses = data.expenses.filter(e => e.groupId === group.id);
      return {
          groupName: group.name,
          members: group.members,
          expenses: groupExpenses.map(e => ({
              description: e.description,
              amount: e.amount,
              category: e.category,
              paidBy: data.users.find(u => u.id === e.paidBy)?.email || 'Unknown',
          }))
      }
  });

  const prompt = `
    You are a financial analyst summarizing expense data from a Splitwise-like app.
    The user's email is ${currentUserEmail}.
    Analyze the following expense data and provide a concise, insightful summary.
    Focus on:
    1. Overall spending habits across all groups.
    2. The group with the most spending.
    3. The top spending categories for the user.
    4. Who is the biggest spender and who has contributed the least.
    5. Provide a friendly and encouraging closing remark.

    Do not just list the data, provide qualitative analysis. Format the output as clean markdown.

    Here is the data in JSON format:
    ${JSON.stringify(simplifiedData, null, 2)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "There was an error generating the AI summary. Please check the console for details.";
  }
};
