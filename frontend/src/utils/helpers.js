export function formatApiErrorDetail(detail) {
  if (detail == null) return "Terjadi kesalahan. Silakan coba lagi.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(dateString) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(dateString) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export const MONTHS = [
  '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const ROLES = [
  { value: 'kasir', label: 'Kasir - Hanya Input & Lihat Transaksi' },
  { value: 'investor', label: 'Investor - Read-Only Laporan' },
  { value: 'owner', label: 'Owner - Full Akses Bisnis' },
  { value: 'admin', label: 'Admin - Full Akses + Kelola Akun' },
];

export const JENIS_PERGERAKAN = [
  { value: 'TERPAKAI', label: 'KERTAS TERPAKAI (Print Sukses)' },
  { value: 'RUSAK', label: 'KERTAS RUSAK / ERROR / JAM' },
  { value: 'MASUK', label: 'KERTAS MASUK (Restock Beli Baru)' },
  { value: 'PENYESUAIAN', label: 'OPNAME (Selisih Hilang)' },
];
