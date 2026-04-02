<?php
session_start();
if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit();
}
require_once 'config.php';

$role = $_SESSION['role'];
$PIN_OWNER = '123456';

// PROSES FORM (Kasir, Owner, Admin)
if ($_SERVER['REQUEST_METHOD'] == 'POST' && $role != 'investor') {

    // INPUT STOK BARU / PEMAKAIAN / RUSAK
    if (isset($_POST['aksi']) && $_POST['aksi'] == 'input_stok') {
        $jenis = $_POST['jenis_pergerakan'];
        $jumlah = $_POST['jumlah_lembar'];
        $tanggal = date('Y-m-d'); // Tanggal terkunci otomatis
        $keterangan = htmlspecialchars($_POST['keterangan']);

        $stmt = $pdo->prepare("INSERT INTO log_kertas (tanggal, jenis_pergerakan, jumlah_lembar, keterangan) VALUES (?, ?, ?, ?)");
        $stmt->execute([$tanggal, $jenis, $jumlah, $keterangan]);
        $_SESSION['pesan'] = '<div class="alert alert-success alert-dismissible fade show">✅ Laporan pergerakan stok berhasil dicatat!<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>';
    }

    // EDIT STOK (Owner/Admin)
    elseif (isset($_POST['aksi']) && $_POST['aksi'] == 'edit_stok') {
        if (($_POST['pin_verifikasi'] === $PIN_OWNER) && ($role == 'owner' || $role == 'admin')) {
            $id_log = $_POST['id_log'];
            $jumlah_baru = $_POST['jumlah_lembar'];
            $keterangan_baru = htmlspecialchars($_POST['keterangan']);
            $alasan = htmlspecialchars($_POST['alasan_edit']);
            $waktu_edit = date('Y-m-d H:i:s');

            $stmt = $pdo->prepare("UPDATE log_kertas SET jumlah_lembar = ?, keterangan = ?, is_edited = 1, alasan_edit = ?, waktu_edit = ? WHERE id_log = ?");
            $stmt->execute([$jumlah_baru, $keterangan_baru, $alasan, $waktu_edit, $id_log]);
            $_SESSION['pesan'] = '<div class="alert alert-success alert-dismissible fade show">✅ Data stok berhasil diperbarui!<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>';
        } else {
            $_SESSION['pesan'] = '<div class="alert alert-danger alert-dismissible fade show">❌ Gagal: PIN Salah atau Akses Ditolak!<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>';
        }
    }

    // HAPUS STOK (Owner/Admin)
    elseif (isset($_POST['aksi']) && $_POST['aksi'] == 'hapus_stok') {
        if (($_POST['pin_verifikasi'] === $PIN_OWNER) && ($role == 'owner' || $role == 'admin')) {
            $stmt = $pdo->prepare("DELETE FROM log_kertas WHERE id_log = ?");
            $stmt->execute([$_POST['id_log']]);
            $_SESSION['pesan'] = '<div class="alert alert-success alert-dismissible fade show">🗑️ Riwayat stok berhasil dihapus!<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>';
        }
    }

    header("Location: kelola_stok.php");
    exit();
}

