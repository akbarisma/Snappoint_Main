<?php
session_start();
if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit();
}
require_once 'config.php';

$stmtStok = $pdo->query("SELECT 
    SUM(CASE WHEN jenis_pergerakan = 'MASUK' THEN jumlah_lembar ELSE 0 END) - 
    SUM(CASE WHEN jenis_pergerakan IN ('TERPAKAI', 'RUSAK', 'PENYESUAIAN') THEN jumlah_lembar ELSE 0 END) AS sisa 
    FROM log_kertas");
$sisa_stok_kertas = $stmtStok->fetchColumn() ?: 0;

$PIN_OWNER = '123456'; 

$stmtKategori = $pdo->query("SELECT * FROM kategori_transaksi WHERE jenis = 'PENGELUARAN'");
$kategoriPengeluaran = $stmtKategori->fetchAll(PDO::FETCH_ASSOC);

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    
    $jenis_transaksi = $_POST['jenis_transaksi'];
    $nominal = $_POST['nominal'];
    $is_backdated = 0;
    $alasan_backdate = null;
    $tanggal = date('Y-m-d'); 

    if (isset($_POST['mode']) && $_POST['mode'] == 'backdate') {
        if ($_POST['pin_verifikasi'] !== $PIN_OWNER) {
            $_SESSION['pesan'] = '<div class="alert alert-danger alert-dismissible fade show">❌ GAGAL: PIN Verifikasi Salah! Tidak berhak memasukkan data masa lalu.<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>';
            header("Location: input_transaksi.php");
            exit();
        }
        $tanggal = $_POST['tanggal_backdate'];
        $is_backdated = 1;
        $alasan_backdate = htmlspecialchars($_POST['alasan_backdate']);
    }

    if ($jenis_transaksi == 'PEMASUKAN') {
        $id_kategori = 1; 
        if (isset($_POST['opsi_pemasukan']) && $_POST['opsi_pemasukan'] == 'gross_income') {
            $keterangan = 'Gross Income';
        } else {
            $keterangan = htmlspecialchars($_POST['keterangan_pemasukan_manual'] ?? $_POST['keterangan_backdate']);
        }
    } else {
        $id_kategori = $_POST['id_kategori_pengeluaran'];
        $keterangan = htmlspecialchars($_POST['keterangan_pengeluaran']);
    }

    try {
        $sql = "INSERT INTO transaksi_keuangan (tanggal, id_kategori, keterangan, nominal, is_backdated, alasan_backdate) VALUES (?, ?, ?, ?, ?, ?)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$tanggal, $id_kategori, $keterangan, $nominal, $is_backdated, $alasan_backdate]);
        
        $_SESSION['pesan'] = '<div class="alert alert-success alert-dismissible fade show">✅ Transaksi berhasil disimpan ke sistem!<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>';
    } catch(PDOException $e) {
        $_SESSION['pesan'] = '<div class="alert alert-danger alert-dismissible fade show">❌ Gagal menyimpan: ' . $e->getMessage() . '<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>';
    }
    
    header("Location: input_transaksi.php");
    exit(); 
}
?>

<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Input Transaksi - Snappoint Traffa</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">

<?php include 'navbar.php'; ?>

