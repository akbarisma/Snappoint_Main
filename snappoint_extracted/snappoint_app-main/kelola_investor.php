<?php
session_start();
if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit();
}
// PROTEKSI: Tendang Investor DAN Kasir jika memaksa masuk ke Kelola Kas
if ($_SESSION['role'] == 'investor' || $_SESSION['role'] == 'kasir') {
    header("Location: index.php");
    exit();
}
require_once 'config.php';
$PIN_OWNER = '123456'; 

$current_year = (int)date('Y');
$current_month = (int)date('n');

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    try {
        if ($_POST['aksi'] == 'tambah') {
            $nama = htmlspecialchars($_POST['nama_investor']);
            $persen = $_POST['persentase'];
            $m_tahun = $_POST['mulai_tahun'];
            $m_bulan = $_POST['mulai_bulan'];
            
            $stmt = $pdo->prepare("INSERT INTO pemegang_saham (nama_investor, persentase, mulai_tahun, mulai_bulan) VALUES (?, ?, ?, ?)");
            $stmt->execute([$nama, $persen, $m_tahun, $m_bulan]);
            $_SESSION['pesan'] = '<div class="alert alert-success alert-dismissible fade show">✅ Investor baru berhasil ditambahkan!<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>';
        } 
        elseif ($_POST['aksi'] == 'edit') {
            $id = $_POST['id_saham'];
            $nama = htmlspecialchars($_POST['nama_investor']);
            $persen = $_POST['persentase'];
            $m_tahun = $_POST['mulai_tahun'];
            $m_bulan = $_POST['mulai_bulan'];
            
            $stmt = $pdo->prepare("UPDATE pemegang_saham SET nama_investor = ?, persentase = ?, mulai_tahun = ?, mulai_bulan = ? WHERE id_saham = ?");
            $stmt->execute([$nama, $persen, $m_tahun, $m_bulan, $id]);
            $_SESSION['pesan'] = '<div class="alert alert-success alert-dismissible fade show">✅ Data investor berhasil diperbarui!<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>';
        } 
        elseif ($_POST['aksi'] == 'tutup_buku') {
            // Menonaktifkan investor tanpa menghapus histori masa lalunya
            $id = $_POST['id_saham'];
            $a_tahun = $_POST['akhir_tahun'];
            $a_bulan = $_POST['akhir_bulan'];
            
            $stmt = $pdo->prepare("UPDATE pemegang_saham SET akhir_tahun = ?, akhir_bulan = ? WHERE id_saham = ?");
            $stmt->execute([$a_tahun, $a_bulan, $id]);
            $_SESSION['pesan'] = '<div class="alert alert-success alert-dismissible fade show">🔒 Investor berhasil dinonaktifkan! Histori masa lalunya tetap aman.<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>';
        }
        elseif ($_POST['aksi'] == 'hapus_permanen') {
            if ($_POST['pin_verifikasi'] === $PIN_OWNER) {
                $id = $_POST['id_saham'];
                $stmt = $pdo->prepare("DELETE FROM pemegang_saham WHERE id_saham = ?");
                $stmt->execute([$id]);
                $_SESSION['pesan'] = '<div class="alert alert-success alert-dismissible fade show">🗑️ Investor dihapus permanen!<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>';
            } else {
                $_SESSION['pesan'] = '<div class="alert alert-danger alert-dismissible fade show">❌ PIN Salah! Gagal menghapus.<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>';
            }
        }
    } catch(PDOException $e) {
        $_SESSION['pesan'] = '<div class="alert alert-danger">❌ Gagal memproses: ' . $e->getMessage() . '</div>';
    }
    
    header("Location: kelola_investor.php");
    exit();
}

$stmtSaham = $pdo->query("SELECT * FROM pemegang_saham ORDER BY akhir_tahun IS NOT NULL, persentase DESC");
$investors = $stmtSaham->fetchAll(PDO::FETCH_ASSOC);

$total_persentase_aktif = 0;
foreach ($investors as $inv) {
    if ($inv['akhir_tahun'] == null) {
        $total_persentase_aktif += $inv['persentase'];
    }
}

$badge_color = 'bg-success';
if ($total_persentase_aktif < 100) $badge_color = 'bg-warning text-dark';
if ($total_persentase_aktif > 100) $badge_color = 'bg-danger';

