<?php
// Proteksi jika navbar diakses langsung
if(!isset($_SESSION['user_id'])) exit(); 
$role = $_SESSION['role'];
?>

<style>
    /* CSS KHUSUS UNTUK MENGECILKAN TEKS NAVBAR */
    .navbar .nav-link, 
    .navbar .navbar-text, 
    .navbar .btn {
        font-size: 0.95rem; /* Ubah angka ini (misal 0.8rem atau 0.9rem) untuk menyesuaikan ukuran */
    }
    
    .navbar-brand {
        font-size: 1.1rem; /* Logo/Judul dibikin sedikit lebih besar dari menu lainnya */
    }
</style>

<nav class="navbar navbar-expand-lg navbar-dark bg-dark mb-4 py-2"> <div class="container-fluid px-4">
    <a class="navbar-brand fw-bold" href="#">Snappoint Traffa</a>
    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
      <span class="navbar-toggler-icon"></span>
    </button>
    <div class="collapse navbar-collapse" id="navbarNav">
        <div class="navbar-nav me-auto">
          
          <?php if($role != 'kasir'): ?>
            <a class="nav-link" href="index.php">Dashboard</a>
          <?php endif; ?>
          
          <?php if($role == 'kasir' || $role == 'owner' || $role == 'admin'): ?>
            <a class="nav-link" href="input_transaksi.php">Input Transaksi</a>
          <?php endif; ?>
          
          <a class="nav-link" href="kelola_stok.php">Kelola Stok</a>
          
          <?php if($role != 'investor'): ?>
            <a class="nav-link" href="laporan_harian.php">Detail Transaksi</a>
          <?php endif; ?>
          
          <?php if($role == 'owner' || $role == 'admin'): ?>
            <a class="nav-link" href="kelola_kas.php">Kelola Kas</a>
            <a class="nav-link" href="kelola_investor.php">Kelola Investor</a>
          <?php endif; ?>
          
          <?php if($role == 'admin'): ?>
            <a class="nav-link text-warning fw-bold" href="kelola_akun.php">Kelola Akun</a>
          <?php endif; ?>

        </div>
        <div class="navbar-nav align-items-center">
            <span class="navbar-text me-3 text-white">
                Halo, <strong><?= htmlspecialchars($_SESSION['nama_lengkap']) ?></strong> 
                <span class="badge bg-secondary ms-1 text-uppercase" style="font-size: 0.7rem;"><?= $role ?></span>
            </span>
            <a class="nav-link text-danger fw-bold" href="logout.php">Logout</a>
        </div>
    </div>
  </div>
</nav>