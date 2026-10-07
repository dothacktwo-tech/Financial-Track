import React, { useState } from 'react';
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  Briefcase,
  Gift,
  Laptop,
  TrendingUp,
  ShoppingCart,
  Utensils,
  Car,
  Zap,
  HeartPulse,
  Home,
  Film,
  GraduationCap,
  MoreHorizontal,
  FolderPlus,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Category, CategoryType } from '../types/database';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';

interface CategoriesProps {
  categories: Category[];
  onAddCategory: (cat: Omit<Category, 'id' | 'created_at'>) => Promise<void>;
  onUpdateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Briefcase: <Briefcase className="w-4 h-4" />,
  Gift: <Gift className="w-4 h-4" />,
  Laptop: <Laptop className="w-4 h-4" />,
  TrendingUp: <TrendingUp className="w-4 h-4" />,
  ShoppingCart: <ShoppingCart className="w-4 h-4" />,
  Utensils: <Utensils className="w-4 h-4" />,
  Car: <Car className="w-4 h-4" />,
  Zap: <Zap className="w-4 h-4" />,
  HeartPulse: <HeartPulse className="w-4 h-4" />,
  Home: <Home className="w-4 h-4" />,
  Film: <Film className="w-4 h-4" />,
  GraduationCap: <GraduationCap className="w-4 h-4" />,
  MoreHorizontal: <MoreHorizontal className="w-4 h-4" />,
};

const AVAILABLE_ICONS = [
  'ShoppingCart',
  'Utensils',
  'Car',
  'Zap',
  'HeartPulse',
  'Home',
  'Film',
  'GraduationCap',
  'Briefcase',
  'Gift',
  'Laptop',
  'TrendingUp',
  'MoreHorizontal',
];

export const Categories: React.FC<CategoriesProps> = ({
  categories,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'all' | CategoryType>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType>('expense');
  const [icon, setIcon] = useState('ShoppingCart');
  const [loading, setLoading] = useState(false);

  const filtered = categories.filter((c) => {
    if (activeTab === 'all') return true;
    return c.type === activeTab;
  });

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setName('');
    setType('expense');
    setIcon('ShoppingCart');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setType(cat.type);
    setIcon(cat.icon || 'ShoppingCart');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      if (editingCategory) {
        await onUpdateCategory(editingCategory.id, {
          name: name.trim(),
          type,
          icon,
        });
        showToast('Kategori berhasil diperbarui!', 'success');
      } else {
        await onAddCategory({
          user_id: user?.id,
          name: name.trim(),
          type,
          icon,
          is_active: true,
        });
        showToast('Kategori baru berhasil ditambahkan!', 'success');
      }
      setIsModalOpen(false);
    } catch (e: any) {
      showToast(e.message || 'Gagal menyimpan kategori', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Kelola Kategori Keuangan
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Atur klasifikasi pos pemasukan dan pos pengeluaran untuk pencatatan yang rapi
          </p>
        </div>
        <Button size="sm" onClick={handleOpenAdd} icon={<Plus className="w-4 h-4" />}>
          + Tambah Kategori
        </Button>
      </div>

      {/* Tabs */}
      <Card className="p-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Semua ({categories.length})
          </button>
          <button
            onClick={() => setActiveTab('expense')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'expense'
                ? 'bg-rose-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Pengeluaran ({categories.filter((c) => c.type === 'expense').length})
          </button>
          <button
            onClick={() => setActiveTab('income')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'income'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            Pemasukan ({categories.filter((c) => c.type === 'income').length})
          </button>
        </div>
      </Card>

      {/* Category Grid */}
      {filtered.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            title="Tidak ada kategori"
            description="Tambahkan kategori baru untuk memudahkan pengelompokan transaksi Anda."
            actionText="+ Tambah Kategori"
            onAction={handleOpenAdd}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((cat) => {
            const isInc = cat.type === 'income';
            const iconNode = ICON_MAP[cat.icon || ''] || <Tag className="w-4 h-4" />;

            return (
              <Card
                key={cat.id}
                className="p-4 flex items-center justify-between hover:shadow-md transition group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      isInc ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                    }`}
                  >
                    {iconNode}
                  </div>
                  <div className="min-w-0">
                    <p className="font-extrabold text-xs text-slate-800 truncate">{cat.name}</p>
                    <Badge variant={isInc ? 'emerald' : 'rose'} size="sm" className="mt-1">
                      {isInc ? 'Pemasukan' : 'Pengeluaran'}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                  <button
                    onClick={() => handleOpenEdit(cat)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                    title="Edit Kategori"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteCategoryId(cat.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                    title="Hapus Kategori"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Add / Edit Category */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? 'Edit Kategori' : 'Tambah Kategori Baru'}
        description="Kelola pos klasifikasi pemasukan dan pengeluaran"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
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
              onClick={() => setType('income')}
              className={`py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                type === 'income'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Pemasukan</span>
            </button>
          </div>

          <Input
            label="Nama Kategori"
            placeholder="Misal: Belanja Bulanan, Investasi Emas"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          {/* Icon Picker */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Pilih Ikon
            </label>
            <div className="grid grid-cols-7 gap-2 p-2 rounded-xl border border-slate-200 bg-slate-50/50">
              {AVAILABLE_ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  className={`p-2 rounded-xl flex items-center justify-center transition cursor-pointer ${
                    icon === ic
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                  title={ic}
                >
                  {ICON_MAP[ic] || <Tag className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" loading={loading}>
              {editingCategory ? 'Simpan Perubahan' : 'Tambah Kategori'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteCategoryId)}
        onClose={() => setDeleteCategoryId(null)}
        onConfirm={async () => {
          if (deleteCategoryId) {
            await onDeleteCategory(deleteCategoryId);
            setDeleteCategoryId(null);
            showToast('Kategori berhasil dihapus.', 'success');
          }
        }}
        title="Hapus Kategori?"
        description="Kategori ini akan dihapus. Transaksi yang telah menggunakan kategori ini tidak akan terhapus."
      />
    </div>
  );
};
