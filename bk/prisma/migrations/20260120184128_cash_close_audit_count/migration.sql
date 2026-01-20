/*
  Warnings:

  - A unique constraint covering the columns `[closed_with_cash_count_id]` on the table `CashSession` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `cashsession` ADD COLUMN `closed_with_cash_count_id` INTEGER NULL;

-- CreateIndex
CREATE UNIQUE INDEX `CashSession_closed_with_cash_count_id_key` ON `CashSession`(`closed_with_cash_count_id`);

-- AddForeignKey
ALTER TABLE `CashSession` ADD CONSTRAINT `CashSession_closed_with_cash_count_id_fkey` FOREIGN KEY (`closed_with_cash_count_id`) REFERENCES `CashCount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
