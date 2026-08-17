
-- AlterTable
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "Chunk" ADD COLUMN     "embedding" vector(3072);
