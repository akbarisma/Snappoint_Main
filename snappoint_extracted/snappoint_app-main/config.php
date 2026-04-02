<?php
// config.php
date_default_timezone_set('Asia/Jakarta');

$host = 'localhost';
$dbname = 'snappoint';
$username = 'root'; // Sesuaikan jika Anda menggunakan password di database lokal
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    // Set mode error PDO menjadi Exception
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    die("Koneksi database gagal: " . $e->getMessage());
}
?>