<div class="container px-4">
    <?php if($sisa_stok_kertas <= 100): ?>
        <div class="alert alert-danger shadow-sm border-danger border-2 d-flex align-items-center justify-content-between">
            <div>
                <strong>⚠️ Peringatan Stok Kritis!</strong> Sisa kertas di sistem hanya <strong><?= number_format($sisa_stok_kertas, 0, ',', '.') ?> lembar</strong>.
            </div>
            <a href="kelola_stok.php" class="btn btn-sm btn-danger fw-bold">Cek Stok</a>
        </div>
    <?php else: ?>
        <div class="alert alert-success shadow-sm d-flex align-items-center justify-content-between py-2">
            <div>✅ <strong>Sisa Stok Kertas:</strong> <?= number_format($sisa_stok_kertas, 0, ',', '.') ?> lembar.</div>
            <a href="kelola_stok.php" class="btn btn-sm btn-outline-success fw-bold">Lapor Pemakaian</a>
        </div>
    <?php endif; ?>

    <h2 class="mb-4">Input Transaksi Kasir</h2>
    
    <?php
    if (isset($_SESSION['pesan'])) {
        echo $_SESSION['pesan'];
        unset($_SESSION['pesan']); 
    }
    ?>

    <ul class="nav nav-tabs mb-4" id="myTab" role="tablist">
      <li class="nav-item" role="presentation">
        <button class="nav-link active fw-bold" data-bs-toggle="tab" data-bs-target="#harian" type="button">Input Hari Ini (Otomatis)</button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link fw-bold text-danger" data-bs-toggle="tab" data-bs-target="#susulan" type="button">Input Susulan (Backdate)</button>
      </li>
    </ul>

    <div class="tab-content">
      
      <div class="tab-pane fade show active" id="harian" role="tabpanel">
          <div class="row">
              <div class="col-md-6 mb-4">
                  <div class="card shadow-sm border-success">
                      <div class="card-header bg-success text-white fw-bold">Catat Pemasukan Hari Ini</div>
                      <div class="card-body">
                          <form method="POST">
                              <input type="hidden" name="jenis_transaksi" value="PEMASUKAN">
                              <input type="hidden" name="mode" value="normal">
                              <div class="mb-3">
                                  <label>Tanggal</label>
                                  <input type="text" class="form-control bg-light" value="<?= date('d M Y') ?>" readonly>
                              </div>
                              <div class="mb-3">
                                  <label>Keterangan Pemasukan</label>
                                  <div class="form-check">
                                      <input class="form-check-input" type="radio" name="opsi_pemasukan" value="gross_income" id="grossIncome" checked onclick="document.getElementById('manualIncomeText').style.display='none'; document.getElementById('manualIncomeText').required=false;">
                                      <label class="form-check-label" for="grossIncome">Gross Income</label>
                                  </div>
                                  <div class="form-check">
                                      <input class="form-check-input" type="radio" name="opsi_pemasukan" value="manual" id="manualIncome" onclick="document.getElementById('manualIncomeText').style.display='block'; document.getElementById('manualIncomeText').required=true;">
                                      <label class="form-check-label" for="manualIncome">Input Manual</label>
                                  </div>
                                  <input type="text" name="keterangan_pemasukan_manual" id="manualIncomeText" class="form-control mt-2" placeholder="Tulis keterangan..." style="display:none;">
                              </div>
                              <div class="mb-3">
                                  <label>Nominal (Rp)</label>
                                  <input type="number" name="nominal" class="form-control" required>
                              </div>
                              <button type="submit" class="btn btn-success w-100">Simpan Pemasukan</button>
                          </form>
                      </div>
                  </div>
              </div>
              
              <div class="col-md-6 mb-4">
                  <div class="card shadow-sm border-danger">
                      <div class="card-header bg-danger text-white fw-bold">Catat Pengeluaran Hari Ini</div>
                      <div class="card-body">
                          <form method="POST">
                              <input type="hidden" name="jenis_transaksi" value="PENGELUARAN">
                              <input type="hidden" name="mode" value="normal">
                              <div class="mb-3">
                                  <label>Tanggal</label>
                                  <input type="text" class="form-control bg-light" value="<?= date('d M Y') ?>" readonly>
                              </div>
                              <div class="mb-3">
                                  <label>Kategori</label>
                                  <select name="id_kategori_pengeluaran" class="form-select" required>
                                      <option value="">-- Pilih --</option>
                                      <?php foreach($kategoriPengeluaran as $kat): ?>
                                          <option value="<?= $kat['id_kategori'] ?>"><?= $kat['nama_kategori'] ?></option>
                                      <?php endforeach; ?>
                                  </select>
                              </div>
                              <div class="mb-3">
                                  <label>Keterangan Detail</label>
                                  <input type="text" name="keterangan_pengeluaran" class="form-control" required>
                              </div>
                              <div class="mb-3">
                                  <label>Nominal (Rp)</label>
                                  <input type="number" name="nominal" class="form-control" required>
                              </div>
                              <button type="submit" class="btn btn-danger w-100">Simpan Pengeluaran</button>
                          </form>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      <div class="tab-pane fade" id="susulan" role="tabpanel">
          <div class="card shadow-sm border-warning mb-4">
              <div class="card-header bg-warning text-dark fw-bold">
                  ⚠️ Tambah Transaksi di Masa Lalu (Butuh Verifikasi PIN)
              </div>
              <div class="card-body">
                  <form method="POST" class="row">
                      <input type="hidden" name="mode" value="backdate">
                      <div class="col-md-6 border-end">
                          <h6 class="fw-bold">1. Detail Transaksi</h6>
                          <div class="mb-3">
                              <label>Jenis</label>
                              <select name="jenis_transaksi" class="form-select" required>
                                  <option value="PEMASUKAN">PEMASUKAN</option>
                                  <option value="PENGELUARAN">PENGELUARAN</option>
                              </select>
                          </div>
                          <div class="mb-3">
                              <label>Pilih Tanggal Masa Lalu</label>
                              <input type="date" name="tanggal_backdate" class="form-control" max="<?= date('Y-m-d', strtotime('-1 day')) ?>" required>
                          </div>
                          <div class="mb-3">
                              <label>Kategori Keterangan (Pilih Kategori jika Pengeluaran)</label>
                              <select name="id_kategori_pengeluaran" class="form-select mb-2">
                                  <option value="1">Pendapatan / Gross Income</option>
                                  <?php foreach($kategoriPengeluaran as $kat): ?>
                                      <option value="<?= $kat['id_kategori'] ?>"><?= $kat['nama_kategori'] ?></option>
                                  <?php endforeach; ?>
                              </select>
                              <input type="text" name="keterangan_backdate" class="form-control" placeholder="Tuliskan keterangan detailnya..." required>
                          </div>
                          <div class="mb-3">
                              <label>Nominal (Rp)</label>
                              <input type="number" name="nominal" class="form-control" required>
                          </div>
                      </div>
                      <div class="col-md-6">
                          <h6 class="fw-bold text-danger">2. Otorisasi Owner</h6>
                          <div class="mb-3">
                              <label class="text-danger fw-bold">Alasan Input Data Susulan (Wajib)</label>
                              <textarea name="alasan_backdate" class="form-control" rows="3" placeholder="Contoh: Kasir lupa menginput pemasukan tambahan di tanggal 15 kemarin." required></textarea>
                          </div>
                          <div class="mb-3">
                              <label class="text-danger fw-bold">PIN Verifikasi Owner</label>
                              <input type="password" name="pin_verifikasi" class="form-control text-center fs-3" placeholder="* * * * * *" required>
                          </div>
                          <button type="submit" class="btn btn-warning w-100 fw-bold mt-3 py-3">Verifikasi & Masukkan Data Masa Lalu</button>
                      </div>
                  </form>
              </div>
          </div>
      </div>

    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>