$nama_bulan = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
?>

<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Kelola Investor - Snappoint Traffa</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">

<?php include 'navbar.php'; ?>

<div class="container px-4">
    <div class="d-flex justify-content-between align-items-center mb-4">
        <h2>Kelola Data Investor & Saham</h2>
        <span class="badge <?= $badge_color ?> fs-5 p-2 shadow-sm">
            Total Saham Aktif: <?= floatval($total_persentase_aktif) ?>%
        </span>
    </div>
    
    <?php
    if (isset($_SESSION['pesan'])) {
        echo $_SESSION['pesan']; unset($_SESSION['pesan']); 
    }
    if($total_persentase_aktif != 100): ?>
        <div class="alert alert-warning shadow-sm">⚠️ <strong>Perhatian:</strong> Total saham aktif saat ini <strong><?= floatval($total_persentase_aktif) ?>%</strong>. Pastikan pas 100% agar pembagian adil.</div>
    <?php endif; ?>

    <div class="row">
        <div class="col-md-4 mb-4">
            <div class="card shadow-sm border-primary mb-3">
                <div class="card-header bg-primary text-white fw-bold">Tambah Investor Baru</div>
                <div class="card-body">
                    <form method="POST">
                        <input type="hidden" name="aksi" value="tambah">
                        <div class="mb-3"><label>Nama Investor</label><input type="text" name="nama_investor" class="form-control" required></div>
                        <div class="mb-3">
                            <label>Persentase Saham (%)</label>
                            <div class="input-group">
                                <input type="number" step="0.01" name="persentase" class="form-control" required>
                                <span class="input-group-text">%</span>
                            </div>
                        </div>
                        <div class="row mb-3">
                            <div class="col-6">
                                <label>Mulai Bulan</label>
                                <select name="mulai_bulan" class="form-select" required>
                                    <?php for($i=1; $i<=12; $i++) echo "<option value='$i'".($i==$current_month?' selected':'').">{$nama_bulan[$i]}</option>"; ?>
                                </select>
                            </div>
                            <div class="col-6">
                                <label>Mulai Tahun</label>
                                <input type="number" name="mulai_tahun" class="form-control" value="<?= $current_year ?>" required>
                            </div>
                        </div>
                        <button type="submit" class="btn btn-primary w-100 fw-bold">Simpan Investor</button>
                    </form>
                </div>
            </div>
            
            <div class="alert alert-secondary">💡 <strong>Tips Perubahan Persentase:</strong> Jika ada investor yang persentasenya berubah (misal dari 10% jadi 15%), jangan gunakan tombol Edit. <strong>Tutup Buku</strong> dulu data yang 10%, lalu <strong>Tambah Investor Baru</strong> dengan nama yang sama untuk persentase 15% mulai bulan ini.</div>
        </div>

        <div class="col-md-8">
            <div class="card shadow-sm">
                <div class="card-header bg-dark text-white fw-bold">Daftar Riwayat Kepemilikan Saham</div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="text-center table-secondary">
                                <tr>
                                    <th>Nama</th>
                                    <th>Porsi</th>
                                    <th>Masa Aktif</th>
                                    <th>Status</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach($investors as $inv): 
                                    $is_active = ($inv['akhir_tahun'] == null);
                                ?>
                                <tr>
                                    <td class="fw-bold ps-3 <?= !$is_active ? 'text-muted text-decoration-line-through' : '' ?>"><?= htmlspecialchars($inv['nama_investor']) ?></td>
                                    <td class="text-center"><span class="badge bg-<?= $is_active ? 'success' : 'secondary' ?> fs-6"><?= floatval($inv['persentase']) ?>%</span></td>
                                    <td class="text-center small">
                                        <?= $nama_bulan[$inv['mulai_bulan']].' '.$inv['mulai_tahun'] ?> <br> s/d <br>
                                        <?= $is_active ? '<strong>Sekarang</strong>' : $nama_bulan[$inv['akhir_bulan']].' '.$inv['akhir_tahun'] ?>
                                    </td>
                                    <td class="text-center">
                                        <?php if($is_active): ?> <span class="badge bg-primary">Aktif</span>
                                        <?php else: ?> <span class="badge bg-danger">Nonaktif</span> <?php endif; ?>
                                    </td>
                                    <td class="text-center">
                                        <button class="btn btn-sm btn-outline-primary mb-1" data-bs-toggle="modal" data-bs-target="#editModal<?= $inv['id_saham'] ?>">Edit</button>
                                        <?php if($is_active): ?>
                                            <button class="btn btn-sm btn-outline-warning mb-1" data-bs-toggle="modal" data-bs-target="#tutupModal<?= $inv['id_saham'] ?>">Tutup</button>
                                        <?php endif; ?>
                                        <button class="btn btn-sm btn-danger mb-1" data-bs-toggle="modal" data-bs-target="#hapusModal<?= $inv['id_saham'] ?>">X</button>
                                    </td>
                                </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<?php foreach($investors as $inv): ?>
    <div class="modal fade" id="editModal<?= $inv['id_saham'] ?>"><div class="modal-dialog"><div class="modal-content"><form method="POST"><div class="modal-header bg-primary text-white"><h5 class="modal-title">Edit Data Investor</h5><button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button></div><div class="modal-body"><input type="hidden" name="aksi" value="edit"><input type="hidden" name="id_saham" value="<?= $inv['id_saham'] ?>"><div class="mb-3"><label>Nama</label><input type="text" name="nama_investor" class="form-control" value="<?= htmlspecialchars($inv['nama_investor']) ?>" required></div><div class="mb-3"><label>Persentase (%)</label><input type="number" step="0.01" name="persentase" class="form-control" value="<?= floatval($inv['persentase']) ?>" required></div><div class="row mb-3"><div class="col-6"><label>Mulai Bulan</label><select name="mulai_bulan" class="form-select"><?php for($i=1; $i<=12; $i++) echo "<option value='$i'".($i==$inv['mulai_bulan']?' selected':'').">{$nama_bulan[$i]}</option>"; ?></select></div><div class="col-6"><label>Mulai Tahun</label><input type="number" name="mulai_tahun" class="form-control" value="<?= $inv['mulai_tahun'] ?>" required></div></div></div><div class="modal-footer border-0"><button type="submit" class="btn btn-primary w-100">Simpan Perubahan</button></div></form></div></div></div>

    <div class="modal fade" id="tutupModal<?= $inv['id_saham'] ?>"><div class="modal-dialog"><div class="modal-content"><form method="POST"><div class="modal-header bg-warning"><h5 class="modal-title">Tutup Buku Investor</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div><div class="modal-body"><p>Investor <strong><?= htmlspecialchars($inv['nama_investor']) ?></strong> akan dinonaktifkan. Ia tidak akan mendapat bagi hasil lagi, tapi histori di bulan lalu tetap aman.</p><input type="hidden" name="aksi" value="tutup_buku"><input type="hidden" name="id_saham" value="<?= $inv['id_saham'] ?>"><div class="row mb-3"><div class="col-6"><label>Berhenti Mulai Bulan</label><select name="akhir_bulan" class="form-select"><?php for($i=1; $i<=12; $i++) echo "<option value='$i'".($i==$current_month?' selected':'').">{$nama_bulan[$i]}</option>"; ?></select></div><div class="col-6"><label>Tahun</label><input type="number" name="akhir_tahun" class="form-control" value="<?= $current_year ?>" required></div></div></div><div class="modal-footer border-0"><button type="submit" class="btn btn-warning w-100 fw-bold">Tutup Buku</button></div></form></div></div></div>

    <div class="modal fade" id="hapusModal<?= $inv['id_saham'] ?>"><div class="modal-dialog"><div class="modal-content"><form method="POST"><div class="modal-header bg-danger text-white"><h5 class="modal-title">Hapus Permanen?</h5><button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button></div><div class="modal-body"><p class="text-danger"><strong>AWAS!</strong> Menghapus permanen akan merusak laporan di bulan-bulan sebelumnya. Gunakan fitur "Tutup Buku" jika hanya ingin menonaktifkan.</p><input type="hidden" name="aksi" value="hapus_permanen"><input type="hidden" name="id_saham" value="<?= $inv['id_saham'] ?>"><div class="mb-3"><label>PIN Owner</label><input type="password" name="pin_verifikasi" class="form-control text-center" required></div></div><div class="modal-footer border-0"><button type="submit" class="btn btn-danger w-100 fw-bold">Tetap Hapus Permanen</button></div></form></div></div></div>
<?php endforeach; ?>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>