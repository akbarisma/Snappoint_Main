<?php
session_start(); // Wajib di paling atas
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

// 1. PROSES FORM (SET PERSEN, TAMBAH, EDIT, HAPUS)
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    
    if (isset($_POST['aksi']) && $_POST['aksi'] == 'set_persen') {
        $periode = explode('-', $_POST['periode']);
        $tahun = (int)$periode[0];
        $bulan = (int)$periode[1];
        $persen = $_POST['persentase'];
        
        $stmt = $pdo->prepare("INSERT INTO setting_kas (tahun, bulan, persentase) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE persentase = ?");
        $stmt->execute([$tahun, $bulan, $persen, $persen]);
        $_SESSION['pesan'] = '<div class="alert alert-success alert-dismissible fade show">✅ Rencana persentase kas berhasil disimpan!<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>';
    } 
    
    elseif (isset($_POST['aksi']) && $_POST['aksi'] == 'tambah_pengeluaran') {
        $nominal = $_POST['nominal'];
        $is_backdated = 0;
        $alasan_backdate = null;
        $tanggal = date('Y-m-d');
        
        if (isset($_POST['mode']) && $_POST['mode'] == 'backdate') {
            if ($_POST['pin_verifikasi'] !== $PIN_OWNER) {
                $_SESSION['pesan'] = '<div class="alert alert-danger alert-dismissible fade show">❌ GAGAL: PIN Verifikasi Salah! Tidak berhak memasukkan data masa lalu.<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>';
                header("Location: kelola_kas.php"); exit();
            }
            $tanggal = $_POST['tanggal_backdate'];
            $keterangan = htmlspecialchars($_POST['keterangan_backdate']);
            $is_backdated = 1;
            $alasan_backdate = htmlspecialchars($_POST['alasan_backdate']);
        } else {
            $keterangan = htmlspecialchars($_POST['keterangan_normal']);
        }

        $stmt = $pdo->prepare("INSERT INTO buku_kas (tanggal, tipe, keterangan, nominal, is_backdated, alasan_backdate) VALUES (?, 'KELUAR', ?, ?, ?, ?)");
        $stmt->execute([$tanggal, $keterangan, $nominal, $is_backdated, $alasan_backdate]);
        $_SESSION['pesan'] = '<div class="alert alert-success alert-dismissible fade show">✅ Pengeluaran kas berhasil dicatat!<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>';
    }
    
    elseif (isset($_POST['aksi']) && $_POST['aksi'] == 'edit_kas') {
        if ($_POST['pin_verifikasi'] === $PIN_OWNER) {
            $id_kas = $_POST['id_kas'];
            $keterangan_baru = htmlspecialchars($_POST['keterangan']);
            $nominal_baru = $_POST['nominal'];
            $alasan = htmlspecialchars($_POST['alasan_edit']);
            $waktu_edit = date('Y-m-d H:i:s');
            
            $stmt = $pdo->prepare("UPDATE buku_kas SET keterangan = ?, nominal = ?, is_edited = 1, alasan_edit = ?, waktu_edit = ? WHERE id_kas = ?");
            $stmt->execute([$keterangan_baru, $nominal_baru, $alasan, $waktu_edit, $id_kas]);
            $_SESSION['pesan'] = '<div class="alert alert-success alert-dismissible fade show">✅ Data kas berhasil diubah!<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>';
        } else {
            $_SESSION['pesan'] = '<div class="alert alert-danger alert-dismissible fade show">❌ GAGAL: PIN Verifikasi Salah!<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>';
        }
    }
    
    elseif (isset($_POST['aksi']) && $_POST['aksi'] == 'hapus_kas') {
        if ($_POST['pin_verifikasi'] === $PIN_OWNER) {
            $id_kas = $_POST['id_kas'];
            $stmt = $pdo->prepare("DELETE FROM buku_kas WHERE id_kas = ?");
            $stmt->execute([$id_kas]);
            $_SESSION['pesan'] = '<div class="alert alert-success alert-dismissible fade show">🗑️ Transaksi Kas berhasil dihapus!<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>';
        } else {
            $_SESSION['pesan'] = '<div class="alert alert-danger alert-dismissible fade show">❌ GAGAL: PIN Verifikasi Salah untuk menghapus!<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>';
        }
    }
    
    // REDIRECT SETELAH PROSES SELESAI
    header("Location: kelola_kas.php");
    exit();
}

