import React, { useState, useEffect, useMemo } from 'react';
import {
  Users as UsersIcon,
  Search,
  CheckCircle2,
  XCircle,
  Shield,
  User,
  ArrowLeft,
  Edit2,
  ShieldAlert,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { dataStore } from '../../lib/dataStore';
import { Profile, UserRole, UserStatus } from '../../types/database';
import { formatDate } from '../../lib/date';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ui/Toast';

export const Users: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Edit user modal
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('user');
  const [editStatus, setEditStatus] = useState<UserStatus>('active');
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await dataStore.getProfiles();
      setProfiles(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    return profiles.filter((p) => {
      if (roleFilter !== 'all' && p.role !== roleFilter) return false;
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (p.full_name || '').toLowerCase();
        const email = (p.email || '').toLowerCase();
        if (!name.includes(q) && !email.includes(q)) return false;
      }
      return true;
    });
  }, [profiles, roleFilter, statusFilter, searchQuery]);

  const handleOpenEdit = (p: Profile) => {
    setEditingUser(p);
    setEditRole(p.role);
    setEditStatus(p.status);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSaving(true);
    try {
      await dataStore.updateProfile(editingUser.id, {
        role: editRole,
        status: editStatus,
      });
      showToast(`Data pengguna ${editingUser.full_name} berhasil diperbarui!`, 'success');
      setEditingUser(null);
      await fetchUsers();
    } catch (e: any) {
      showToast(e.message || 'Gagal mengubah data pengguna', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (p: Profile) => {
    const nextStatus: UserStatus = p.status === 'active' ? 'inactive' : 'active';
    try {
      await dataStore.updateProfile(p.id, { status: nextStatus });
      showToast(`Status pengguna diubah menjadi ${nextStatus}!`, 'success');
      await fetchUsers();
    } catch (e: any) {
      showToast(e.message || 'Gagal mengubah status pengguna', 'error');
    }
  };

  if (!isAdmin) {
    return (
      <div className="py-12 text-center">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">Akses Ditolak</h3>
        <p className="text-xs text-slate-500 mt-1">
          Halaman ini khusus untuk administrator sistem.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => onNavigate('/admin')}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Admin Dashboard
          </button>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Manajemen Pengguna
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Kelola hak akses role (user/admin) dan status aktivasi pengguna
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            placeholder="Cari nama atau email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />

          <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="all">Semua Role</option>
            <option value="user">User Biasa</option>
            <option value="admin">Administrator</option>
          </Select>

          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </Select>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Pengguna</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Terdaftar</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      {u.avatar_url ? (
                        <img
                          src={u.avatar_url}
                          alt={u.full_name}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center">
                          {u.full_name?.charAt(0) || 'U'}
                        </div>
                      )}
                      <div>
                        <p className="font-extrabold text-slate-900">{u.full_name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{u.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-medium">{u.email || '-'}</td>
                  <td className="py-3 px-4">
                    <Badge variant={u.role === 'admin' ? 'rose' : 'slate'} size="sm">
                      {u.role === 'admin' ? 'Administrator' : 'User'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={u.status === 'active' ? 'emerald' : 'amber'} size="sm">
                      {u.status === 'active' ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                    {formatDate(u.created_at)}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleStatus(u)}
                      >
                        {u.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                      </Button>
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                        title="Edit Role & Status"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit User Modal */}
      <Modal
        isOpen={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        title={`Edit Pengguna: ${editingUser?.full_name}`}
        description="Ubah hak akses atau status akun pengguna"
      >
        <form onSubmit={handleSaveUser} className="space-y-4">
          <Select
            label="Role Pengguna"
            value={editRole}
            onChange={(e) => setEditRole(e.target.value as UserRole)}
          >
            <option value="user">User (Pengguna Biasa)</option>
            <option value="admin">Administrator (Akses Penuh)</option>
          </Select>

          <Select
            label="Status Akun"
            value={editStatus}
            onChange={(e) => setEditStatus(e.target.value as UserStatus)}
          >
            <option value="active">Active (Aktif)</option>
            <option value="inactive">Inactive (Nonaktif)</option>
          </Select>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
              Batal
            </Button>
            <Button type="submit" loading={saving}>
              Simpan Pengguna
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
