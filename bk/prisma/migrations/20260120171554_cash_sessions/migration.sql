-- CreateTable
CREATE TABLE `CashRegister` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CashRegister_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CashSession` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cash_register_id` INTEGER NOT NULL,
    `opened_by` INTEGER NOT NULL,
    `opened_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `opening_amount` DECIMAL(12, 2) NOT NULL,
    `closed_by` INTEGER NULL,
    `closed_at` DATETIME(3) NULL,
    `closing_amount` DECIMAL(12, 2) NULL,
    `status` ENUM('OPEN', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CashSession_cash_register_id_status_idx`(`cash_register_id`, `status`),
    INDEX `CashSession_opened_by_opened_at_idx`(`opened_by`, `opened_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CashSession` ADD CONSTRAINT `CashSession_cash_register_id_fkey` FOREIGN KEY (`cash_register_id`) REFERENCES `CashRegister`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CashSession` ADD CONSTRAINT `CashSession_opened_by_fkey` FOREIGN KEY (`opened_by`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CashSession` ADD CONSTRAINT `CashSession_closed_by_fkey` FOREIGN KEY (`closed_by`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
