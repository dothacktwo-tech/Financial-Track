import React, { useState, useEffect, useMemo } from 'react';
import {
  Users as UsersIcon,
  UserPlus,
  Search,
  CheckCircle2,
  XCircle,
  Shield,
  User,
  ArrowLeft,
  Edit2,
  ShieldAlert,
  Key,
  Lock,
  Trash2,
  Copy,
  Check,
  Eye,
  EyeOff,
  Code2,
  Clock,
  Mail,
  AlertTriangle,
  RefreshCw,
  Phone,
  FileText,
  AtSign,
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
import { SUPABASE_USER_MANAGEMENT_SQL } from '../../lib/schemaSql';

export const Users: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal: Tambah Pengguna Baru
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('user');
  const [newStatus, setNewStatus] = useState<UserStatus>('active');
  const [newEmail, setNewEmail] = useState('');
  const [newAvatarUrl, setNewAvatarUrl] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [addingUser, setAddingUser] = useState(false);

  // Modal: Edit Pengguna
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('user');
  const [editStatus, setEditStatus] = useState<UserStatus>('active');
  const [editEmail, setEditEmail] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Modal: Reset / Ubah Password
  const [passwordTargetUser, setPasswordTargetUser] = useState<Profile | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [confirmPasswordValue, setConfirmPasswordValue] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Modal: Konfirmasi Hapus
  const [deleteTargetUser, setDeleteTargetUser] = useState<Profile | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // Modal: Skema SQL Supabase
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [hasCopiedSql, setHasCopiedSql] = useState(false);

  // Copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
        const username = (p.username || '').toLowerCase();
        const name = (p.full_name || '').toLowerCase();
        const email = (p.email || '').toLowerCase();
        const phone = (p.phone || '').toLowerCase();
        if (!username.includes(q) && !name.includes(q) && !email.includes(q) && !phone.includes(q)) return false;
      }
      return true;
    });
  }, [profiles, roleFilter, statusFilter, searchQuery]);

  // Handler: Tambah Pengguna Baru (Berbasis Username)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = newUsername.trim().toLowerCase().replace(/\s+/g, '');
    if (!cleanUser || cleanUser.length < 3) {
      showToast('Username wajib diisi minimal 3 karakter tanpa spasi.', 'error');
      return;
    }
    if (!newName.trim()) {
      showToast('Nama lengkap wajib diisi.', 'error');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      showToast('Password minimal 6 karakter untuk keamanan akun.', 'error');
      return;
    }

    setAddingUser(true);
    try {
      const created = await dataStore.createUser({
        username: cleanUser,
        full_name: newName.trim(),
        password: newPassword,
        role: newRole,
        status: newStatus,
        email: newEmail.trim() || undefined,
        avatar_url: newAvatarUrl.trim() || undefined,
        phone: newPhone.trim() || undefined,
        notes: newNotes.trim() || undefined,
      });

      showToast(`Pengguna baru "${created.username}" (${created.full_name}) berhasil didaftarkan! Dapat langsung login dengan username ini.`, 'success');
      
      // Reset form
      setNewUsername('');
      setNewName('');
      setNewPassword('');
      setNewRole('user');
      setNewStatus('active');
      setNewEmail('');
      setNewAvatarUrl('');
      setNewPhone('');
      setNewNotes('');
      setIsAddModalOpen(false);

      await fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Gagal mendaftarkan pengguna baru', 'error');
    } finally {
      setAddingUser(false);
    }
  };

  // Handler: Buka Modal Edit
  const handleOpenEdit = (p: Profile) => {
    setEditingUser(p);
    setEditUsername(p.username || '');
    setEditName(p.full_name || '');
    setEditRole(p.role);
    setEditStatus(p.status);
    setEditEmail(p.email || '');
    setEditAvatarUrl(p.avatar_url || '');
    setEditPhone(p.phone || '');
    setEditNotes(p.notes || '');
  };

  // Handler: Simpan Edit Pengguna
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editName.trim()) {
      showToast('Nama lengkap tidak boleh kosong.', 'error');
      return;
    }

    setSavingEdit(true);
    try {
      await dataStore.updateProfile(editingUser.id, {
        username: editUsername.trim().toLowerCase().replace(/\s+/g, '') || editingUser.username,
        full_name: editName.trim(),
        role: editRole,
        status: editStatus,
        email: editEmail.trim() || undefined,
        avatar_url: editAvatarUrl.trim() || undefined,
        phone: editPhone.trim() || undefined,
        notes: editNotes.trim() || undefined,
      });

      showToast(`Data pengguna "${editUsername || editName}" berhasil diperbarui!`, 'success');
      setEditingUser(null);
      await fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Gagal memperbarui data pengguna', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  // Handler: Buka Modal Reset Password
  const handleOpenResetPassword = (p: Profile) => {
    setPasswordTargetUser(p);
    setNewPasswordValue('');
    setConfirmPasswordValue('');
    setShowResetPassword(false);
  };

  // Handler: Simpan Reset Password
  const handleSaveResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordTargetUser) return;

    if (!newPasswordValue || newPasswordValue.length < 6) {
      showToast('Password baru minimal 6 karakter.', 'error');
      return;
    }
    if (newPasswordValue !== confirmPasswordValue) {
      showToast('Konfirmasi password tidak cocok dengan password baru.', 'error');
      return;
    }

    setSavingPassword(true);
    try {
      await dataStore.resetUserPassword(passwordTargetUser.id, newPasswordValue);
      showToast(`Password untuk username "${passwordTargetUser.username || passwordTargetUser.full_name}" berhasil diperbarui! Pengguna dapat langsung login dengan password ini.`, 'success');
      setPasswordTargetUser(null);
      await fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Gagal mereset password', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  // Handler: Hapus Pengguna
  const handleDeleteUser = async () => {
    if (!deleteTargetUser) return;
    if (deleteTargetUser.id === user?.id) {
      showToast('Anda tidak dapat menghapus akun Anda sendiri.', 'error');
      return;
    }

    setDeletingUser(true);
    try {
      await dataStore.deleteUser(deleteTargetUser.id, user?.id);
      showToast(`Pengguna "${deleteTargetUser.username || deleteTargetUser.full_name}" berhasil dihapus.`, 'success');
      setDeleteTargetUser(null);
      await fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus pengguna', 'error');
    } finally {
      setDeletingUser(false);
    }
  };

  // Handler: Toggle Status Aktif / Nonaktif
  const handleToggleStatus = async (p: Profile) => {
    if (p.id === user?.id) {
      showToast('Anda tidak dapat menonaktifkan akun Anda sendiri.', 'error');
      return;
    }
    const nextStatus: UserStatus = p.status === 'active' ? 'inactive' : 'active';
    try {
      await dataStore.updateProfile(p.id, { status: nextStatus });
      showToast(
        `Status akun "${p.username || p.full_name}" diubah menjadi ${nextStatus === 'active' ? 'Aktif (Dapat Login)' : 'Nonaktif (Login Diblokir)'}!`,
        'success'
      );
      await fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Gagal mengubah status pengguna', 'error');
    }
  };

  // Copy Username
  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast(`Disalin ke clipboard: ${text}`, 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Copy SQL Schema
  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_USER_MANAGEMENT_SQL);
    setHasCopiedSql(true);
    showToast('Skema SQL Login Berbasis Username berhasil disalin!', 'success');
    setTimeout(() => setHasCopiedSql(false), 2500);
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

  const activeCount = profiles.filter((p) => p.status === 'active').length;
  const adminCount = profiles.filter((p) => p.role === 'admin').length;
  const userCount = profiles.filter((p) => p.role === 'user').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => onNavigate('/admin')}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Admin Dashboard
          </button>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Pengaturan Manajemen Pengguna
            </h2>
            <Badge variant="emerald" size="sm">
              Login Username (Tanpa Email)
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Kelola data akun pengguna, kredensial login (username & password), hak akses, dan status aktivasi untuk masuk ke aplikasi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSqlModalOpen(true)}
            icon={<Code2 className="w-4 h-4 text-emerald-600" />}
          >
            Skema SQL Supabase
          </Button>
          <Button
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            icon={<UserPlus className="w-4 h-4" />}
          >
            Tambah Pengguna Baru
          </Button>
        </div>
      </div>

      {/* Info Card: Username Login Explanation */}
      <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200/80 rounded-2xl shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-sm shrink-0 mt-0.5">
            <User className="w-4 h-4" />
          </div>
          <div className="flex-1 text-xs">
            <h4 className="font-bold text-slate-900 text-sm">
              Login Aplikasi Menggunakan USERNAME (Tanpa Kewajiban Email)
            </h4>
            <p className="text-slate-600 mt-1 leading-relaxed">
              Sistem login aplikasi FinTrack menggunakan atribut <strong>Username</strong> dan <strong>Password</strong>. Setiap akun pengguna yang didaftarkan pada tabel di bawah ini dapat langsung digunakan untuk masuk ke aplikasi. Akun dengan status <strong>Nonaktif</strong> otomatis diblokir dari login.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-3 pt-2 border-t border-emerald-200/60 font-semibold text-slate-700">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Total: {profiles.length} Pengguna
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1.5 text-emerald-700">
                Aktif: {activeCount}
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1.5 text-rose-700">
                Administrator: {adminCount}
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1.5 text-slate-600">
                User Biasa: {userCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <Input
              placeholder="Cari berdasarkan username, nama lengkap, atau no HP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>

          <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="all">Semua Role ({profiles.length})</option>
            <option value="user">User Biasa ({userCount})</option>
            <option value="admin">Administrator ({adminCount})</option>
          </Select>

          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Semua Status</option>
            <option value="active">Aktif ({activeCount})</option>
            <option value="inactive">Nonaktif ({profiles.length - activeCount})</option>
          </Select>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="p-0 overflow-hidden shadow-sm border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Pengguna</th>
                <th className="py-3 px-4">Username (Data Login)</th>
                <th className="py-3 px-4">Kredensial Password</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status Akun</th>
                <th className="py-3 px-4">Login Terakhir</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                    Memuat data pengguna...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    <UsersIcon className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    Tidak ada pengguna yang cocok dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrent = u.id === user?.id;
                  const hasPassword = Boolean(u.password);
                  const displayUsername = u.username || (u.email ? u.email.split('@')[0] : 'user');

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name & Avatar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          {u.avatar_url ? (
                            <img
                              src={u.avatar_url}
                              alt={u.full_name}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                              {u.full_name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-extrabold text-slate-900">{u.full_name}</p>
                              {isCurrent && (
                                <Badge variant="emerald" size="sm" className="text-[9px] py-0">
                                  Anda
                                </Badge>
                              )}
                            </div>
                            {u.email && (
                              <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{u.email}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Username (Primary Login Identifier) */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                            @{displayUsername}
                          </span>
                          <button
                            onClick={() => handleCopyText(displayUsername, `user-${u.id}`)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded transition cursor-pointer"
                            title="Salin Username Login"
                          >
                            {copiedId === `user-${u.id}` ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        {u.phone && (
                          <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-2.5 h-2.5" /> {u.phone}
                          </p>
                        )}
                      </td>

                      {/* Password Status & Reset */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                            <Lock className="w-3 h-3 text-slate-400" />
                            {hasPassword ? '••••••••' : 'Aktif'}
                          </span>
                          <button
                            onClick={() => handleOpenResetPassword(u)}
                            className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded text-[11px] font-bold flex items-center gap-0.5 transition cursor-pointer"
                            title="Reset / Ubah Password Akun Ini"
                          >
                            <Key className="w-3 h-3" /> Ubah
                          </button>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3 px-4">
                        <Badge variant={u.role === 'admin' ? 'rose' : 'slate'} size="sm">
                          {u.role === 'admin' ? 'Administrator' : 'User Biasa'}
                        </Badge>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <Badge variant={u.status === 'active' ? 'emerald' : 'amber'} size="sm">
                          {u.status === 'active' ? 'Aktif (Bisa Login)' : 'Nonaktif (Diblokir)'}
                        </Badge>
                      </td>

                      {/* Last Login */}
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {u.last_login_at ? (
                          <div className="flex items-center gap-1 text-[11px]">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{formatDate(u.last_login_at)}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Belum pernah</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Toggle Status */}
                          <Button
                            size="sm"
                            variant={u.status === 'active' ? 'outline' : 'primary'}
                            disabled={isCurrent}
                            onClick={() => handleToggleStatus(u)}
                            className="text-[11px] h-7 px-2"
                          >
                            {u.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                          </Button>

                          {/* Edit user */}
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="Edit Data Pengguna"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete user */}
                          <button
                            onClick={() => setDeleteTargetUser(u)}
                            disabled={isCurrent}
                            className={`p-1.5 rounded-lg transition ${
                              isCurrent
                                ? 'text-slate-200 cursor-not-allowed'
                                : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
                            }`}
                            title={isCurrent ? 'Tidak dapat menghapus akun sendiri' : 'Hapus Pengguna'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: Tambah Pengguna Baru (Berbasis Username) */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Tambah Pengguna Baru"
        description="Buat akun pengguna baru dengan USERNAME dan password untuk login ke aplikasi FinTrack (tanpa kewajiban email)"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <Input
            label="Username (Data Login Utama) *"
            placeholder="Contoh: budi, alex, operator1"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
            leftIcon={<AtSign className="w-4 h-4 text-slate-400" />}
            helperText="Huruf kecil tanpa spasi, minimal 3 karakter. Digunakan langsung saat login."
            required
            autoFocus
          />

          <Input
            label="Nama Lengkap *"
            placeholder="Contoh: Budi Santoso"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Password Login Akun *
            </label>
            <div className="relative">
              <Input
                type={showNewPassword ? 'text' : 'password'}
                placeholder="Minimal 6 karakter"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Pengguna akan menggunakan username dan password ini di halaman login FinTrack.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Role Hak Akses"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as UserRole)}
            >
              <option value="user">User Biasa (Kelola Keuangan Sendiri)</option>
              <option value="admin">Administrator (Akses Penuh + Panel Admin)</option>
            </Select>

            <Select
              label="Status Aktivasi"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as UserStatus)}
            >
              <option value="active">Aktif (Langsung Bisa Login)</option>
              <option value="inactive">Nonaktif (Belum Bisa Login)</option>
            </Select>
          </div>

          <Input
            label="Alamat Email (Opsional)"
            type="email"
            placeholder="opsional@perusahaan.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
            helperText="Tidak wajib diisi. Login tetap menggunakan username."
          />

          <Input
            label="Nomor Telepon / WhatsApp (Opsional)"
            placeholder="Contoh: 08123456789"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
          />

          <Input
            label="URL Foto Profil (Opsional)"
            placeholder="https://..."
            value={newAvatarUrl}
            onChange={(e) => setNewAvatarUrl(e.target.value)}
          />

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Catatan Admin (Opsional)
            </label>
            <textarea
              rows={2}
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Catatan tambahan mengenai departemen, divisi, atau keperluan akun..."
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" loading={addingUser}>
              Simpan & Daftarkan Pengguna
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Pengguna */}
      <Modal
        isOpen={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        title={`Edit Pengguna: ${editingUser?.full_name}`}
        description="Perbarui informasi profil, username login, role hak akses, dan status aktivasi pengguna"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <Input
            label="Username (Login)"
            value={editUsername}
            onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
            leftIcon={<AtSign className="w-4 h-4 text-slate-400" />}
            helperText="Username digunakan untuk masuk ke aplikasi"
            required
          />

          <Input
            label="Nama Lengkap"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Role Hak Akses"
              value={editRole}
              onChange={(e) => setEditRole(e.target.value as UserRole)}
            >
              <option value="user">User Biasa</option>
              <option value="admin">Administrator</option>
            </Select>

            <Select
              label="Status Akun"
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as UserStatus)}
            >
              <option value="active">Aktif (Dapat Login)</option>
              <option value="inactive">Nonaktif (Login Diblokir)</option>
            </Select>
          </div>

          <Input
            label="Alamat Email (Opsional)"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
            placeholder="nama@email.com"
          />

          <Input
            label="Nomor Telepon / WhatsApp"
            value={editPhone}
            onChange={(e) => setEditPhone(e.target.value)}
            placeholder="08..."
          />

          <Input
            label="URL Foto Profil"
            value={editAvatarUrl}
            onChange={(e) => setEditAvatarUrl(e.target.value)}
            placeholder="https://..."
          />

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Catatan Pengguna
            </label>
            <textarea
              rows={2}
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Catatan..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
              Batal
            </Button>
            <Button type="submit" loading={savingEdit}>
              Simpan Perubahan
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Reset / Ubah Password */}
      <Modal
        isOpen={Boolean(passwordTargetUser)}
        onClose={() => setPasswordTargetUser(null)}
        title={`Ubah / Reset Password: ${passwordTargetUser?.full_name}`}
        description={`Tetapkan password baru untuk login akun @${passwordTargetUser?.username || passwordTargetUser?.full_name}`}
      >
        <form onSubmit={handleSaveResetPassword} className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            <p className="font-bold flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-600" /> Penggantian Password Langsung
            </p>
            <p className="mt-1 text-[11px] text-amber-700 leading-relaxed">
              Setelah password baru disimpan, pengguna dapat langsung menggunakannya untuk login menggunakan username <strong>@{passwordTargetUser?.username}</strong>.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Password Baru *
            </label>
            <div className="relative">
              <Input
                type={showResetPassword ? 'text' : 'password'}
                placeholder="Minimal 6 karakter"
                value={newPasswordValue}
                onChange={(e) => setNewPasswordValue(e.target.value)}
                leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowResetPassword(!showResetPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Konfirmasi Password Baru *
            </label>
            <Input
              type={showResetPassword ? 'text' : 'password'}
              placeholder="Ulangi password baru"
              value={confirmPasswordValue}
              onChange={(e) => setConfirmPasswordValue(e.target.value)}
              leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPasswordTargetUser(null)}
            >
              Batal
            </Button>
            <Button type="submit" loading={savingPassword}>
              Simpan Password Baru
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Konfirmasi Hapus Pengguna */}
      <Modal
        isOpen={Boolean(deleteTargetUser)}
        onClose={() => setDeleteTargetUser(null)}
        title="Konfirmasi Hapus Pengguna"
        description="Tindakan ini akan menghapus akun pengguna dan akses login"
      >
        <div className="space-y-4">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
            <p className="font-bold flex items-center gap-1.5 text-rose-900">
              <AlertTriangle className="w-4 h-4 text-rose-600" /> Peringatan Penghapusan Akun
            </p>
            <p className="mt-1 text-[11px] leading-relaxed">
              Apakah Anda yakin ingin menghapus akun <strong>@{deleteTargetUser?.username}</strong> ({deleteTargetUser?.full_name})? Pengguna ini tidak akan dapat login lagi ke aplikasi.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTargetUser(null)}
            >
              Batal
            </Button>
            <Button
              variant="danger"
              loading={deletingUser}
              onClick={handleDeleteUser}
            >
              Hapus Pengguna Sekarang
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Skema SQL Supabase untuk Manajemen Pengguna & Login Berbasis Username */}
      <Modal
        isOpen={isSqlModalOpen}
        onClose={() => setIsSqlModalOpen(false)}
        title="Skema SQL Supabase: Manajemen Pengguna & Login Username"
        description="Query SQL PostgreSQL lengkap untuk konfigurasi tabel profiles dengan USERNAME sebagai identitas login utama (tanpa kewajiban email), enkripsi password pgcrypto, dan stored procedure autentikasi."
      >
        <div className="space-y-4">
          {/* Analysis points */}
          <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Analisis Arsitektur Skema SQL (Berbasis Username):
            </h4>
            <ul className="list-disc pl-5 space-y-1 text-[11px]">
              <li>
                <strong>Identitas Login Tanpa Email:</strong> Kolom <code className="bg-slate-200 px-1 rounded">username text UNIQUE NOT NULL</code> digunakan sebagai pengenal utama saat login. Kolom email dibuat nullable / opsional.
              </li>
              <li>
                <strong>Ekstensi pgcrypto:</strong> Hashing password Blowfish aman (<code className="bg-slate-200 px-1 rounded">crypt(password, gen_salt('bf'))</code>).
              </li>
              <li>
                <strong>Stored Procedure authenticate_user(p_username, p_password):</strong> Memvalidasi username & password secara langsung di PostgreSQL dan mencatat waktu login.
              </li>
              <li>
                <strong>Stored Procedure admin_create_user(p_username, ...):</strong> Prosedur aman bagi admin untuk menambah akun baru dengan username unik.
              </li>
              <li>
                <strong>Seed Data Akun Bawaan:</strong> Username <code className="bg-slate-200 px-1 rounded">admin</code> (pass: <code className="bg-slate-200 px-1 rounded">admin123</code>) dan <code className="bg-slate-200 px-1 rounded">user</code> (pass: <code className="bg-slate-200 px-1 rounded">user123</code>).
              </li>
            </ul>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Kode SQL Siap Eksekusi:</span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopySql}
              icon={hasCopiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            >
              {hasCopiedSql ? 'Tersalin!' : 'Salin Semua SQL'}
            </Button>
          </div>

          <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-[10px] rounded-xl overflow-x-auto max-h-72 leading-relaxed select-all">
            {SUPABASE_USER_MANAGEMENT_SQL}
          </pre>

          <p className="text-[11px] text-slate-500">
            <strong>Cara Penggunaan:</strong> Buka <em>Supabase Dashboard &gt; SQL Editor &gt; New Query</em>, tempelkan query di atas dan klik <strong>Run</strong>.
          </p>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <Button variant="primary" onClick={() => setIsSqlModalOpen(false)}>
              Tutup
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
