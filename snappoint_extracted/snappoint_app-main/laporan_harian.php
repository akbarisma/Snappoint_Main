<?php
session_start();
if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit();
}

if ($_SESSION['role'] == 'investor') {
    header("Location: index.php");
    exit();
}
require_once 'config.php';

$pesan = '';
$PIN_OWNER = '123456';
// PROSES EDIT TRANSAKSI
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['aksi']) && $_POST['aksi'] == 'edit') {
    $pin_input = $_POST['pin_verifikasi'];
    
    if ($pin_input === $PIN_OWNER) {
        try {
            $id_trx = $_POST['id_transaksi'];
            $keterangan_baru = htmlspecialchars($_POST['keterangan']);
            $nominal_baru = $_POST['nominal'];
            $alasan = htmlspecialchars($_POST['alasan_edit']);
            $waktu_edit = date('Y-m-d H:i:s');
            
            $stmt = $pdo->prepare("UPDATE transaksi_keuangan SET keterangan = ?, nominal = ?, is_edited = 1, alasan_edit = ?, waktu_edit = ? WHERE id_transaksi = ?");
            $stmt->execute([$keterangan_baru, $nominal_baru, $alasan, $waktu_edit, $id_trx]);
            
            $pesan = '<div class="alert alert-success alert-dismissible fade show">✅ Data berhasil diubah!<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>';
        } catch(PDOException $e) {
            $pesan = '<div class="alert alert-danger">❌ Gagal mengedit: ' . $e->getMessage() . '</div>';
        }
    } else {
        $pesan = '<div class="alert alert-danger alert-dismissible fade show">❌ GAGAL: PIN Verifikasi Salah! Upaya manipulasi digagalkan.<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>';
    }
}

// AMBIL DATA TRANSAKSI DETAIL
$sql = "SELECT 
            t.id_transaksi, t.tanggal, t.waktu_input, t.keterangan, t.is_edited, t.alasan_edit, t.waktu_edit, t.is_backdated, t.alasan_backdate,
            k.nama_kategori, k.jenis,
            CASE WHEN k.jenis = 'PEMASUKAN' THEN t.nominal ELSE 0 END AS masuk,
            CASE WHEN k.jenis = 'PENGELUARAN' THEN t.nominal ELSE 0 END AS keluar
        FROM transaksi_keuangan t
        JOIN kategori_transaksi k ON t.id_kategori = k.id_kategori
        ORDER BY t.tanggal ASC, t.waktu_input ASC";

$stmt = $pdo->query($sql);
$dataMentah = $stmt->fetchAll(PDO::FETCH_ASSOC);

$saldo_berjalan = 0;
$dataDetail = [];
foreach ($dataMentah as $row) {
    $saldo_berjalan += $row['masuk'];
    $saldo_berjalan -= $row['keluar'];
    $row['saldo'] = $saldo_berjalan;
    $dataDetail[] = $row;
}
$dataDetail = array_reverse($dataDetail);
?>

<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Buku Kas Detail - Snappoint Traffa</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">

<?php include 'navbar.php'; ?>

