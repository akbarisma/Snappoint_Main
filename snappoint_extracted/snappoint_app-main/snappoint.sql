-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 25, 2026 at 04:18 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `snappoint`
--

-- --------------------------------------------------------

--
-- Table structure for table `buku_kas`
--

CREATE TABLE `buku_kas` (
  `id_kas` int(11) NOT NULL,
  `tanggal` date NOT NULL,
  `tipe` enum('MASUK','KELUAR') NOT NULL,
  `keterangan` varchar(255) NOT NULL,
  `nominal` decimal(15,2) NOT NULL,
  `waktu_input` datetime DEFAULT current_timestamp(),
  `is_edited` tinyint(1) DEFAULT 0,
  `alasan_edit` varchar(255) DEFAULT NULL,
  `waktu_edit` datetime DEFAULT NULL,
  `is_backdated` tinyint(1) DEFAULT 0,
  `alasan_backdate` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `buku_kas`
--

INSERT INTO `buku_kas` (`id_kas`, `tanggal`, `tipe`, `keterangan`, `nominal`, `waktu_input`, `is_edited`, `alasan_edit`, `waktu_edit`, `is_backdated`, `alasan_backdate`) VALUES
(1, '2026-02-22', 'KELUAR', 'beli lampu', 50000.00, '2026-02-22 20:33:45', 0, NULL, NULL, 0, NULL),
(2, '2026-02-22', 'KELUAR', '', 50000.00, '2026-02-22 20:34:04', 0, NULL, NULL, 0, NULL),
(3, '2026-02-22', 'KELUAR', 'beli lampu', 50000.00, '2026-02-22 20:35:14', 0, NULL, NULL, 0, NULL),
(7, '2026-02-22', 'KELUAR', 'cek', 20000.00, '2026-02-22 20:40:54', 0, NULL, NULL, 0, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `kategori_transaksi`
--

CREATE TABLE `kategori_transaksi` (
  `id_kategori` int(11) NOT NULL,
  `nama_kategori` varchar(50) NOT NULL,
  `jenis` enum('PEMASUKAN','PENGELUARAN') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `kategori_transaksi`
--

INSERT INTO `kategori_transaksi` (`id_kategori`, `nama_kategori`, `jenis`) VALUES
(1, 'Pendapatan (Gross Income)', 'PEMASUKAN'),
(2, 'Bahan Baku (Kertas/Tinta)', 'PENGELUARAN'),
(3, 'Gaji & Honor', 'PENGELUARAN'),
(4, 'Sewa Tempat', 'PENGELUARAN'),
(5, 'Operasional & Konsumsi', 'PENGELUARAN'),
(6, 'Maintenance & Perbaikan', 'PENGELUARAN'),
(7, 'Lain-lain', 'PENGELUARAN');

-- --------------------------------------------------------

--
-- Table structure for table `log_kertas`
--

CREATE TABLE `log_kertas` (
  `id_log` int(11) NOT NULL,
  `tanggal` date NOT NULL,
  `waktu_input` datetime DEFAULT current_timestamp(),
  `jenis_pergerakan` enum('MASUK','TERPAKAI','RUSAK','PENYESUAIAN') NOT NULL,
  `jumlah_lembar` int(11) NOT NULL,
  `keterangan` varchar(255) NOT NULL,
  `is_edited` tinyint(1) DEFAULT 0,
  `waktu_edit` datetime DEFAULT NULL,
  `alasan_edit` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pemegang_saham`
--

CREATE TABLE `pemegang_saham` (
  `id_saham` int(11) NOT NULL,
  `nama_investor` varchar(50) NOT NULL,
  `persentase` decimal(5,2) NOT NULL,
  `mulai_tahun` int(11) NOT NULL DEFAULT 2025,
  `mulai_bulan` int(11) NOT NULL DEFAULT 10,
  `akhir_tahun` int(11) DEFAULT NULL,
  `akhir_bulan` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `pemegang_saham`
--

INSERT INTO `pemegang_saham` (`id_saham`, `nama_investor`, `persentase`, `mulai_tahun`, `mulai_bulan`, `akhir_tahun`, `akhir_bulan`) VALUES
(1, 'Rozi', 44.00, 2025, 10, NULL, NULL),
(2, 'Naja', 15.00, 2025, 10, NULL, NULL),
(3, 'Sholah', 10.00, 2025, 10, NULL, NULL),
(4, 'Dika', 10.00, 2025, 10, NULL, NULL),
(5, 'Shoffa', 10.00, 2025, 10, NULL, NULL),
(6, 'Septian', 10.00, 2025, 10, NULL, NULL),
(7, 'Izar', 1.00, 2025, 10, NULL, NULL),
(8, 'Andre', 10.00, 2026, 3, NULL, NULL);

-- --------------------------------------------------------

--
-- Stand-in structure for view `rekap_laba_bulanan`
-- (See below for the actual view)
--
CREATE TABLE `rekap_laba_bulanan` (
`tahun` int(4)
,`bulan` int(2)
,`total_pemasukan` decimal(37,2)
,`total_pengeluaran` decimal(37,2)
,`laba_bersih` decimal(38,2)
);

-- --------------------------------------------------------

--
-- Table structure for table `setting_kas`
--

CREATE TABLE `setting_kas` (
  `tahun` int(11) NOT NULL,
  `bulan` int(11) NOT NULL,
  `persentase` decimal(5,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `setting_kas`
--

INSERT INTO `setting_kas` (`tahun`, `bulan`, `persentase`) VALUES
(2025, 11, 3.00),
(2026, 5, 4.00);

-- --------------------------------------------------------

--
-- Table structure for table `transaksi_keuangan`
--

CREATE TABLE `transaksi_keuangan` (
  `id_transaksi` int(11) NOT NULL,
  `tanggal` date NOT NULL,
  `id_kategori` int(11) NOT NULL,
  `keterangan` varchar(255) NOT NULL,
  `nominal` decimal(15,2) NOT NULL,
  `bukti_transaksi` varchar(255) DEFAULT NULL,
  `waktu_input` datetime DEFAULT current_timestamp(),
  `is_edited` tinyint(1) DEFAULT 0,
  `alasan_edit` varchar(255) DEFAULT NULL,
  `waktu_edit` datetime DEFAULT NULL,
  `is_backdated` tinyint(1) DEFAULT 0,
  `alasan_backdate` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `transaksi_keuangan`
--

INSERT INTO `transaksi_keuangan` (`id_transaksi`, `tanggal`, `id_kategori`, `keterangan`, `nominal`, `bukti_transaksi`, `waktu_input`, `is_edited`, `alasan_edit`, `waktu_edit`, `is_backdated`, `alasan_backdate`) VALUES
(1, '2026-02-21', 1, 'Gross Income', 2000000.00, NULL, '2026-02-21 19:14:47', 0, NULL, NULL, 0, NULL),
(2, '2026-02-21', 2, 'beli topi', 450000.00, NULL, '2026-02-21 19:16:07', 1, 'salah nominal njir', '2026-02-22 20:25:53', 0, NULL),
(3, '2026-02-22', 1, 'Gross Income', 5000000.00, NULL, '2026-02-22 20:29:01', 0, NULL, NULL, 0, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id_user` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `nama_lengkap` varchar(100) NOT NULL,
  `role` enum('kasir','investor','owner','admin') NOT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id_user`, `username`, `password`, `nama_lengkap`, `role`, `created_at`) VALUES
(1, 'admin', '$2y$10$HFgnr04rnq5L1uzutKcz/OlsaNKvvnx/74KdbXuHYb8XOc8Jc87.6', 'Super Administrator', 'admin', '2026-03-09 19:41:03'),
(2, 'akuganteng', '$2y$10$ZmPC5r8sJIyuUHq3ieopNO187NyxolyfwjM9JVL9qLuDvVgiGtIlO', 'Andre', 'owner', '2026-03-09 19:42:28'),
(4, 'rusdi', '$2y$10$cvl341/cjtdZU.fihIuHwuymnpgjT31pbNlMLUXTDoqGzqztjQUNi', 'rusdi', 'kasir', '2026-03-09 19:44:48'),
(5, 'apalah', '$2y$10$3k1822GZEivh6gzCU0tva.XjHZ.DGBg7g/bByfEKYTbKYO9BWvGKi', 'apalah', 'investor', '2026-03-09 19:46:21');

-- --------------------------------------------------------

--
-- Structure for view `rekap_laba_bulanan`
--
DROP TABLE IF EXISTS `rekap_laba_bulanan`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `rekap_laba_bulanan`  AS SELECT year(`t`.`tanggal`) AS `tahun`, month(`t`.`tanggal`) AS `bulan`, sum(case when `k`.`jenis` = 'PEMASUKAN' then `t`.`nominal` else 0 end) AS `total_pemasukan`, sum(case when `k`.`jenis` = 'PENGELUARAN' then `t`.`nominal` else 0 end) AS `total_pengeluaran`, sum(case when `k`.`jenis` = 'PEMASUKAN' then `t`.`nominal` else 0 end) - sum(case when `k`.`jenis` = 'PENGELUARAN' then `t`.`nominal` else 0 end) AS `laba_bersih` FROM (`transaksi_keuangan` `t` join `kategori_transaksi` `k` on(`t`.`id_kategori` = `k`.`id_kategori`)) GROUP BY year(`t`.`tanggal`), month(`t`.`tanggal`) ORDER BY year(`t`.`tanggal`) DESC, month(`t`.`tanggal`) DESC ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `buku_kas`
--
ALTER TABLE `buku_kas`
  ADD PRIMARY KEY (`id_kas`);

--
-- Indexes for table `kategori_transaksi`
--
ALTER TABLE `kategori_transaksi`
  ADD PRIMARY KEY (`id_kategori`);

--
-- Indexes for table `log_kertas`
--
ALTER TABLE `log_kertas`
  ADD PRIMARY KEY (`id_log`);

--
-- Indexes for table `pemegang_saham`
--
ALTER TABLE `pemegang_saham`
  ADD PRIMARY KEY (`id_saham`);

--
-- Indexes for table `setting_kas`
--
ALTER TABLE `setting_kas`
  ADD PRIMARY KEY (`tahun`,`bulan`);

--
-- Indexes for table `transaksi_keuangan`
--
ALTER TABLE `transaksi_keuangan`
  ADD PRIMARY KEY (`id_transaksi`),
  ADD KEY `id_kategori` (`id_kategori`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id_user`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `buku_kas`
--
ALTER TABLE `buku_kas`
  MODIFY `id_kas` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `kategori_transaksi`
--
ALTER TABLE `kategori_transaksi`
  MODIFY `id_kategori` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `log_kertas`
--
ALTER TABLE `log_kertas`
  MODIFY `id_log` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pemegang_saham`
--
ALTER TABLE `pemegang_saham`
  MODIFY `id_saham` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `transaksi_keuangan`
--
ALTER TABLE `transaksi_keuangan`
  MODIFY `id_transaksi` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id_user` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `transaksi_keuangan`
--
ALTER TABLE `transaksi_keuangan`
  ADD CONSTRAINT `transaksi_keuangan_ibfk_1` FOREIGN KEY (`id_kategori`) REFERENCES `kategori_transaksi` (`id_kategori`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
