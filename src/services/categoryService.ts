import { dataStore } from '../lib/dataStore';
import { Category } from '../types/database';

export const categoryService = {
  async getAll(userId: string): Promise<Category[]> {
    return await dataStore.getCategories(userId);
  },

  async create(cat: Omit<Category, 'id' | 'created_at'>): Promise<Category> {
    return await dataStore.createCategory(cat);
  },

  async update(id: string, updates: Partial<Category>): Promise<Category> {
    return await dataStore.updateCategory(id, updates);
  },

  async delete(id: string): Promise<void> {
    return await dataStore.deleteCategory(id);
  },
};