// MENGHITUNG SISA STOK SAAT INI
$stmtHitung = $pdo->query("SELECT 
    SUM(CASE WHEN jenis_pergerakan = 'MASUK' THEN jumlah_lembar ELSE 0 END) AS total_masuk,
    SUM(CASE WHEN jenis_pergerakan IN ('TERPAKAI', 'RUSAK', 'PENYESUAIAN') THEN jumlah_lembar ELSE 0 END) AS total_keluar
    FROM log_kertas");
$rekapStok = $stmtHitung->fetch(PDO::FETCH_ASSOC);
$sisa_stok = $rekapStok['total_masuk'] - $rekapStok['total_keluar'];


$stok_color = 'bg-success';
if ($sisa_stok <= 200) $stok_color = 'bg-warning text-dark';
if ($sisa_stok <= 50) $stok_color = 'bg-danger text-white animated flash';

// MENGAMBIL RIWAYAT STOK
$stmtLog = $pdo->query("SELECT * FROM log_kertas ORDER BY tanggal DESC, waktu_input DESC");
$logStok = $stmtLog->fetchAll(PDO::FETCH_ASSOC);
?>

<!DOCTYPE html>
<html lang="id">

<head>
    <meta charset="UTF-8">
    <title>Kelola Stok Kertas - Snappoint Traffa</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        .flash {
            animation: flashAnim 1.5s infinite;
        }

        @keyframes flashAnim {
            0% {
                opacity: 1;
            }

            50% {
                opacity: 0.5;
            }

            100% {
                opacity: 1;
            }
        }
    </style>
</head>

<body class="bg-light">

    <?php include 'navbar.php'; ?>

    <div class="container-fluid px-4">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2>Manajemen Stok Kertas</h2>
            <div class="card <?= $stok_color ?> shadow-sm">
                <div class="card-body p-2 px-4 text-center">
                    <h6 class="mb-0 <?= $sisa_stok <= 200 ? 'text-dark-50' : 'text-white-50' ?>">Sisa Fisik Kertas</h6>
                    <h3 class="mb-0 fw-bold"><?= number_format($sisa_stok, 0, ',', '.') ?> Lembar</h3>
                </div>
            </div>
        </div>

        <?php if (isset($_SESSION['pesan'])) {
            echo $_SESSION['pesan'];
            unset($_SESSION['pesan']);
        } ?>

        <div class="row">
            <?php if ($role != 'investor'): ?>
                <div class="col-xl-4 mb-4">
                    <div class="card shadow-sm border-dark">
                        <div class="card-header bg-dark text-white fw-bold">Catat Pergerakan Kertas</div>
                        <div class="card-body">
                            <form method="POST">
                                <input type="hidden" name="aksi" value="input_stok">
                                <div class="mb-3">
                                    <label>Jenis Pergerakan</label>
                                    <select name="jenis_pergerakan" class="form-select fw-bold" required>
                                        <option value="TERPAKAI">➖ KERTAS TERPAKAI (Print Sukses)</option>
                                        <option value="RUSAK">❌ KERTAS RUSAK / ERROR / JAM</option>
                                        <option value="MASUK">➕ KERTAS MASUK (Restock Beli Baru)</option>
                                        <?php if ($role == 'owner' || $role == 'admin'): ?>
                                            <option value="PENYESUAIAN">⚠️ OPNAME (Selisih Hilang)</option>
                                        <?php endif; ?>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label>Jumlah (Satuan Lembar)</label>
                                    <input type="number" name="jumlah_lembar" class="form-control" required placeholder="Contoh: 120">
                                    <small class="text-muted">Gunakan satuan terkecil. 1 Roll = ±700 lbr.</small>
                                </div>
                                <div class="mb-3">
                                    <label>Keterangan Detail</label>
                                    <input type="text" name="keterangan" class="form-control" required placeholder="Cth: Laporan pemakaian">
                                </div>
                                <button type="submit" class="btn btn-dark w-100 fw-bold">Simpan Log Kertas</button>
                            </form>
                        </div>
                    </div>
                </div>
            <?php endif; ?>

            <div class="col-xl-<?= $role == 'investor' ? '12' : '8' ?>">
                <div class="card shadow-sm">
                    <div class="card-header bg-secondary text-white fw-bold">Riwayat Log Kertas</div>
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-hover table-striped align-middle mb-0">
                                <thead class="table-light text-center">
                                    <tr>
                                        <th>Waktu Input</th>
                                        <th>Jenis</th>
                                        <th>Keterangan</th>
                                        <th>Jumlah</th>
                                        <?php if ($role == 'owner' || $role == 'admin'): ?><th>Aksi</th><?php endif; ?>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php if (count($logStok) > 0): ?>
                                        <?php foreach ($logStok as $log): ?>
                                            <tr>
                                                <td class="text-center" style="white-space: nowrap;">
                                                    <span class="fw-bold"><?= date('d/m/Y', strtotime($log['tanggal'])) ?></span><br>
                                                    <small class="text-muted"><?= date('H:i', strtotime($log['waktu_input'])) ?></small>
                                                </td>
                                                <td class="text-center">
                                                    <?php
                                                    $badge = ['MASUK' => 'success', 'TERPAKAI' => 'primary', 'RUSAK' => 'danger', 'PENYESUAIAN' => 'warning text-dark'];
                                                    ?>
                                                    <span class="badge bg-<?= $badge[$log['jenis_pergerakan']] ?>"><?= $log['jenis_pergerakan'] ?></span>
                                                </td>
                                                <td>
                                                    <?= htmlspecialchars($log['keterangan']) ?>
                                                    <?php if ($log['is_edited']): ?>
                                                        <div class="text-warning small mt-1">✏️ <strong>Diedit:</strong> <?= htmlspecialchars($log['alasan_edit']) ?></div>
                                                    <?php endif; ?>
                                                </td>
                                                <td class="text-center fw-bold fs-5 <?= $log['jenis_pergerakan'] == 'MASUK' ? 'text-success' : 'text-danger' ?>">
                                                    <?= $log['jenis_pergerakan'] == 'MASUK' ? '+' : '-' ?><?= number_format($log['jumlah_lembar'], 0, ',', '.') ?>
                                                </td>

                                                <?php if ($role == 'owner' || $role == 'admin'): ?>
                                                    <td class="text-center">
                                                        <button class="btn btn-sm btn-outline-secondary mb-1" data-bs-toggle="modal" data-bs-target="#editModal<?= $log['id_log'] ?>">Edit</button>
                                                        <button class="btn btn-sm btn-outline-danger mb-1" data-bs-toggle="modal" data-bs-target="#hapusModal<?= $log['id_log'] ?>">X</button>
                                                    </td>
                                                <?php endif; ?>
                                            </tr>
                                        <?php endforeach; ?>
                                    <?php else: ?>
                                        <tr>
                                            <td colspan="5" class="text-center py-4">Belum ada riwayat pergerakan stok kertas.</td>
                                        </tr>
                                    <?php endif; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <?php if ($role == 'owner' || $role == 'admin'): ?>
        <?php foreach ($logStok as $log): ?>
            <div class="modal fade" id="editModal<?= $log['id_log'] ?>">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <form method="POST">
                            <div class="modal-header bg-warning">
                                <h5 class="modal-title">Edit Log Stok</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body"><input type="hidden" name="aksi" value="edit_stok"><input type="hidden" name="id_log" value="<?= $log['id_log'] ?>">
                                <div class="mb-3"><label>Keterangan</label><input type="text" name="keterangan" class="form-control" value="<?= htmlspecialchars($log['keterangan']) ?>" required></div>
                                <div class="mb-3"><label>Jumlah Lembar</label><input type="number" name="jumlah_lembar" class="form-control" value="<?= $log['jumlah_lembar'] ?>" required></div>
                                <hr>
                                <div class="mb-3"><label class="text-danger fw-bold">Alasan Edit (Wajib)</label><textarea name="alasan_edit" class="form-control" required></textarea></div>
                                <div class="mb-3"><label class="text-danger fw-bold">PIN Owner</label><input type="password" name="pin_verifikasi" class="form-control text-center" required></div>
                            </div>
                            <div class="modal-footer border-0"><button type="submit" class="btn btn-warning w-100 fw-bold">Verifikasi & Simpan</button></div>
                        </form>
                    </div>
                </div>
            </div>

            <div class="modal fade" id="hapusModal<?= $log['id_log'] ?>">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <form method="POST">
                            <div class="modal-header bg-danger text-white">
                                <h5 class="modal-title">Hapus Riwayat?</h5><button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <p>Hapus riwayat <strong><?= $log['jenis_pergerakan'] ?> (<?= $log['jumlah_lembar'] ?> Lembar)</strong>?</p><input type="hidden" name="aksi" value="hapus_stok"><input type="hidden" name="id_log" value="<?= $log['id_log'] ?>">
                                <div class="mb-3"><label class="text-danger fw-bold">Masukkan PIN Owner</label><input type="password" name="pin_verifikasi" class="form-control text-center" required></div>
                            </div>
                            <div class="modal-footer border-0"><button type="submit" class="btn btn-danger w-100 fw-bold">Verifikasi & Hapus</button></div>
                        </form>
                    </div>
                </div>
            </div>
        <?php endforeach; ?>
    <?php endif; ?>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>

</html>