<div class="container-fluid px-4">
    <h2 class="mb-4">Buku Kas Detail (Semua Record)</h2>
    <?= $pesan ?>
    
    <div class="card shadow-sm">
        <div class="card-body p-0">
            <div class="table-responsive">
                <table class="table table-hover table-bordered align-middle mb-0">
                    <thead class="table-dark text-center">
                        <tr>
                            <th>Tanggal & Waktu</th>
                            <th>Kategori</th>
                            <th>Keterangan</th>
                            <th>Masuk (Rp)</th>
                            <th>Keluar (Rp)</th>
                            <th>Saldo (Rp)</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if(count($dataDetail) > 0): ?>
                            <?php foreach($dataDetail as $row): 
                                $nominal_asli = ($row['masuk'] > 0) ? $row['masuk'] : $row['keluar'];
                            ?>
                            <tr>
                                <td class="text-center" style="white-space: nowrap;">
                                    <span class="fw-bold"><?= date('d/m/Y', strtotime($row['tanggal'])) ?></span><br>
                                    <small class="text-muted"><?= date('H:i', strtotime($row['waktu_input'])) ?></small>
                                </td>
                                <td class="text-center">
                                    <span class="badge <?= $row['jenis'] == 'PEMASUKAN' ? 'bg-success' : 'bg-danger' ?>">
                                        <?= htmlspecialchars($row['nama_kategori']) ?>
                                    </span>
                                </td>
                                <td>
                                    <?= htmlspecialchars($row['keterangan']) ?>
                                    
                                    <?php if($row['is_edited']): ?>
                                        <div class="text-danger small mt-1">
                                            ✏️ <strong>Diedit:</strong> <?= htmlspecialchars($row['alasan_edit']) ?> <br>
                                            <em style="font-size: 0.75rem;">(Pada: <?= date('d/m/Y H:i', strtotime($row['waktu_edit'])) ?>)</em>
                                        </div>
                                    <?php endif; ?>
                                    
                                    <?php if($row['is_backdated']): ?>
                                        <div class="text-info small mt-1">
                                            🕒 <strong>Data Susulan:</strong> <?= htmlspecialchars($row['alasan_backdate']) ?>
                                        </div>
                                    <?php endif; ?>
                                </td>
                                <td class="text-end text-success fw-bold"><?= $row['masuk'] > 0 ? number_format($row['masuk'], 0, ',', '.') : '-' ?></td>
                                <td class="text-end text-danger fw-bold"><?= $row['keluar'] > 0 ? number_format($row['keluar'], 0, ',', '.') : '-' ?></td>
                                <td class="text-end fw-bold text-primary"><?= number_format($row['saldo'], 0, ',', '.') ?></td>
                                <td class="text-center">
                                    <button class="btn btn-sm btn-outline-secondary" data-bs-toggle="modal" data-bs-target="#editModal<?= $row['id_transaksi'] ?>">Edit</button>
                                </td>
                            </tr>

                            <div class="modal fade" id="editModal<?= $row['id_transaksi'] ?>" tabindex="-1">
                              <div class="modal-dialog">
                                <div class="modal-content">
                                  <form method="POST">
                                      <div class="modal-header bg-warning">
                                        <h5 class="modal-title text-dark fw-bold">Edit Transaksi (Butuh Verifikasi)</h5>
                                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                                      </div>
                                      <div class="modal-body">
                                        <input type="hidden" name="aksi" value="edit">
                                        <input type="hidden" name="id_transaksi" value="<?= $row['id_transaksi'] ?>">
                                        
                                        <div class="mb-3">
                                            <label>Keterangan Transaksi</label>
                                            <input type="text" name="keterangan" class="form-control" value="<?= htmlspecialchars($row['keterangan']) ?>" required>
                                        </div>
                                        <div class="mb-3">
                                            <label>Nominal (Rp)</label>
                                            <input type="number" name="nominal" class="form-control" value="<?= $nominal_asli ?>" required>
                                        </div>
                                        <hr>
                                        <div class="mb-3">
                                            <label class="text-danger fw-bold">Alasan Perubahan Data (Wajib)</label>
                                            <textarea name="alasan_edit" class="form-control" placeholder="Contoh: Kasir salah ketik nominal, seharusnya 100.000" required></textarea>
                                        </div>
                                        <div class="mb-3">
                                            <label class="text-danger fw-bold">PIN Verifikasi Owner</label>
                                            <input type="password" name="pin_verifikasi" class="form-control text-center fs-4 letter-spacing-3" placeholder="* * * * * *" required>
                                        </div>
                                      </div>
                                      <div class="modal-footer border-0">
                                        <button type="submit" class="btn btn-warning w-100 fw-bold">Verifikasi & Simpan Perubahan</button>
                                      </div>
                                  </form>
                                </div>
                              </div>
                            </div>
                            <?php endforeach; ?>
                        <?php else: ?>
                            <tr><td colspan="7" class="text-center">Belum ada data transaksi.</td></tr>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>