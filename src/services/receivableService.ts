import { dataStore } from '../lib/dataStore';
import { Receivable } from '../types/database';

export const receivableService = {
  async getAll(userId: string) {
    return await dataStore.getReceivables(userId);
  },

  async create(rec: Omit<Receivable, 'id' | 'remaining_amount' | 'status' | 'created_at' | 'updated_at'>) {
    return await dataStore.createReceivable(rec);
  },

  async update(id: string, updates: Partial<Receivable>) {
    return await dataStore.updateReceivable(id, updates);
  },

  async delete(id: string) {
    return await dataStore.deleteReceivable(id);
  },

  async pay(recId: string, payload: {
    account_id?: string;
    amount: number;
    payment_date: string;
    notes?: string;
    user_id: string;
  }) {
    return await dataStore.payReceivable(recId, payload);
  },
};