// 2. AMBIL DATA SETTING PERSENTASE
$stmtSetting = $pdo->query("SELECT * FROM setting_kas ORDER BY tahun ASC, bulan ASC");
$persen_map = [];
foreach($stmtSetting->fetchAll(PDO::FETCH_ASSOC) as $s) {
    $key = sprintf("%04d-%02d", $s['tahun'], $s['bulan']);
    $persen_map[$key] = $s['persentase'];
}

function getPersenKas($thn, $bln, $persen_map) {
    $target = sprintf("%04d-%02d", $thn, $bln);
    $last_val = 3; 
    ksort($persen_map);
    foreach($persen_map as $k => $v) {
        if ($k <= $target) { $last_val = $v; } else { break; }
    }
    return $last_val;
}

// 3. KALKULASI SALDO KAS
$histori_kas = [];

$stmtRekap = $pdo->query("SELECT tahun, bulan, laba_bersih FROM rekap_laba_bulanan ORDER BY tahun ASC, bulan ASC");
foreach ($stmtRekap->fetchAll(PDO::FETCH_ASSOC) as $row) {
    $thn = (int)$row['tahun'];
    $bln = (int)$row['bulan'];
    $laba = $row['laba_bersih'];
    $is_completed = ($thn < $current_year) || ($thn == $current_year && $bln < $current_month);
    
    if ($is_completed && $laba > 0) {
        $persen = getPersenKas($thn, $bln, $persen_map);
        $nominal = $laba * ($persen / 100);
        $tgl_virtual = date("Y-m-t", strtotime("$thn-$bln-01"));
        
        $histori_kas[] = [
            'tanggal' => $tgl_virtual,
            'waktu_input' => "$tgl_virtual 23:59:59",
            'tipe' => 'MASUK_OTOMATIS',
            'keterangan' => "Potongan Kas Otomatis ($persen%) - Laba $bln/$thn",
            'masuk' => $nominal, 'keluar' => 0, 'id_kas' => null,
            'is_edited' => 0, 'is_backdated' => 0,
            'alasan_edit' => null, 'alasan_backdate' => null
        ];
    }
}

$stmtBukuKas = $pdo->query("SELECT * FROM buku_kas ORDER BY tanggal ASC, waktu_input ASC");
foreach ($stmtBukuKas->fetchAll(PDO::FETCH_ASSOC) as $row) {
    $histori_kas[] = [
        'tanggal' => $row['tanggal'],
        'waktu_input' => $row['waktu_input'],
        'tipe' => $row['tipe'],
        'keterangan' => $row['keterangan'],
        'masuk' => ($row['tipe'] == 'MASUK') ? $row['nominal'] : 0,
        'keluar' => ($row['tipe'] == 'KELUAR') ? $row['nominal'] : 0,
        'id_kas' => isset($row['id_kas']) ? $row['id_kas'] : null,
        'is_edited' => isset($row['is_edited']) ? $row['is_edited'] : 0,
        'alasan_edit' => isset($row['alasan_edit']) ? $row['alasan_edit'] : null,
        'is_backdated' => isset($row['is_backdated']) ? $row['is_backdated'] : 0,
        'alasan_backdate' => isset($row['alasan_backdate']) ? $row['alasan_backdate'] : null
    ];
}

usort($histori_kas, function($a, $b) { return strtotime($a['waktu_input']) - strtotime($b['waktu_input']); });
$saldo_berjalan = 0;
foreach ($histori_kas as $key => $row) {
    $saldo_berjalan += $row['masuk'];
    $saldo_berjalan -= $row['keluar'];
    $histori_kas[$key]['saldo'] = $saldo_berjalan;
}
$histori_kas = array_reverse($histori_kas);
?>

<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Kelola Kas Bisnis - Snappoint Traffa</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">

<?php include 'navbar.php'; ?>

