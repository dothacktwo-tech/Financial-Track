import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { CurrencyInput } from '../ui/CurrencyInput';
import { Textarea } from '../ui/Textarea';
import { Account, Category, Transaction, TransactionType } from '../../types/database';
import { formatCurrency } from '../../lib/currency';
import { getTodayString } from '../../lib/date';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Sparkles, Plus, Trash2, ListPlus } from 'lucide-react';

interface TransactionItemInput {
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: any, items?: TransactionItemInput[]) => Promise<void>;
  accounts: Account[];
  categories: Category[];
  initialData?: Transaction | null;
  onNavigateToScan?: () => void;
}

export const TransactionFormModal: React.FC<TransactionFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  accounts,
  categories,
  initialData,
  onNavigateToScan,
}) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState<string>(getTodayString());
  const [accountId, setAccountId] = useState<string>('');
  const [destinationAccountId, setDestinationAccountId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [notes, setNotes] = useState<string>('');
  const [items, setItems] = useState<TransactionItemInput[]>([]);
  const [showItems, setShowItems] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (initialData) {
      setType(initialData.type);
      setAmount(initialData.amount);
      setDate(initialData.transaction_date || getTodayString());
      setAccountId(initialData.account_id || (accounts[0]?.id || ''));
      setDestinationAccountId(initialData.destination_account_id || '');
      setCategoryId(initialData.category_id || '');
      setDescription(initialData.description || '');
      setPaymentMethod(initialData.payment_method || 'Cash');
      setNotes(initialData.notes || '');
      if (initialData.items && initialData.items.length > 0) {
        setItems(
          initialData.items.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            unit_price: i.unit_price,
            subtotal: i.subtotal,
          }))
        );
        setShowItems(true);
      } else {
        setItems([]);
        setShowItems(false);
      }
    } else {
      setType('expense');
      setAmount(0);
      setDate(getTodayString());
      setAccountId(accounts[0]?.id || '');
      setDestinationAccountId(accounts[1]?.id || '');
      setCategoryId('');
      setDescription('');
      setPaymentMethod('Cash');
      setNotes('');
      setItems([]);
      setShowItems(false);
    }
    setError('');
  }, [initialData, isOpen, accounts]);

  // Filter categories by transaction type
  const filteredCategories = categories.filter((c) => c.type === (type === 'transfer' ? 'expense' : type));

  const handleAddItemRow = () => {
    setItems([...items, { name: '', quantity: 1, unit_price: 0, subtotal: 0 }]);
  };

  const handleItemChange = (index: number, field: keyof TransactionItemInput, val: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: val };
    if (field === 'quantity' || field === 'unit_price') {
      const q = field === 'quantity' ? Number(val) : updated[index].quantity;
      const p = field === 'unit_price' ? Number(val) : updated[index].unit_price;
      updated[index].subtotal = q * p;
    }
    setItems(updated);

    // Auto sum items to total amount if items exist
    const sum = updated.reduce((acc, it) => acc + (it.subtotal || 0), 0);
    if (sum > 0) {
      setAmount(sum);
    }
  };

  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
    const sum = updated.reduce((acc, it) => acc + (it.subtotal || 0), 0);
    if (sum > 0) {
      setAmount(sum);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      setError('Nominal harus lebih besar dari 0');
      return;
    }
    if (!accountId) {
      setError('Silakan pilih rekening');
      return;
    }
    if (type === 'transfer') {
      if (!destinationAccountId) {
        setError('Pilih rekening tujuan transfer');
        return;
      }
      if (accountId === destinationAccountId) {
        setError('Rekening asal dan tujuan tidak boleh sama');
        return;
      }
    }

    setLoading(true);
    setError('');
    try {
      const validItems = items.filter((i) => i.name.trim() !== '');
      await onSubmit(
        {
          type,
          amount,
          transaction_date: date,
          account_id: accountId,
          destination_account_id: type === 'transfer' ? destinationAccountId : undefined,
          category_id: type === 'transfer' ? undefined : categoryId || undefined,
          description: description.trim() || (type === 'transfer' ? 'Transfer Saldo' : type === 'income' ? 'Pemasukan' : 'Pengeluaran'),
          paymentMethod,
          notes: notes.trim() || undefined,
          source: initialData?.source || 'manual',
        },
        validItems.length > 0 ? validItems : undefined
      );
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan transaksi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Transaksi' : 'Catat Transaksi Baru'}
      description="Kelola pencatatan keuangan pribadi Anda secara instan"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Quick OCR Scan Shortcut Banner */}
        {!initialData && onNavigateToScan && (
          <div
            onClick={() => {
              onClose();
              onNavigateToScan();
            }}
            className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-800 hover:bg-emerald-100/70 transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold">Punya struk fisik? Scan otomatis dengan AI</span>
            </div>
            <span className="font-bold underline">Buka Scanner &rarr;</span>
          </div>
        )}

        {/* Transaction Type Tabs */}
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => {
              setType('expense');
              setError('');
            }}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition cursor-pointer ${
              type === 'expense'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Pengeluaran</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setType('income');
              setError('');
            }}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition cursor-pointer ${
              type === 'income'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Pemasukan</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setType('transfer');
              setError('');
            }}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition cursor-pointer ${
              type === 'transfer'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Transfer</span>
          </button>
        </div>

        {/* Nominal Input */}
        <CurrencyInput
          label="Nominal (Rp)"
          value={amount}
          onChange={setAmount}
          placeholder="0"
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Tanggal */}
          <Input
            type="date"
            label="Tanggal"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />

          {/* Rekening Asal */}
          <Select
            label={type === 'transfer' ? 'Dari Rekening' : 'Rekening / Dompet'}
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            required
          >
            <option value="">Pilih Rekening</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({formatCurrency(acc.current_balance)})
              </option>
            ))}
          </Select>
        </div>

        {/* Transfer Destination Rekening */}
        {type === 'transfer' && (
          <Select
            label="Ke Rekening Tujuan"
            value={destinationAccountId}
            onChange={(e) => setDestinationAccountId(e.target.value)}
            required
          >
            <option value="">Pilih Rekening Tujuan</option>
            {accounts
              .filter((acc) => acc.id !== accountId)
              .map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({formatCurrency(acc.current_balance)})
                </option>
              ))}
          </Select>
        )}

        {/* Kategori (if not transfer) */}
        {type !== 'transfer' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Kategori"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Tanpa Kategori</option>
              {filteredCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </Select>

            <Select
              label="Metode Pembayaran"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="Cash">Tunai (Cash)</option>
              <option value="BCA">BCA</option>
              <option value="Mandiri">Bank Mandiri</option>
              <option value="BRI">Bank BRI</option>
              <option value="BNI">Bank BNI</option>
              <option value="QRIS">QRIS</option>
              <option value="DANA">DANA</option>
              <option value="GoPay">GoPay</option>
              <option value="OVO">OVO</option>
              <option value="ShopeePay">ShopeePay</option>
              <option value="Kartu Kredit">Kartu Kredit</option>
              <option value="Lainnya">Lainnya</option>
            </Select>
          </div>
        )}

        {/* Deskripsi */}
        <Input
          label="Deskripsi / Merchant"
          placeholder={type === 'expense' ? 'Misal: Belanja Bulanan Superindo' : 'Misal: Gaji Pokok'}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {/* Optional Item Breakdown (CRUD Items) */}
        {type === 'expense' && (
          <div className="pt-1">
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={() => {
                  setShowItems(!showItems);
                  if (!showItems && items.length === 0) {
                    handleAddItemRow();
                  }
                }}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
              >
                <ListPlus className="w-3.5 h-3.5" />
                {showItems ? 'Sembunyikan Rincian Item Barang' : '+ Tambah Rincian Item Barang (Opsional)'}
              </button>

              {showItems && (
                <button
                  type="button"
                  onClick={handleAddItemRow}
                  className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Tambah Baris
                </button>
              )}
            </div>

            {showItems && (
              <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <input
                      type="text"
                      placeholder="Nama barang..."
                      value={item.name}
                      onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800"
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      min="1"
                      value={item.quantity || ''}
                      onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value) || 1)}
                      className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-center text-slate-800"
                    />
                    <input
                      type="number"
                      placeholder="Harga"
                      value={item.unit_price || ''}
                      onChange={(e) => handleItemChange(idx, 'unit_price', Number(e.target.value) || 0)}
                      className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-right text-slate-800"
                    />
                    <span className="w-20 text-right font-bold text-slate-700 text-xs">
                      {formatCurrency(item.subtotal)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Catatan Tambahan */}
        <Textarea
          label="Catatan (Opsional)"
          placeholder="Catatan tambahan..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />

        {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Batal
          </Button>
          <Button type="submit" loading={loading}>
            {initialData ? 'Simpan Perubahan' : 'Simpan Transaksi'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
