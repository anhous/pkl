-- CreateTable
CREATE TABLE `roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` ENUM('SUPERADMIN', 'ADMIN_SEKOLAH', 'GURU', 'SISWA', 'INSTRUKTUR') NOT NULL,
    `description` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `roles_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(190) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `roleId` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_roleId_idx`(`roleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `master_jurusan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kode` VARCHAR(20) NOT NULL,
    `nama` VARCHAR(120) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `master_jurusan_kode_key`(`kode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `master_siswa` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nisn` VARCHAR(20) NOT NULL,
    `nama` VARCHAR(120) NOT NULL,
    `kelas` VARCHAR(40) NOT NULL,
    `kontak` VARCHAR(40) NULL,
    `status` ENUM('AKTIF', 'SELESAI', 'KELUAR') NOT NULL DEFAULT 'AKTIF',
    `jurusanId` INTEGER NULL,
    `userId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `master_siswa_nisn_key`(`nisn`),
    UNIQUE INDEX `master_siswa_userId_key`(`userId`),
    INDEX `master_siswa_jurusanId_idx`(`jurusanId`),
    INDEX `master_siswa_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `master_guru` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nip` VARCHAR(30) NOT NULL,
    `nama` VARCHAR(120) NOT NULL,
    `kompetensi` VARCHAR(120) NULL,
    `kontak` VARCHAR(40) NULL,
    `userId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `master_guru_nip_key`(`nip`),
    UNIQUE INDEX `master_guru_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `master_dudi` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(160) NOT NULL,
    `alamat` TEXT NOT NULL,
    `kuota` INTEGER NOT NULL DEFAULT 0,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `kontak` VARCHAR(80) NULL,
    `deskripsi` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `master_dudi_nama_idx`(`nama`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `master_instruktur` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `identifier` VARCHAR(30) NOT NULL,
    `nama` VARCHAR(120) NOT NULL,
    `kontak` VARCHAR(40) NULL,
    `dudiId` INTEGER NULL,
    `userId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `master_instruktur_identifier_key`(`identifier`),
    UNIQUE INDEX `master_instruktur_userId_key`(`userId`),
    INDEX `master_instruktur_dudiId_idx`(`dudiId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `penempatan_pkl` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `siswaId` INTEGER NOT NULL,
    `dudiId` INTEGER NOT NULL,
    `guruId` INTEGER NULL,
    `instrukturId` INTEGER NULL,
    `tanggalMulai` DATE NOT NULL,
    `tanggalSelesai` DATE NOT NULL,
    `status` ENUM('AKTIF', 'SELESAI', 'BATAL') NOT NULL DEFAULT 'AKTIF',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `penempatan_pkl_siswaId_idx`(`siswaId`),
    INDEX `penempatan_pkl_dudiId_idx`(`dudiId`),
    INDEX `penempatan_pkl_guruId_idx`(`guruId`),
    INDEX `penempatan_pkl_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `jurnal_harian` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `penempatanId` INTEGER NOT NULL,
    `tanggal` DATE NOT NULL,
    `jamMulai` VARCHAR(5) NOT NULL,
    `jamSelesai` VARCHAR(5) NOT NULL,
    `deskripsi` TEXT NOT NULL,
    `fotoUrl` VARCHAR(500) NULL,
    `fotoLat` DOUBLE NULL,
    `fotoLng` DOUBLE NULL,
    `nilaiGuru` INTEGER NULL,
    `catatanGuru` TEXT NULL,
    `statusVerifikasi` ENUM('MENUNGGU', 'DIPERIKSA', 'DISETUJUI', 'REVISI') NOT NULL DEFAULT 'MENUNGGU',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `jurnal_harian_tanggal_idx`(`tanggal`),
    INDEX `jurnal_harian_statusVerifikasi_idx`(`statusVerifikasi`),
    UNIQUE INDEX `jurnal_harian_penempatanId_tanggal_key`(`penempatanId`, `tanggal`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `presensi_kesehatan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `penempatanId` INTEGER NOT NULL,
    `tanggal` DATE NOT NULL,
    `statusKehadiran` ENUM('HADIR', 'IZIN', 'SAKIT', 'ALPHA') NOT NULL,
    `kondisiKesehatan` VARCHAR(60) NOT NULL,
    `catatanKesehatan` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `presensi_kesehatan_tanggal_idx`(`tanggal`),
    INDEX `presensi_kesehatan_statusKehadiran_idx`(`statusKehadiran`),
    UNIQUE INDEX `presensi_kesehatan_penempatanId_tanggal_key`(`penempatanId`, `tanggal`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sync_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sourceApp` VARCHAR(60) NOT NULL,
    `endpoint` VARCHAR(255) NOT NULL,
    `status` ENUM('BERJALAN', 'SUKSES', 'GAGAL') NOT NULL,
    `message` TEXT NULL,
    `recordCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `sync_logs_sourceApp_idx`(`sourceApp`),
    INDEX `sync_logs_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `master_siswa` ADD CONSTRAINT `master_siswa_jurusanId_fkey` FOREIGN KEY (`jurusanId`) REFERENCES `master_jurusan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `master_siswa` ADD CONSTRAINT `master_siswa_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `master_guru` ADD CONSTRAINT `master_guru_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `master_instruktur` ADD CONSTRAINT `master_instruktur_dudiId_fkey` FOREIGN KEY (`dudiId`) REFERENCES `master_dudi`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `master_instruktur` ADD CONSTRAINT `master_instruktur_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `penempatan_pkl` ADD CONSTRAINT `penempatan_pkl_siswaId_fkey` FOREIGN KEY (`siswaId`) REFERENCES `master_siswa`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `penempatan_pkl` ADD CONSTRAINT `penempatan_pkl_dudiId_fkey` FOREIGN KEY (`dudiId`) REFERENCES `master_dudi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `penempatan_pkl` ADD CONSTRAINT `penempatan_pkl_guruId_fkey` FOREIGN KEY (`guruId`) REFERENCES `master_guru`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `penempatan_pkl` ADD CONSTRAINT `penempatan_pkl_instrukturId_fkey` FOREIGN KEY (`instrukturId`) REFERENCES `master_instruktur`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `jurnal_harian` ADD CONSTRAINT `jurnal_harian_penempatanId_fkey` FOREIGN KEY (`penempatanId`) REFERENCES `penempatan_pkl`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `presensi_kesehatan` ADD CONSTRAINT `presensi_kesehatan_penempatanId_fkey` FOREIGN KEY (`penempatanId`) REFERENCES `penempatan_pkl`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