<div class="container-fluid px-4">
    <div class="d-flex justify-content-between align-items-center mb-4">
        <h2>Buku Kas Otomatis & Terencana</h2>
        <div class="card bg-success text-white shadow-sm">
            <div class="card-body p-2 px-4 text-center">
                <h6 class="mb-0 text-white-50">Total Saldo Kas Tersedia</h6>
                <h3 class="mb-0 fw-bold">Rp <?= number_format($saldo_berjalan, 0, ',', '.') ?></h3>
            </div>
        </div>
    </div>

    <?php
    if (isset($_SESSION['pesan'])) {
        echo $_SESSION['pesan'];
        unset($_SESSION['pesan']); 
    }
    ?>

    <div class="row">
        <div class="col-xl-4 mb-4">
            <div class="card shadow-sm border-primary mb-4">
                <div class="card-header bg-primary text-white fw-bold">1. Rencana Persentase Kas Bulanan</div>
                <div class="card-body">
                    <form method="POST">
                        <input type="hidden" name="aksi" value="set_persen">
                        <div class="mb-3">
                            <label>Pilih Bulan & Tahun</label>
                            <select name="periode" class="form-select" required>
                                <?php for($i = -2; $i <= 2; $i++): 
                                    $time = strtotime("$i months");
                                    $t = date('Y', $time); $b = date('n', $time);
                                    $persen_sekarang = getPersenKas($t, $b, $persen_map);
                                ?>
                                    <option value="<?= "$t-$b" ?>" <?= ($i == 0) ? 'selected' : '' ?>>
                                        Bulan <?= $b ?> Tahun <?= $t ?> (Saat ini: <?= $persen_sekarang ?>%)
                                    </option>
                                <?php endfor; ?>
                            </select>
                        </div>
                        <div class="mb-3">
                            <label>Persentase Kas (%)</label>
                            <div class="input-group">
                                <input type="number" step="0.1" name="persentase" class="form-control" required>
                                <span class="input-group-text">%</span>
                            </div>
                        </div>
                        <button type="submit" class="btn btn-primary w-100 fw-bold">Simpan Persentase</button>
                    </form>
                </div>
            </div>

            <div class="card shadow-sm border-danger">
                <div class="card-header bg-danger text-white fw-bold">2. Catat Penggunaan Kas</div>
                <div class="card-body p-0">
                    <ul class="nav nav-tabs bg-light pt-2 px-2" role="tablist">
                      <li class="nav-item"><button class="nav-link active text-dark fw-bold" data-bs-toggle="tab" data-bs-target="#kas_normal">Hari Ini</button></li>
                      <li class="nav-item"><button class="nav-link text-danger fw-bold" data-bs-toggle="tab" data-bs-target="#kas_susulan">Susulan 🕒</button></li>
                    </ul>
                    <div class="tab-content p-3">
                        <div class="tab-pane fade show active" id="kas_normal">
                            <form method="POST">
                                <input type="hidden" name="aksi" value="tambah_pengeluaran">
                                <input type="hidden" name="mode" value="normal">
                                <div class="mb-3"><label>Tanggal (Terkunci)</label><input type="text" class="form-control bg-light" value="<?= date('d M Y') ?>" readonly></div>
                                <div class="mb-3"><label>Keterangan Penggunaan Kas</label><input type="text" name="keterangan_normal" class="form-control" required></div>
                                <div class="mb-3"><label>Nominal Terpakai (Rp)</label><input type="number" name="nominal" class="form-control" required></div>
                                <button type="submit" class="btn btn-danger w-100 fw-bold">Tarik Saldo Kas</button>
                            </form>
                        </div>
                        <div class="tab-pane fade" id="kas_susulan">
                            <form method="POST">
                                <input type="hidden" name="aksi" value="tambah_pengeluaran">
                                <input type="hidden" name="mode" value="backdate">
                                <div class="mb-3"><label>Pilih Tanggal Masa Lalu</label><input type="date" name="tanggal_backdate" class="form-control" max="<?= date('Y-m-d', strtotime('-1 day')) ?>" required></div>
                                <div class="mb-3"><label>Keterangan Penggunaan Kas</label><input type="text" name="keterangan_backdate" class="form-control" required></div>
                                <div class="mb-3"><label>Nominal Terpakai (Rp)</label><input type="number" name="nominal" class="form-control" required></div>
                                <hr>
                                <div class="mb-3"><label class="text-danger fw-bold">Alasan Input Susulan</label><textarea name="alasan_backdate" class="form-control" required></textarea></div>
                                <div class="mb-3"><label class="text-danger fw-bold">PIN Owner</label><input type="password" name="pin_verifikasi" class="form-control text-center" required></div>
                                <button type="submit" class="btn btn-warning w-100 fw-bold">Verifikasi & Catat Susulan</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="col-xl-8">
            <div class="card shadow-sm">
                <div class="card-header bg-dark text-white fw-bold">Riwayat Saldo Kas</div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover table-bordered align-middle mb-0">
                            <thead class="text-center table-dark">
                                <tr>
                                    <th>Tanggal</th>
                                    <th>Keterangan</th>
                                    <th>Masuk (Rp)</th>
                                    <th>Keluar (Rp)</th>
                                    <th>Saldo (Rp)</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php if(count($histori_kas) > 0): ?>
                                    <?php foreach($histori_kas as $kas): ?>
                                    <tr>
                                        <td class="text-center" style="white-space: nowrap;"><span class="fw-bold"><?= date('d/m/Y', strtotime($kas['tanggal'])) ?></span></td>
                                        <td>
                                            <?php if($kas['tipe'] == 'MASUK_OTOMATIS'): ?><span class="badge bg-success me-1">AUTO</span>
                                            <?php else: ?><span class="badge bg-danger me-1">KELUAR</span><?php endif; ?>
                                            <?= htmlspecialchars($kas['keterangan']) ?>
                                            
                                            <?php if($kas['is_edited']): ?><div class="text-warning small mt-1">✏️ <strong>Diedit:</strong> <?= htmlspecialchars($kas['alasan_edit']) ?></div><?php endif; ?>
                                            <?php if($kas['is_backdated']): ?><div class="text-info small mt-1">🕒 <strong>Susulan:</strong> <?= htmlspecialchars($kas['alasan_backdate']) ?></div><?php endif; ?>
                                        </td>
                                        <td class="text-end text-success fw-bold"><?= $kas['masuk'] > 0 ? number_format($kas['masuk'], 0, ',', '.') : '-' ?></td>
                                        <td class="text-end text-danger fw-bold"><?= $kas['keluar'] > 0 ? number_format($kas['keluar'], 0, ',', '.') : '-' ?></td>
                                        <td class="text-end fw-bold text-primary"><?= number_format($kas['saldo'], 0, ',', '.') ?></td>
                                        <td class="text-center">
                                            <?php if($kas['id_kas'] !== null): ?>
                                                <button class="btn btn-sm btn-outline-secondary mb-1" data-bs-toggle="modal" data-bs-target="#editKasModal<?= $kas['id_kas'] ?>">Edit</button>
                                                <button class="btn btn-sm btn-outline-danger mb-1" data-bs-toggle="modal" data-bs-target="#hapusKasModal<?= $kas['id_kas'] ?>">X</button>
                                            <?php endif; ?>
                                        </td>
                                    </tr>
                                    <?php endforeach; ?>
                                <?php else: ?>
                                    <tr><td colspan="6" class="text-center py-4">Belum ada riwayat perputaran uang kas.</td></tr>
                                <?php endif; ?>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<?php foreach($histori_kas as $kas): ?>
    <?php if($kas['id_kas'] !== null): ?>
    <div class="modal fade" id="editKasModal<?= $kas['id_kas'] ?>" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <form method="POST">
              <div class="modal-header bg-warning">
                <h5 class="modal-title text-dark fw-bold">Edit Penggunaan Kas</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body">
                <input type="hidden" name="aksi" value="edit_kas"><input type="hidden" name="id_kas" value="<?= $kas['id_kas'] ?>">
                <div class="mb-3"><label>Keterangan</label><input type="text" name="keterangan" class="form-control" value="<?= htmlspecialchars($kas['keterangan']) ?>" required></div>
                <div class="mb-3"><label>Nominal (Rp)</label><input type="number" name="nominal" class="form-control" value="<?= $kas['keluar'] > 0 ? $kas['keluar'] : $kas['masuk'] ?>" required></div>
                <hr>
                <div class="mb-3"><label class="text-danger fw-bold">Alasan Edit (Wajib)</label><textarea name="alasan_edit" class="form-control" required></textarea></div>
                <div class="mb-3"><label class="text-danger fw-bold">PIN Owner</label><input type="password" name="pin_verifikasi" class="form-control text-center fs-4" required></div>
              </div>
              <div class="modal-footer border-0"><button type="submit" class="btn btn-warning w-100 fw-bold">Verifikasi & Simpan</button></div>
          </form>
        </div>
      </div>
    </div>

    <div class="modal fade" id="hapusKasModal<?= $kas['id_kas'] ?>" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <form method="POST">
              <div class="modal-header bg-danger text-white">
                <h5 class="modal-title fw-bold">Hapus Riwayat Kas?</h5><button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body">
                <p>Hapus data: <strong><?= htmlspecialchars($kas['keterangan']) ?></strong>.</p>
                <input type="hidden" name="aksi" value="hapus_kas"><input type="hidden" name="id_kas" value="<?= $kas['id_kas'] ?>">
                <div class="mb-3"><label class="text-danger fw-bold">Masukkan PIN Owner</label><input type="password" name="pin_verifikasi" class="form-control text-center fs-4" required></div>
              </div>
              <div class="modal-footer border-0"><button type="submit" class="btn btn-danger w-100 fw-bold">Verifikasi & Hapus</button></div>
          </form>
        </div>
      </div>
    </div>
    <?php endif; ?>
<?php endforeach; ?>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>