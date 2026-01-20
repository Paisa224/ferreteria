-- CreateTable
CREATE TABLE `CashMovement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cash_session_id` INTEGER NOT NULL,
    `type` ENUM('IN', 'OUT') NOT NULL,
    `concept` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `reference` VARCHAR(191) NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CashMovement_cash_session_id_type_idx`(`cash_session_id`, `type`),
    INDEX `CashMovement_created_by_created_at_idx`(`created_by`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CashCount` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cash_session_id` INTEGER NOT NULL,
    `counted_by` INTEGER NOT NULL,
    `counted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `total_counted` DECIMAL(12, 2) NOT NULL,
    `expected_total` DECIMAL(12, 2) NOT NULL,
    `difference` DECIMAL(12, 2) NOT NULL,

    INDEX `CashCount_cash_session_id_counted_at_idx`(`cash_session_id`, `counted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CashCountDenomination` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cash_count_id` INTEGER NOT NULL,
    `denom_value` DECIMAL(12, 2) NOT NULL,
    `qty` INTEGER NOT NULL,
    `subtotal` DECIMAL(12, 2) NOT NULL,

    INDEX `CashCountDenomination_cash_count_id_idx`(`cash_count_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CashMovement` ADD CONSTRAINT `CashMovement_cash_session_id_fkey` FOREIGN KEY (`cash_session_id`) REFERENCES `CashSession`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CashMovement` ADD CONSTRAINT `CashMovement_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CashCount` ADD CONSTRAINT `CashCount_cash_session_id_fkey` FOREIGN KEY (`cash_session_id`) REFERENCES `CashSession`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CashCount` ADD CONSTRAINT `CashCount_counted_by_fkey` FOREIGN KEY (`counted_by`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CashCountDenomination` ADD CONSTRAINT `CashCountDenomination_cash_count_id_fkey` FOREIGN KEY (`cash_count_id`) REFERENCES `CashCount`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
