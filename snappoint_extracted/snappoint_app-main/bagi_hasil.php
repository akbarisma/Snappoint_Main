  <?php
require_once 'config.php';

// Ambil daftar bulan/tahun yang ada datanya dari View Laba Bulanan
$stmtBulan = $pdo->query("SELECT tahun, bulan, laba_bersih FROM rekap_laba_bulanan ORDER BY tahun DESC, bulan DESC");
$dataBulan = $stmtBulan->fetchAll(PDO::FETCH_ASSOC);

// Ambil data persentase pemegang saham dari database
$stmtSaham = $pdo->query("SELECT nama_investor, persentase FROM pemegang_saham ORDER BY persentase DESC");
$pemegangSaham = $stmtSaham->fetchAll(PDO::FETCH_ASSOC);

// Variabel default untuk hasil perhitungan
$laba_terpilih = 0;
$persen_kas = 3; // Default Kas 3%
$nominal_kas = 0;
$laba_dibagikan = 0;
$hasil_bagi = [];
$bulan_pilih = '';

// Jika tombol "Hitung Bagi Hasil" ditekan
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $periode = explode('-', $_POST['periode']); // format: tahun-bulan
    $tahun_pilih = $periode[0];
    $bulan_pilih = $periode[1];
    $persen_kas = $_POST['persen_kas'];

    // Cari laba bersih di bulan yang dipilih
    foreach ($dataBulan as $b) {
        if ($b['tahun'] == $tahun_pilih && $b['bulan'] == $bulan_pilih) {
            $laba_terpilih = $b['laba_bersih'];
            break;
        }
    }

    // Hitung nominal Kas dan sisa Laba yang siap dibagikan (Payout Ratio)
    $nominal_kas = $laba_terpilih * ($persen_kas / 100);
    $laba_dibagikan = $laba_terpilih - $nominal_kas;

    // Hitung jatah masing-masing pemegang saham
    foreach ($pemegangSaham as $saham) {
        $nominal_investor = $laba_dibagikan * ($saham['persentase'] / 100);
        $hasil_bagi[] = [
            'nama' => $saham['nama_investor'],
            'persen' => $saham['persentase'],
            'nominal' => $nominal_investor
        ];
    }
}
?>

<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Kalkulator Bagi Hasil - Snappoint Traffa</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">

<nav class="navbar navbar-expand-lg navbar-dark bg-dark mb-4">
  <div class="container">
    <a class="navbar-brand" href="index.php">📸 Snappoint Traffa</a>
    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
      <span class="navbar-toggler-icon"></span>
    </button>
    <div class="collapse navbar-collapse" id="navbarNav">
        <div class="navbar-nav">
          <a class="nav-link" href="index.php">Dashboard</a>
          <a class="nav-link" href="input_transaksi.php">Input Transaksi</a>
          <a class="nav-link" href="laporan_harian.php">Detail Transaksi</a>
          <a class="nav-link active" href="bagi_hasil.php">Bagi Hasil</a>
        </div>
    </div>
  </div>
</nav>

<div class="container">
    <h2 class="mb-4">Kalkulator Sharing Profit (Dividen)</h2>
    
    <div class="row">
        <div class="col-md-4 mb-4">
            <div class="card shadow-sm border-primary">
                <div class="card-header bg-primary text-white fw-bold">Pengaturan Bulan Ini</div>
                <div class="card-body">
                    <form method="POST">
                        <div class="mb-3">
                            <label>Pilih Bulan & Tahun</label>
                            <select name="periode" class="form-select" required>
                                <option value="">-- Pilih Periode --</option>
                                <?php foreach($dataBulan as $b): ?>
                                    <option value="<?= $b['tahun'].'-'.$b['bulan'] ?>" <?= ($bulan_pilih == $b['bulan']) ? 'selected' : '' ?>>
                                        Bulan <?= $b['bulan'] ?> Tahun <?= $b['tahun'] ?> (Laba: Rp <?= number_format($b['laba_bersih'],0,',','.') ?>)
                                    </option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div class="mb-3">
                            <label>Potongan KAS (%)</label>
                            <div class="input-group">
                                <input type="number" step="0.1" name="persen_kas" class="form-control" value="<?= $persen_kas ?>" required>
                                <span class="input-group-text">%</span>
                            </div>
                            <small class="text-muted">Bisa diubah sesuai kesepakatan bulan ini.</small>
                        </div>
                        <button type="submit" class="btn btn-primary w-100">Hitung Pembagian</button>
                    </form>
                </div>
            </div>
        </div>

        <div class="col-md-8">
            <?php if ($_SERVER['REQUEST_METHOD'] == 'POST'): ?>
                <div class="card shadow-sm border-success mb-4">
                    <div class="card-body bg-success bg-opacity-10">
                        <h5 class="card-title text-success fw-bold">Rincian Laba Bersih Bulan <?= $bulan_pilih ?>-<?= $tahun_pilih ?></h5>
                        <hr>
                        <div class="d-flex justify-content-between mb-2">
                            <span>Laba Bersih Keseluruhan:</span>
                            <span class="fw-bold">Rp <?= number_format($laba_terpilih, 0, ',', '.') ?></span>
                        </div>
                        <div class="d-flex justify-content-between mb-2 text-danger">
                            <span>Potongan Kas (<?= $persen_kas ?>%):</span>
                            <span class="fw-bold">- Rp <?= number_format($nominal_kas, 0, ',', '.') ?></span>
                        </div>
                        <hr>
                        <div class="d-flex justify-content-between mb-2 text-primary fs-5">
                            <span class="fw-bold">Total Payout Ratio (Siap Dibagi):</span>
                            <span class="fw-bold">Rp <?= number_format($laba_dibagikan, 0, ',', '.') ?></span>
                        </div>
                    </div>
                </div>

                <div class="card shadow-sm">
                    <div class="card-header bg-dark text-white fw-bold">Distribusi ke Investor</div>
                    <div class="card-body p-0">
                        <table class="table table-striped mb-0">
                            <thead>
                                <tr>
                                    <th>Nama Pemegang Saham</th>
                                    <th class="text-center">Persentase</th>
                                    <th class="text-end">Nominal Diterima</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach($hasil_bagi as $bagi): ?>
                                <tr>
                                    <td class="fw-bold"><?= htmlspecialchars($bagi['nama']) ?></td>
                                    <td class="text-center"><?= $bagi['persen'] ?>%</td>
                                    <td class="text-end text-success fw-bold">Rp <?= number_format($bagi['nominal'], 0, ',', '.') ?></td>
                                </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                </div>
            <?php else: ?>
                <div class="alert alert-info">Silakan pilih bulan dan tekan tombol <strong>Hitung Pembagian</strong> untuk melihat detail pembagian dividen.</div>
            <?php endif; ?>
        </div>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>