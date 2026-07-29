import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = `${process.env.DATABASE_URL}`;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // 1. Clean existing data
  await prisma.verificationCode.deleteMany();
  await prisma.user.deleteMany();
  await prisma.suratMasuk.deleteMany();
  await prisma.suratKeluar.deleteMany();
  await prisma.jenisSurat.deleteMany();

  // 1b. Seed default User (username: admin, password: password123, email: admin@bmkg.go.id)
  // SHA-256 for password123: ef92b778bafe771e8929ab5b6d54797728004b6b53002c74063110a11761d55d
  const adminUser = await prisma.user.create({
    data: {
      username: 'admin',
      password: 'ef92b778bafe771e8929ab5b6d54797728004b6b53002c74063110a11761d55d',
      email: 'admin@bmkg.go.id'
    }
  });
  console.log('Seeded default Admin user:', adminUser.username);

  // 2. Seed JenisSurat
  const jenisSuratList = [
    { kode: 'LT', nama: 'Laporan Teknis' },
    { kode: 'ST', nama: 'Surat Tugas' },
    { kode: 'SP', nama: 'Surat Permintaan' },
    { kode: 'SK', nama: 'Surat Keputusan' },
  ];

  const createdJenis = [];
  for (const item of jenisSuratList) {
    const js = await prisma.jenisSurat.create({
      data: item,
    });
    createdJenis.push(js);
  }

  console.log(`Seeded ${createdJenis.length} JenisSurat categories.`);

  // Find IDs for reference
  const ltId = createdJenis.find(j => j.kode === 'LT')?.id || 1;
  const stId = createdJenis.find(j => j.kode === 'ST')?.id || 2;
  const spId = createdJenis.find(j => j.kode === 'SP')?.id || 3;
  const skId = createdJenis.find(j => j.kode === 'SK')?.id || 4;

  // 3. Seed SuratMasuk (Matching the user screenshot)
  const suratMasukList = [
    {
      nomorSurat: '001/ME.01.01/VII/2026',
      tanggalDiterima: new Date('2026-07-15'),
      pengirim: 'Pusat Meteorologi BMKG',
      perihal: 'Laporan Validasi Data Curah Hujan Jakarta',
      jenisSuratId: ltId,
    },
    {
      nomorSurat: '002/PJ/VII/2026',
      tanggalDiterima: new Date('2026-07-16'),
      pengirim: 'Sekretariat Utama BMKG',
      perihal: 'Surat Tugas Pengamatan El Nino Nasional',
      jenisSuratId: stId,
    },
    {
      nomorSurat: '003/KL.03.02/VII/2026',
      tanggalDiterima: new Date('2026-07-17'),
      pengirim: 'Stasiun Klimatologi Jawa Barat',
      perihal: 'Permintaan Peralatan AWS Baru',
      jenisSuratId: spId,
    },
    {
      nomorSurat: '004/KL.03.02/VII/2026', // adjusted from 003 to make unique
      tanggalDiterima: new Date('2026-07-17'),
      pengirim: 'Stasiun Klimatologi Jawa Barat',
      perihal: 'Permintaan Peralatan AWS Baru (Duplikat)',
      jenisSuratId: spId,
    },
    {
      nomorSurat: '005/RJ/VII/2026',
      tanggalDiterima: new Date('2026-07-15'),
      pengirim: 'Stasiun Klimatologi Jawa Barat',
      perihal: 'Permintaan Peralatan AWS Baru',
      jenisSuratId: stId,
    },
    {
      nomorSurat: '006/RJ/VII/2026', // adjusted
      tanggalDiterima: new Date('2026-07-16'),
      pengirim: 'Stasiun Klimatologi Jawa Barat',
      perihal: 'Permintaan Peralatan AWS Baru',
      jenisSuratId: spId,
    },
    {
      nomorSurat: '007/RJ/VII/2026', // adjusted
      tanggalDiterima: new Date('2026-07-15'),
      pengirim: 'Stasiun Klimatologi Jawa Barat',
      perihal: 'Permintaan Peralatan AWS Baru',
      jenisSuratId: spId,
    },
  ];

  for (const item of suratMasukList) {
    await prisma.suratMasuk.create({
      data: item,
    });
  }

  console.log(`Seeded ${suratMasukList.length} SuratMasuk records.`);

  // 4. Seed SuratKeluar (just some mock data since it uses the same schema)
  const suratKeluarList = [
    {
      nomorSurat: '001/OUT/VII/2026',
      tanggalDikirim: new Date('2026-07-20'),
      tujuan: 'Balai Besar Wilayah II BMKG',
      perihal: 'Penyampaian Laporan Bulanan Meteorologi',
      jenisSuratId: ltId,
    },
  ];

  for (const item of suratKeluarList) {
    await prisma.suratKeluar.create({
      data: item,
    });
  }

  console.log(`Seeded ${suratKeluarList.length} SuratKeluar records.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
