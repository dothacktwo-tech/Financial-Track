import { dataStore } from '../lib/dataStore';
import { SavingGoal } from '../types/database';

export const savingsService = {
  async getAll(userId: string) {
    return await dataStore.getSavingGoals(userId);
  },

  async create(goal: Omit<SavingGoal, 'id' | 'current_amount' | 'status' | 'created_at' | 'updated_at'>) {
    return await dataStore.createSavingGoal(goal);
  },

  async update(id: string, updates: Partial<SavingGoal>) {
    return await dataStore.updateSavingGoal(id, updates);
  },

  async delete(id: string) {
    return await dataStore.deleteSavingGoal(id);
  },

  async contribute(goalId: string, payload: {
    account_id?: string;
    amount: number;
    type: 'deposit' | 'withdrawal';
    transaction_date: string;
    notes?: string;
    user_id: string;
  }) {
    return await dataStore.contributeSavingGoal(goalId, payload);
  },
};
