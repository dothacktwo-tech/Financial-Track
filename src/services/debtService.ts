import { dataStore } from '../lib/dataStore';
import { Debt } from '../types/database';

export const debtService = {
  async getAll(userId: string) {
    return await dataStore.getDebts(userId);
  },

  async create(debt: Omit<Debt, 'id' | 'remaining_amount' | 'status' | 'created_at' | 'updated_at'>) {
    return await dataStore.createDebt(debt);
  },

  async update(id: string, updates: Partial<Debt>) {
    return await dataStore.updateDebt(id, updates);
  },

  async delete(id: string) {
    return await dataStore.deleteDebt(id);
  },

  async pay(debtId: string, payload: {
    account_id?: string;
    amount: number;
    payment_date: string;
    notes?: string;
    user_id: string;
  }) {
    return await dataStore.payDebt(debtId, payload);
  },
};
