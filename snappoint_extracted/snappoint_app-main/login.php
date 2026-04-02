<?php
session_start();
require_once 'config.php';

// AUTO-SETUP: Jika tabel users masih kosong, buatkan akun admin default
$cekUsers = $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
if ($cekUsers == 0) {
    $passDefault = password_hash('admin123', PASSWORD_DEFAULT);
    $pdo->query("INSERT INTO users (username, password, nama_lengkap, role) VALUES ('admin', '$passDefault', 'Super Administrator', 'admin')");
}

if (isset($_SESSION['user_id'])) {
    header("Location: index.php"); // Jika sudah login, lempar ke dashboard
    exit();
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $username = $_POST['username'];
    $password = $_POST['password'];

    $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    // Verifikasi password yang di-hash
    if ($user && password_verify($password, $user['password'])) {
        $_SESSION['user_id'] = $user['id_user'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['nama_lengkap'] = $user['nama_lengkap'];
        $_SESSION['role'] = $user['role'];
        
        // Arahkan Kasir langsung ke halaman Input
        if ($user['role'] == 'kasir') {
            header("Location: input_transaksi.php");
        } else {
            header("Location: index.php");
        }
        exit();
    } else {
        $error = "Username atau Password salah!";
    }
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Login - Snappoint Traffa</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-dark d-flex align-items-center justify-content-center" style="height: 100vh;">
    <div class="card shadow-lg" style="width: 400px;">
        <div class="card-body p-5">
            <h3 class="text-center mb-4 fw-bold">📸 Snappoint<br><span class="text-primary">Traffa Kudus</span></h3>
            <?php if($error): ?>
                <div class="alert alert-danger p-2 text-center"><?= $error ?></div>
            <?php endif; ?>
            <form method="POST">
                <div class="mb-3">
                    <label>Username</label>
                    <input type="text" name="username" class="form-control" required autofocus>
                </div>
                <div class="mb-4">
                    <label>Password</label>
                    <input type="password" name="password" class="form-control" required>
                </div>
                <button type="submit" class="btn btn-primary w-100 fw-bold fs-5">LOGIN</button>
            </form>
            <?php if($cekUsers == 0): ?>
                <div class="mt-3 text-muted small text-center">Akun Default:<br>Username: <b>admin</b> | Password: <b>admin123</b></div>
            <?php endif; ?>
        </div>
    </div>
</body>
</html>