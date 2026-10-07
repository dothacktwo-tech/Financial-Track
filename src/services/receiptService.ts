import { dataStore } from '../lib/dataStore';
import { Receipt } from '../types/database';
import { uploadReceiptToStorage } from '../lib/supabase';

export interface ScannedReceiptResult {
  merchant?: string;
  date?: string;
  receiptNumber?: string;
  items?: Array<{
    name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }>;
  subtotal?: number;
  discount?: number;
  tax?: number;
  total?: number;
  predictedCategory?: string;
  paymentMethod?: string;
  confidence?: number;
  note?: string;
}

export const receiptService = {
  async getAll(userId: string) {
    return await dataStore.getReceipts(userId);
  },

  /**
   * Upload receipt image directly to Supabase Storage bucket 'app-files-struk'
   */
  async uploadImage(fileOrDataUrl: File | Blob | string, userId: string, fileName?: string) {
    return await uploadReceiptToStorage(fileOrDataUrl, userId, fileName);
  },

  /**
   * Send image to backend Gemini OCR endpoint (/api/scan-receipt)
   */
  async scanReceiptImage(imageBase64: string, mimeType: string = 'image/jpeg'): Promise<ScannedReceiptResult> {
    const response = await fetch('/api/scan-receipt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageBase64, mimeType }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Gagal memproses struk dengan AI');
    }

    const data = await response.json();
    return data;
  },

  async saveReceiptRecord(receipt: Omit<Receipt, 'id' | 'created_at' | 'updated_at'>, items?: any[]) {
    let finalImagePath = receipt.image_path;

    // If image is a base64 string, upload to Supabase Storage bucket 'app-files-struk'
    if (receipt.image_path && receipt.image_path.startsWith('data:')) {
      try {
        const uploadResult = await uploadReceiptToStorage(
          receipt.image_path,
          receipt.user_id,
          `${Date.now()}_receipt.jpg`
        );
        if (uploadResult.success && uploadResult.url) {
          finalImagePath = uploadResult.url;
        } else {
          console.warn('Storage upload notice (falling back):', uploadResult.error);
        }
      } catch (err) {
        console.warn('Could not upload to storage bucket, keeping local representation:', err);
      }
    }

    return await dataStore.saveReceipt(
      {
        ...receipt,
        image_path: finalImagePath,
      },
      items
    );
  },

  async delete(id: string) {
    return await dataStore.deleteReceipt(id);
  },
};
