<?php
session_start();
if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit();
}
// PROTEKSI: Tendang Kasir jika memaksa masuk lewat URL
if ($_SESSION['role'] == 'kasir') {
    header("Location: input_transaksi.php");
    exit();
}

require_once 'config.php';

$current_year = (int)date('Y');
$current_month = (int)date('n');

// 1. Ambil Data Rekap Keuangan
$stmtRekap = $pdo->query("SELECT * FROM rekap_laba_bulanan ORDER BY tahun DESC, bulan DESC");
$dataRekap = $stmtRekap->fetchAll(PDO::FETCH_ASSOC);

// 2. Ambil Data Rekap Stok Kertas Bulanan
$stmtStokBulanan = $pdo->query("
    SELECT 
        YEAR(tanggal) AS tahun, 
        MONTH(tanggal) AS bulan,
        SUM(CASE WHEN jenis_pergerakan = 'MASUK' THEN jumlah_lembar ELSE 0 END) AS kertas_masuk,
        SUM(CASE WHEN jenis_pergerakan IN ('TERPAKAI', 'RUSAK', 'PENYESUAIAN') THEN jumlah_lembar ELSE 0 END) AS kertas_keluar
    FROM log_kertas
    GROUP BY YEAR(tanggal), MONTH(tanggal)
");
$stok_map = [];
foreach($stmtStokBulanan->fetchAll(PDO::FETCH_ASSOC) as $st) {
    $key = $st['tahun'] . '-' . $st['bulan'];
    $stok_map[$key] = [
        'masuk' => $st['kertas_masuk'],
        'keluar' => $st['kertas_keluar']
    ];
}

// 3. Ambil Data Saham
$stmtSaham = $pdo->query("SELECT * FROM pemegang_saham ORDER BY mulai_tahun ASC, mulai_bulan ASC, persentase DESC");
$pemegangSaham = $stmtSaham->fetchAll(PDO::FETCH_ASSOC);

// 4. Ambil Setting Persentase Kas
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

// 5. Ambil Transaksi Terakhir (Untuk Audit)
$stmtTransaksi = $pdo->query("
    SELECT t.tanggal, k.nama_kategori, k.jenis, t.keterangan, t.nominal 
    FROM transaksi_keuangan t
    JOIN kategori_transaksi k ON t.id_kategori = k.id_kategori
    ORDER BY t.tanggal DESC, t.waktu_input DESC LIMIT 10
");
$dataTransaksi = $stmtTransaksi->fetchAll(PDO::FETCH_ASSOC);
?>

<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Dashboard Keuangan - Snappoint Traffa</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        .table-rekap th, .table-rekap td { white-space: nowrap; vertical-align: middle; }
        .bg-ongoing { background-color: #fff3cd !important; }
        .border-right-thick { border-right: 3px solid #dee2e6 !important; }
    </style>
</head>
<body class="bg-light">

<?php include 'navbar.php'; ?>

<div class="container-fluid px-4">
    <div class="row mb-5">
        <div class="col-12">
            <h3 class="mb-3">Rekapitulasi Bulanan & Bagi Hasil</h3>
            <div class="card shadow-sm border-primary">
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover table-bordered table-rekap mb-0">
                            <thead class="text-center align-middle">
                                <tr>
                                    <th rowspan="2" class="bg-primary text-white border-right-thick">Tahun</th>
                                    <th rowspan="2" class="bg-primary text-white border-right-thick">Bulan</th>
                                    
                                    <th colspan="2" class="bg-secondary text-white border-right-thick">Fisik Kertas (Lbr)</th>
                                    
                                    <th rowspan="2" class="bg-light">Pemasukan</th>
                                    <th rowspan="2" class="bg-light">Pengeluaran</th>
                                    <th rowspan="2" class="bg-success text-white border-right-thick">Net Profit</th>
                                    
                                    <th rowspan="2" class="bg-warning text-dark">Rencana Kas</th>
                                    <th rowspan="2" class="bg-info text-dark border-right-thick">Payout Ratio</th>
                                    <th colspan="<?= count($pemegangSaham) ?>" class="bg-dark text-white">Riwayat Sharing Profit</th>
                                </tr>
                                <tr>
                                    <th class="bg-light text-success fw-bold">Masuk</th>
                                    <th class="bg-light text-danger fw-bold border-right-thick">Keluar</th>
                                    
                                    <?php foreach($pemegangSaham as $saham): 
                                        $is_active = ($saham['akhir_tahun'] == null);
                                    ?>
                                        <th class="bg-secondary text-white <?= !$is_active ? 'opacity-75' : '' ?>">
                                            <?= htmlspecialchars($saham['nama_investor']) ?> 
                                            <?= !$is_active ? '(Tutup)' : '' ?><br>
                                            <small>(<?= floatval($saham['persentase']) ?>%)</small>
                                        </th>
                                    <?php endforeach; ?>
                                </tr>
                            </thead>
                            <tbody>
                                <?php if(count($dataRekap) > 0): ?>
                                    <?php foreach($dataRekap as $row): 
                                        $thn = (int)$row['tahun'];
                                        $bln = (int)$row['bulan'];
                                        $laba_bersih = $row['laba_bersih'];
                                        $persen_kas = getPersenKas($thn, $bln, $persen_map);
                                        $is_completed = ($thn < $current_year) || ($thn == $current_year && $bln < $current_month);
                                        $row_class = $is_completed ? '' : 'bg-ongoing';
                                        
                                        // Ambil Data Kertas dari Map
                                        $stok_key = $thn . '-' . $bln;
                                        $kertas_masuk = isset($stok_map[$stok_key]) ? $stok_map[$stok_key]['masuk'] : 0;
                                        $kertas_keluar = isset($stok_map[$stok_key]) ? $stok_map[$stok_key]['keluar'] : 0;
                                    ?>
                                    <tr class="<?= $row_class ?>">
                                        <td class="text-center fw-bold border-right-thick"><?= $thn ?></td>
                                        <td class="text-center fw-bold border-right-thick">
                                            <?= $bln ?> <?= !$is_completed ? '<br><span class="badge bg-warning text-dark">Berjalan</span>' : '' ?>
                                        </td>
                                        
                                        <td class="text-center text-success fw-bold">
                                            <?= $kertas_masuk > 0 ? '+' . number_format($kertas_masuk, 0, ',', '.') : '-' ?>
                                        </td>
                                        <td class="text-center text-danger fw-bold border-right-thick">
                                            <?= $kertas_keluar > 0 ? '-' . number_format($kertas_keluar, 0, ',', '.') : '-' ?>
                                        </td>
                                        
                                        <td class="text-end text-success">Rp <?= number_format($row['total_pemasukan'], 0, ',', '.') ?></td>
                                        <td class="text-end text-danger">Rp <?= number_format($row['total_pengeluaran'], 0, ',', '.') ?></td>
                                        <td class="text-end fw-bold border-right-thick <?= $laba_bersih >= 0 ? 'text-success' : 'text-danger' ?>">
                                            Rp <?= number_format($laba_bersih, 0, ',', '.') ?>
                                        </td>
                                        
                                        <?php if ($is_completed): 
                                            $kas = ($laba_bersih > 0) ? $laba_bersih * ($persen_kas / 100) : 0;
                                            $payout_ratio = ($laba_bersih > 0) ? $laba_bersih - $kas : 0;
                                        ?>
                                            <td class="text-end fw-bold text-warning"><small>(<?= $persen_kas ?>%)</small><br>Rp <?= number_format($kas, 0, ',', '.') ?></td>
                                            <td class="text-end fw-bold text-info border-right-thick">Rp <?= number_format($payout_ratio, 0, ',', '.') ?></td>
                                            
                                            <?php foreach($pemegangSaham as $saham): 
                                                $row_val = $thn * 12 + $bln;
                                                $start_val = $saham['mulai_tahun'] * 12 + $saham['mulai_bulan'];
                                                $end_val = ($saham['akhir_tahun'] != null) ? ($saham['akhir_tahun'] * 12 + $saham['akhir_bulan'] - 1) : 999999;
                                                
                                                if ($row_val >= $start_val && $row_val <= $end_val) {
                                                    $nominal_investor = $payout_ratio * ($saham['persentase'] / 100);
                                                    echo "<td class='text-end fw-bold text-dark'>Rp " . number_format($nominal_investor, 0, ',', '.') . "</td>";
                                                } else {
                                                    echo "<td class='text-center text-muted'>-</td>";
                                                }
                                            ?>
                                            <?php endforeach; ?>
                                            
                                        <?php else: ?>
                                            <td class="text-center text-muted fw-bold">Target: <?= $persen_kas ?>%<br><small>Menunggu Akhir</small></td>
                                            <td class="text-center text-muted border-right-thick"><em>Menunggu Akhir</em></td>
                                            <?php foreach($pemegangSaham as $saham): ?>
                                                <td class="text-center text-muted">-</td>
                                            <?php endforeach; ?>
                                        <?php endif; ?>
                                    </tr>
                                    <?php endforeach; ?>
                                <?php else: ?>
                                    <tr><td colspan="<?= 9 + count($pemegangSaham) ?>" class="text-center">Belum ada data rekap bulanan.</td></tr>
                                <?php endif; ?>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>