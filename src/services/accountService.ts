import { dataStore } from '../lib/dataStore';
import { Account } from '../types/database';

export const accountService = {
  async getAll(userId: string) {
    return await dataStore.getAccounts(userId);
  },

  async create(account: Omit<Account, 'id' | 'created_at' | 'updated_at'>) {
    return await dataStore.createAccount(account);
  },

  async update(id: string, updates: Partial<Account>) {
    return await dataStore.updateAccount(id, updates);
  },

  async delete(id: string) {
    return await dataStore.deleteAccount(id);
  },

  async transfer(params: {
    user_id: string;
    source_account_id: string;
    destination_account_id: string;
    amount: number;
    transaction_date: string;
    description?: string;
    notes?: string;
  }) {
    if (params.source_account_id === params.destination_account_id) {
      throw new Error('Rekening asal dan tujuan tidak boleh sama');
    }

    // Transfers do not count as income or expense
    return await dataStore.createTransaction({
      user_id: params.user_id,
      account_id: params.source_account_id,
      destination_account_id: params.destination_account_id,
      type: 'transfer',
      amount: params.amount,
      transaction_date: params.transaction_date,
      description: params.description || 'Transfer Antar Rekening',
      notes: params.notes,
      source: 'manual',
    });
  },
};
