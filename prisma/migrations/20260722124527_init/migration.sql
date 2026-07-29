-- CreateTable
CREATE TABLE "JenisSurat" (
    "id" SERIAL NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JenisSurat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuratMasuk" (
    "id" SERIAL NOT NULL,
    "nomorSurat" TEXT NOT NULL,
    "pengirim" TEXT NOT NULL,
    "perihal" TEXT NOT NULL,
    "tanggalDiterima" TIMESTAMP(3) NOT NULL,
    "fileUrl" TEXT,
    "jenisSuratId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuratMasuk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuratKeluar" (
    "id" SERIAL NOT NULL,
    "nomorSurat" TEXT NOT NULL,
    "tujuan" TEXT NOT NULL,
    "perihal" TEXT NOT NULL,
    "tanggalDikirim" TIMESTAMP(3) NOT NULL,
    "fileUrl" TEXT,
    "jenisSuratId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuratKeluar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JenisSurat_kode_key" ON "JenisSurat"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "SuratMasuk_nomorSurat_key" ON "SuratMasuk"("nomorSurat");

-- CreateIndex
CREATE UNIQUE INDEX "SuratKeluar_nomorSurat_key" ON "SuratKeluar"("nomorSurat");

-- AddForeignKey
ALTER TABLE "SuratMasuk" ADD CONSTRAINT "SuratMasuk_jenisSuratId_fkey" FOREIGN KEY ("jenisSuratId") REFERENCES "JenisSurat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuratKeluar" ADD CONSTRAINT "SuratKeluar_jenisSuratId_fkey" FOREIGN KEY ("jenisSuratId") REFERENCES "JenisSurat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
