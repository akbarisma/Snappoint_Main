<?php
session_start();
require_once 'config.php';

// PROTEKSI: Hanya yang sudah login DAN memiliki role 'admin' yang boleh masuk
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    die('<div style="color:red; font-family:sans-serif; text-align:center; margin-top:50px;"><h2>Akses Ditolak!</h2><p>Hanya Admin yang berhak mengakses halaman ini.</p><a href="index.php">Kembali</a></div>');
}

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    if ($_POST['aksi'] == 'tambah') {
        $nama = htmlspecialchars($_POST['nama_lengkap']);
        $user = htmlspecialchars($_POST['username']);
        $pass = password_hash($_POST['password'], PASSWORD_DEFAULT);
        $role = $_POST['role'];
        
        try {
            $stmt = $pdo->prepare("INSERT INTO users (nama_lengkap, username, password, role) VALUES (?, ?, ?, ?)");
            $stmt->execute([$nama, $user, $pass, $role]);
            $_SESSION['pesan'] = '<div class="alert alert-success">✅ Akun berhasil dibuat!</div>';
        } catch(PDOException $e) {
            $_SESSION['pesan'] = '<div class="alert alert-danger">❌ Gagal: Username mungkin sudah dipakai.</div>';
        }
    } 
    elseif ($_POST['aksi'] == 'hapus') {
        if ($_POST['id_user'] != $_SESSION['user_id']) { // Cegah admin menghapus dirinya sendiri
            $stmt = $pdo->prepare("DELETE FROM users WHERE id_user = ?");
            $stmt->execute([$_POST['id_user']]);
            $_SESSION['pesan'] = '<div class="alert alert-success">🗑️ Akun berhasil dihapus!</div>';
        }
    }
    header("Location: kelola_akun.php");
    exit();
}

$stmtUsers = $pdo->query("SELECT * FROM users ORDER BY role ASC, nama_lengkap ASC");
$users = $stmtUsers->fetchAll(PDO::FETCH_ASSOC);
?>

<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Kelola Akun - Snappoint Traffa</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">

<?php include 'navbar.php'; ?>

<div class="container px-4">
    <h2 class="mb-4">Kelola Pengguna Sistem (User Accounts)</h2>
    
    <?php if(isset($_SESSION['pesan'])) { echo $_SESSION['pesan']; unset($_SESSION['pesan']); } ?>

    <div class="row">
        <div class="col-md-4 mb-4">
            <div class="card shadow-sm border-dark">
                <div class="card-header bg-dark text-white fw-bold">Tambah Akun Baru</div>
                <div class="card-body">
                    <form method="POST">
                        <input type="hidden" name="aksi" value="tambah">
                        <div class="mb-3"><label>Nama Lengkap</label><input type="text" name="nama_lengkap" class="form-control" required></div>
                        <div class="mb-3"><label>Username (Untuk Login)</label><input type="text" name="username" class="form-control" required></div>
                        <div class="mb-3"><label>Password</label><input type="password" name="password" class="form-control" required></div>
                        <div class="mb-3">
                            <label>Role / Peran</label>
                            <select name="role" class="form-select" required>
                                <option value="kasir">Kasir (Hanya Input & Lihat Transaksi)</option>
                                <option value="investor">Investor (Read-Only Laporan)</option>
                                <option value="owner">Owner (Full Akses Bisnis)</option>
                                <option value="admin">Admin (Full Akses + Kelola Akun)</option>
                            </select>
                        </div>
                        <button type="submit" class="btn btn-dark w-100 fw-bold">Buat Akun</button>
                    </form>
                </div>
            </div>
        </div>

        <div class="col-md-8">
            <div class="card shadow-sm">
                <div class="card-body p-0">
                    <table class="table table-hover align-middle mb-0">
                        <thead class="table-secondary">
                            <tr><th>Nama Lengkap</th><th>Username</th><th>Role</th><th>Aksi</th></tr>
                        </thead>
                        <tbody>
                            <?php foreach($users as $u): ?>
                            <tr>
                                <td class="fw-bold ps-3"><?= htmlspecialchars($u['nama_lengkap']) ?></td>
                                <td><?= htmlspecialchars($u['username']) ?></td>
                                <td>
                                    <?php 
                                        $badges = ['admin'=>'danger', 'owner'=>'success', 'investor'=>'primary', 'kasir'=>'secondary'];
                                        $bg = $badges[$u['role']] ?? 'dark';
                                    ?>
                                    <span class="badge bg-<?= $bg ?> text-uppercase"><?= $u['role'] ?></span>
                                </td>
                                <td>
                                    <?php if($u['id_user'] != $_SESSION['user_id']): ?>
                                    <form method="POST" onsubmit="return confirm('Hapus akun ini?');">
                                        <input type="hidden" name="aksi" value="hapus">
                                        <input type="hidden" name="id_user" value="<?= $u['id_user'] ?>">
                                        <button class="btn btn-sm btn-outline-danger">Hapus</button>
                                    </form>
                                    <?php else: ?>
                                        <span class="badge bg-light text-dark border">Anda (Aktif)</span>
                                    <?php endif; ?>
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
</body>
</html>