import { dataStore } from '../lib/dataStore';
import { Transaction, TransactionItem } from '../types/database';

export const transactionService = {
  async getAll(userId: string) {
    return await dataStore.getTransactions(userId);
  },

  async create(payload: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>, items?: Omit<TransactionItem, 'id' | 'transaction_id'>[]) {
    return await dataStore.createTransaction(payload, items);
  },

  async update(id: string, updates: Partial<Transaction>) {
    return await dataStore.updateTransaction(id, updates);
  },

  async delete(id: string) {
    return await dataStore.deleteTransaction(id);
  },
};
