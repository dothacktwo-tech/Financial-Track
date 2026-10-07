import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  X,
  Plus,
  Trash2,
  Edit2,
  Wallet,
  Receipt as ReceiptIcon,
  RotateCcw,
  Clock,
  Eye,
  Calendar,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { CurrencyInput } from '../components/ui/CurrencyInput';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { receiptService, ScannedReceiptResult } from '../services/receiptService';
import { formatCurrency } from '../lib/currency';
import { formatDate } from '../lib/date';
import { Account, Category, Receipt } from '../types/database';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';

interface ReceiptScannerProps {
  accounts: Account[];
  categories: Category[];
  onTransactionCreated: () => void;
  onNavigate: (path: string) => void;
}

export const ReceiptScanner: React.FC<ReceiptScannerProps> = ({
  accounts,
  categories,
  onTransactionCreated,
  onNavigate,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'scan' | 'history'>('scan');
  const [activeMode, setActiveMode] = useState<'upload' | 'camera'>('upload');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [scannedData, setScannedData] = useState<ScannedReceiptResult | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Saved receipts history state
  const [savedReceipts, setSavedReceipts] = useState<Receipt[]>([]);
  const [viewingReceipt, setViewingReceipt] = useState<Receipt | null>(null);
  const [deleteReceiptId, setDeleteReceiptId] = useState<string | null>(null);

  // Form confirmation state
  const [merchantName, setMerchantName] = useState<string>('');
  const [receiptDate, setReceiptDate] = useState<string>('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [items, setItems] = useState<Array<{ name: string; quantity: number; unit_price: number; subtotal: number }>>([]);

  // Camera video stream
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string>('');

  const loadSavedReceipts = async () => {
    if (!user) return;
    try {
      const data = await receiptService.getAll(user.id);
      setSavedReceipts(data);
    } catch (e) {
      console.error('Failed to load receipts:', e);
    }
  };

  useEffect(() => {
    loadSavedReceipts();
  }, [user]);

  // Stop camera when switching mode or unmounting
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  const startCamera = async (facingMode = 'environment') => {
    setCameraError('');
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode } },
        audio: false,
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError('Gagal mengakses kamera. Pastikan izin kamera telah diberikan atau gunakan opsi upload file.');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
  };

  const handleModeSwitch = (mode: 'upload' | 'camera') => {
    setActiveMode(mode);
    if (mode === 'camera') {
      startCamera(cameraFacing);
    } else {
      stopCamera();
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setSelectedImage(dataUrl);
      stopCamera();
      processReceipt(dataUrl);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setSelectedImage(base64);
      processReceipt(base64);
    };
    reader.readAsDataURL(file);
  };

  const processReceipt = async (imageBase64: string) => {
    setIsProcessing(true);
    setScannedData(null);
    try {
      const result = await receiptService.scanReceiptImage(imageBase64);
      setScannedData(result);

      // Populate confirmation form
      setMerchantName(result.merchant || 'Toko Belanja');
      setReceiptDate(result.date || new Date().toISOString().split('T')[0]);
      setTotalAmount(result.total || result.subtotal || 0);
      setTaxAmount(result.tax || 0);
      setDiscountAmount(result.discount || 0);
      setItems(result.items || []);

      // Auto-match category
      const matchedCat = categories.find(
        (c) =>
          c.type === 'expense' &&
          (c.name.toLowerCase().includes((result.predictedCategory || '').toLowerCase()) ||
            (result.predictedCategory || '').toLowerCase().includes(c.name.toLowerCase()))
      );
      setSelectedCategoryId(matchedCat ? matchedCat.id : (categories.find((c) => c.type === 'expense')?.id || ''));
      setSelectedAccountId(accounts[0]?.id || '');

      showToast('Struk berhasil dianalisis dengan AI!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal menganalisis struk.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmTransaction = async () => {
    if (!user) return;
    if (!totalAmount || totalAmount <= 0) {
      showToast('Total transaksi tidak boleh kosong', 'error');
      return;
    }
    if (!selectedAccountId) {
      showToast('Pilih rekening untuk pembayaran', 'error');
      return;
    }

    try {
      // 1. Save receipt record in database
      const receiptRecord = await receiptService.saveReceiptRecord(
        {
          user_id: user.id,
          image_path: selectedImage || '',
          merchant_name: merchantName,
          receipt_date: receiptDate,
          subtotal: totalAmount - taxAmount + discountAmount,
          discount: discountAmount,
          tax: taxAmount,
          total: totalAmount,
          ai_status: 'saved',
          raw_ocr_data: scannedData,
        },
        items
      );

      // 2. Create actual transaction linked to this receipt
      const { dataStore } = await import('../lib/dataStore');
      await dataStore.createTransaction(
        {
          user_id: user.id,
          account_id: selectedAccountId,
          category_id: selectedCategoryId || undefined,
          type: 'expense',
          amount: totalAmount,
          transaction_date: receiptDate,
          description: `Belanja: ${merchantName}`,
          payment_method: scannedData?.paymentMethod || 'Cash',
          source: 'receipt_ai',
          receipt_id: receiptRecord.id,
          notes: `Dipindai otomatis via AI OCR (${items.length} item)`,
        },
        items
      );

      showToast('Transaksi berhasil disimpan dari struk!', 'success');
      await loadSavedReceipts();
      onTransactionCreated();
      onNavigate('/transactions');
    } catch (e: any) {
      showToast(e.message || 'Gagal menyimpan transaksi', 'error');
    }
  };

  const handleDeleteReceipt = async () => {
    if (!deleteReceiptId) return;
    try {
      await receiptService.delete(deleteReceiptId);
      showToast('Struk berhasil dihapus dari riwayat.', 'success');
      setDeleteReceiptId(null);
      if (viewingReceipt?.id === deleteReceiptId) {
        setViewingReceipt(null);
      }
      await loadSavedReceipts();
    } catch (e: any) {
      showToast(e.message || 'Gagal menghapus struk', 'error');
    }
  };

  const resetAll = () => {
    setSelectedImage(null);
    setScannedData(null);
    setIsEditing(false);
    if (activeMode === 'camera') {
      startCamera(cameraFacing);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Page Title & Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <Sparkles className="h-4 w-4" />
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              AI Receipt Scanner & Riwayat Struk
            </h2>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Ambil foto struk belanja untuk deteksi otomatis oleh AI, atau kelola arsip struk Anda
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex rounded-xl bg-slate-100 p-1">
          <button
            onClick={() => {
              setActiveTab('scan');
              stopCamera();
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'scan' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            <Camera className="w-3.5 h-3.5" /> Scan Struk Baru
          </button>
          <button
            onClick={() => {
              setActiveTab('history');
              stopCamera();
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Riwayat Struk ({savedReceipts.length})
          </button>
        </div>
      </div>

      {activeTab === 'history' ? (
        /* Riwayat Struk Tersimpan */
        <Card className="p-0 overflow-hidden">
          {savedReceipts.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="Belum ada riwayat struk tersimpan"
                description="Scan struk belanja fisik Anda untuk menyimpan arsip dan mencatat transaksi otomatis."
                actionText="📸 Scan Struk Sekarang"
                onAction={() => setActiveTab('scan')}
              />
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {savedReceipts.map((rcpt) => (
                <div
                  key={rcpt.id}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/70 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-slate-900 overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center">
                      {rcpt.image_path ? (
                        <img
                          src={rcpt.image_path}
                          alt="Struk"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ReceiptIcon className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-extrabold text-sm text-slate-900 truncate">
                        {rcpt.merchant_name || 'Struk Belanja'}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span>{formatDate(rcpt.receipt_date)}</span>
                        <span>•</span>
                        <span>{rcpt.items?.length || 0} item barang</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="font-extrabold text-sm text-slate-900">
                        {formatCurrency(rcpt.total)}
                      </p>
                      <Badge variant="emerald" size="sm">
                        Tersimpan
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setViewingReceipt(rcpt)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Lihat Detail"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteReceiptId(rcpt.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Hapus Struk"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : (
        /* Tab Scan Struk */
        <>
          {!scannedData && (
            <Card className="p-6">
              {/* Mode Switcher */}
              <div className="flex items-center justify-center gap-3 mb-6">
                <button
                  onClick={() => handleModeSwitch('upload')}
                  className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition cursor-pointer ${
                    activeMode === 'upload'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Upload className="w-4 h-4" /> Upload Gambar / Galeri
                </button>
                <button
                  onClick={() => handleModeSwitch('camera')}
                  className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition cursor-pointer ${
                    activeMode === 'camera'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Camera className="w-4 h-4" /> Buka Kamera
                </button>
              </div>

              {/* Upload Area */}
              {activeMode === 'upload' && !selectedImage && (
                <label className="flex flex-col items-center justify-center min-h-[280px] rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-8 text-center hover:border-emerald-500 hover:bg-emerald-50/20 transition cursor-pointer">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-xs">
                    <ReceiptIcon className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">
                    Klik atau seret file struk ke sini
                  </p>
                  <p className="mt-1 text-xs text-slate-500 max-w-sm">
                    Mendukung file JPG, PNG, atau WebP. Pastikan foto struk terlihat jelas dan berorientasi tegak.
                  </p>
                  <div className="mt-5">
                    <span className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs">
                      Pilih dari Galeri / File
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              )}

              {/* Camera View Area */}
              {activeMode === 'camera' && !selectedImage && (
                <div className="space-y-4">
                  {cameraError ? (
                    <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-center">
                      <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-rose-800">{cameraError}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => handleModeSwitch('upload')}
                      >
                        Beralih ke Upload Galeri
                      </Button>
                    </div>
                  ) : (
                    <div className="relative rounded-2xl overflow-hidden bg-black aspect-3/4 sm:aspect-video flex items-center justify-center shadow-inner">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                      />
                      {/* Viewfinder overlay */}
                      <div className="absolute inset-8 border-2 border-dashed border-emerald-400/80 rounded-2xl pointer-events-none flex items-center justify-center">
                        <span className="text-[11px] font-semibold text-white/80 bg-black/50 px-3 py-1 rounded-full">
                          Posisikan struk belanja di dalam kotak
                        </span>
                      </div>

                      {/* Camera action buttons overlay */}
                      <div className="absolute bottom-5 inset-x-0 flex items-center justify-center gap-4">
                        <button
                          onClick={() => {
                            const next = cameraFacing === 'environment' ? 'user' : 'environment';
                            setCameraFacing(next);
                            startCamera(next);
                          }}
                          className="p-3 rounded-full bg-white/20 text-white backdrop-blur-md hover:bg-white/30 transition cursor-pointer"
                          title="Balik Kamera"
                        >
                          <RotateCcw className="w-5 h-5" />
                        </button>
                        <button
                          onClick={capturePhoto}
                          className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xl hover:bg-emerald-400 active:scale-95 transition cursor-pointer border-4 border-white"
                          title="Ambil Foto"
                        >
                          <Camera className="w-7 h-7" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Processing Loading Spinner */}
              {isProcessing && (
                <div className="py-12 flex flex-col items-center justify-center space-y-4">
                  <div className="relative">
                    <div className="h-16 w-16 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />
                    <Sparkles className="w-6 h-6 text-emerald-600 absolute inset-0 m-auto animate-pulse" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-800">
                      AI sedang menganalisis struk...
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Mendeteksi nama toko, daftar belanjaan, pajak, dan total bayar
                    </p>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Confirmation & Review UI */}
          {scannedData && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* AI Confidence Notice */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 leading-relaxed">
                  <strong className="font-bold">Konfirmasi Hasil Scan Struk:</strong> AI tidak otomatis
                  membuat transaksi tanpa persetujuan Anda. Periksa keakuratan data di bawah ini sebelum
                  menyimpan ke buku kas.
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Receipt Preview Image */}
                <Card className="lg:col-span-5 p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-700">Foto Struk Asli</span>
                      <button
                        onClick={resetAll}
                        className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Foto Ulang
                      </button>
                    </div>
                    {selectedImage && (
                      <div className="rounded-xl overflow-hidden border border-slate-200 max-h-[420px] bg-slate-900 flex items-center justify-center">
                        <img
                          src={selectedImage}
                          alt="Struk Belanja"
                          className="max-h-[420px] w-auto object-contain"
                        />
                      </div>
                    )}
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>OCR AI Gemini 3.8 Flash</span>
                    <Badge variant="emerald" size="sm">
                      {Math.round((scannedData.confidence || 0.95) * 100)}% Confidence
                    </Badge>
                  </div>
                </Card>

                {/* Right: Extracted Structured Data & Edit Form */}
                <Card className="lg:col-span-7 p-6 space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">Hasil Scan Struk</h3>
                      <p className="text-xs text-slate-500">Data hasil ekstraksi siap dikonfirmasi</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditing(!isEditing)}
                      className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> {isEditing ? 'Selesai Edit' : 'Edit Data'}
                    </button>
                  </div>

                  {/* Main Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Nama Toko / Merchant"
                      value={merchantName}
                      onChange={(e) => setMerchantName(e.target.value)}
                      readOnly={!isEditing}
                    />
                    <Input
                      type="date"
                      label="Tanggal Transaksi"
                      value={receiptDate}
                      onChange={(e) => setReceiptDate(e.target.value)}
                      readOnly={!isEditing}
                    />
                  </div>

                  {/* Accounts & Categories Assignment */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <Select
                      label="Dibayar Menggunakan Rekening"
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                      required
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({formatCurrency(acc.current_balance)})
                        </option>
                      ))}
                    </Select>

                    <Select
                      label="Kategori Pengeluaran"
                      value={selectedCategoryId}
                      onChange={(e) => setSelectedCategoryId(e.target.value)}
                    >
                      {categories
                        .filter((c) => c.type === 'expense')
                        .map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                    </Select>
                  </div>

                  {/* Scanned Items List */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Daftar Item Belanja ({items.length})
                      </span>
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() =>
                            setItems([...items, { name: 'Item Baru', quantity: 1, unit_price: 0, subtotal: 0 }])
                          }
                          className="text-[11px] font-bold text-emerald-600 hover:underline flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Tambah Baris
                        </button>
                      )}
                    </div>

                    <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 max-h-48 overflow-y-auto">
                      {items.length === 0 ? (
                        <p className="p-3 text-center text-xs text-slate-400">
                          Tidak ada rincian item individual terdeteksi
                        </p>
                      ) : (
                        items.map((it, idx) => (
                          <div key={idx} className="p-2.5 flex items-center justify-between gap-3 text-xs">
                            <div className="flex-1 min-w-0">
                              {isEditing ? (
                                <input
                                  className="w-full border-b border-slate-200 text-xs font-medium py-0.5 focus:outline-none"
                                  value={it.name}
                                  onChange={(e) => {
                                    const copy = [...items];
                                    copy[idx].name = e.target.value;
                                    setItems(copy);
                                  }}
                                />
                              ) : (
                                <p className="font-semibold text-slate-800 truncate">{it.name}</p>
                              )}
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {it.quantity}x @ {formatCurrency(it.unit_price)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">
                                {formatCurrency(it.subtotal || it.quantity * it.unit_price)}
                              </span>
                              {isEditing && (
                                <button
                                  type="button"
                                  onClick={() => setItems(items.filter((_, i) => i !== idx))}
                                  className="text-rose-500 hover:text-rose-700"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Total & Subtotal Breakdown */}
                  <div className="rounded-xl bg-slate-50 p-4 space-y-2 text-xs">
                    {taxAmount > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Pajak (PPN):</span>
                        <span>{formatCurrency(taxAmount)}</span>
                      </div>
                    )}
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>Diskon:</span>
                        <span>-{formatCurrency(discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-sm font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                      <span>Total Tagihan:</span>
                      {isEditing ? (
                        <input
                          type="number"
                          className="border rounded-lg px-2 py-1 text-right text-sm font-bold w-36"
                          value={totalAmount}
                          onChange={(e) => setTotalAmount(Number(e.target.value) || 0)}
                        />
                      ) : (
                        <span className="text-base text-rose-600">{formatCurrency(totalAmount)}</span>
                      )}
                    </div>
                  </div>

                  {/* Confirmation Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <Button variant="outline" onClick={resetAll}>
                      Batal / Scan Ulang
                    </Button>
                    <Button
                      onClick={handleConfirmTransaction}
                      icon={<CheckCircle2 className="w-4 h-4" />}
                    >
                      Simpan Transaksi
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal View Struk Detail */}
      {viewingReceipt && (
        <Modal
          isOpen={Boolean(viewingReceipt)}
          onClose={() => setViewingReceipt(null)}
          title={`Detail Struk: ${viewingReceipt.merchant_name || 'Struk Belanja'}`}
          description={`Tanggal: ${formatDate(viewingReceipt.receipt_date)}`}
        >
          <div className="space-y-4">
            {viewingReceipt.image_path && (
              <div className="rounded-xl overflow-hidden bg-slate-900 border border-slate-200 max-h-64 flex items-center justify-center">
                <img
                  src={viewingReceipt.image_path}
                  alt="Struk Belanja"
                  className="max-h-64 w-auto object-contain"
                />
              </div>
            )}

            <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-xs font-semibold text-slate-600">Total Pembayaran:</span>
              <span className="text-lg font-extrabold text-slate-900">
                {formatCurrency(viewingReceipt.total)}
              </span>
            </div>

            {viewingReceipt.items && viewingReceipt.items.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 block">Daftar Barang</span>
                <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 max-h-48 overflow-y-auto text-xs">
                  {viewingReceipt.items.map((it, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-800">{it.name}</p>
                        <p className="text-[10px] text-slate-400">
                          {it.quantity}x @ {formatCurrency(it.unit_price)}
                        </p>
                      </div>
                      <span className="font-bold text-slate-900">{formatCurrency(it.subtotal)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setViewingReceipt(null)}>
                Tutup
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setDeleteReceiptId(viewingReceipt.id)}
                icon={<Trash2 className="w-3.5 h-3.5" />}
              >
                Hapus Struk
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Receipt Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteReceiptId)}
        onClose={() => setDeleteReceiptId(null)}
        onConfirm={handleDeleteReceipt}
        title="Hapus Struk?"
        description="Data arsip struk ini akan dihapus dari riwayat."
      />
    </div>
  );
};
