# 🏨 Hotel IT Department - Inventory, Purchase Order & Preloved Management System

Aplikasi manajemen inventaris full-stack yang modular, modern, aman, dan mudah di-deploy ke berbagai platform hosting (Docker, VPS, Render, Railway, Vercel, maupun server Node.js standar).

---

## 📋 Daftar Isi
1. [Arsitektur Sistem](#1-arsitektur-sistem)
2. [Persyaratan Perangkat & Software](#2-persyaratan-perangkat--software)
3. [Akun & Kredensial Default](#3-akun--kredensial-default)
4. [Instalasi & Menjalankan di Lokal](#4-instalasi--menjalankan-di-lokal)
5. [Skema Database & File Storage](#5-skema-database--file-storage)
6. [Pengujian (Unit Tests) & Pemeriksaan Tipe](#6-pengujian-unit-tests--pemeriksaan-tipe)
7. [Build & Start Production](#7-build--start-production)
8. [Panduan Deployment Multi-Platform](#8-panduan-deployment-multi-platform)
   - [A. Deployment Menggunakan Docker & Docker Compose](#a-deployment-menggunakan-docker--docker-compose)
   - [B. Deployment ke VPS (Ubuntu/Debian dengan PM2 & Nginx)](#b-deployment-ke-vps-ubuntudebian-dengan-pm2--nginx)
   - [C. Deployment ke Render.com](#c-deployment-ke-rendercom)
   - [D. Deployment ke Railway.app](#d-deployment-ke-railwayapp)
   - [E. Deployment ke Vercel](#e-deployment-ke-vercel)
9. [Menghubungkan Database Eksternal & Object Storage (S3 / R2)](#9-menghubungkan-database-eksternal--object-storage-s3--r2)
10. [Pemantauan Log & Pemecahan Masalah (Troubleshooting)](#10-pemantauan-log--pemecahan-masalah-troubleshooting)

---

## 1. Arsitektur Sistem

Aplikasi dibangun dengan pemisahan concern yang jelas (*Separation of Concerns*):
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + Lucide Icons + Motion.
  - UI responsif desktop dan mobile.
  - Desain modal ringkas bertab (Data Utama & Foto) yang tidak terpotong di desktop.
  - Tabel interaktif dengan opsi aksi responsif (*Inspect*, *Edit*, *Delete*).
  - Ekspor Excel murni (.xlsx) langsung diunduh tanpa ketergantungan pihak ketiga.
- **Backend**: Node.js + Express + TypeScript.
  - RESTful API yang bersih (`/api/auth`, `/api/inventory`, `/api/po`, `/api/preloved`, `/api/export`, `/api/health`).
  - Autentikasi berbasis Bearer Token dan enkripsi password menggunakan `bcryptjs`.
  - Rate limiting & validasi input di server.
  - Health check endpoint `/api/health` untuk Docker, Kubernetes, dan uptime monitoring.
- **Penyimpanan**:
  - Flat-file database JSON terisolasi (`data/db.json`) dengan operasi *atomic write* (`.tmp` -> rename).
  - File upload foto tersimpan di `data/uploads/` yang disajikan melalui Express static route `/uploads/`.
  - Mudah dialihkan ke PostgreSQL / MySQL / Cloud Object Storage sesuai kebutuhan skala besar.

---

## 2. Persyaratan Perangkat & Software

- **Node.js**: Versi `18.x`, `20.x`, atau `22.x` LTS.
- **Package Manager**: `npm` (v9 atau lebih baru), `yarn`, atau `pnpm`.
- **Git**: Untuk clone repositori.
- **Docker & Docker Compose** *(Opsional)*: Jika ingin deploy via kontainer.
- **RAM Minimum**: 512 MB (Rekomendasi: 1 GB+).
- **Disk Space**: 200 MB untuk aplikasi + ruang penyimpanan untuk foto upload.

---

## 3. Akun & Kredensial Default

Database telah dilengkapi dengan seed data dan 3 akun pengguna berjenjang hak akses:

| Username | Role | Default Password | Otoritas & Hak Akses |
| :--- | :--- | :--- | :--- |
| **ITMANAGER** | `IT MANAGER` | `syah` | Hak penuh: Kelola semua data, tambah/edit/hapus user, reset password user lain. |
| **ITASSIST** | `IT ASSISTANT` | `ihsan` | Tambah & edit data inventaris, PO, preloved, serta ekspor Excel. |
| **ITTRAINEE** | `IT TRAINEE` | `andi` | Input & update operasional data inventaris, PO, dan preloved. |

> **Kode Otoritas Rahasia (*Secret Code*):**  
> `INNRATTAN.BJM`  
> Digunakan oleh IT MANAGER di menu **Pengaturan Sistem > Kredensial User** untuk mereset akun atau mengubah password.

---

## 4. Instalasi & Menjalankan di Lokal

### Langkah 1: Clone dan Masuk ke Direktori
```bash
git clone https://github.com/username/hotel-it-inventory.git
cd hotel-it-inventory
```

### Langkah 2: Instalasi Dependency
```bash
npm install
```

### Langkah 3: Konfigurasi Environment Variables
Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Isi konfigurasi di file `.env`:
```env
PORT=3000
NODE_ENV=development
SECRET_CODE=INNRATTAN.BJM
DATA_DIR=./data
APP_URL=http://localhost:3000
```

### Langkah 4: Jalankan Server Development
```bash
npm run dev
```
Aplikasi akan aktif di: **`http://localhost:3000`**  
Backend API dan Vite middleware berjalan bersamaan secara efisien di port 3000.

---

## 5. Skema Database & File Storage

Database tersimpan secara lokal dan otomatis dibuat pada saat pertama kali server dijalankan:
- File database: `data/db.json`
- File uploads: `data/uploads/`

### Struktur Skema Data JSON:
```json
{
  "users": [
    { "id": "usr-1", "username": "ITMANAGER", "role": "IT MANAGER", "passwordHash": "..." }
  ],
  "inventory": [
    {
      "id": "inv-1",
      "itemName": "Switch Cisco Catalyst 2960",
      "photoUrl": "/uploads/switch_cisco_123.jpg",
      "category": "NETWORK ITEMS",
      "dateRepaired": "2026-10-05",
      "quantity": 2,
      "serialNumber": "FOC1928X01A",
      "remark": "Refurbished spare unit",
      "createdAt": "2026-10-05T08:00:00Z",
      "createdBy": "ITMANAGER",
      "updatedAt": "2026-10-05T08:00:00Z",
      "updatedBy": "ITMANAGER"
    }
  ],
  "purchaseOrders": [ ... ],
  "preloved": [ ... ],
  "activities": [ ... ]
}
```

---

## 6. Pengujian (Unit Tests) & Pemeriksaan Tipe

Aplikasi dilengkapi unit test menyeluruh untuk memastikan logika bisnis (filter bulan, pencarian multi-kata kunci, sorting nama/tanggal/kuantitas, dan kalkulasi dashboard statistik) bebas bug.

### Menjalankan Unit Tests:
```bash
npm test
```
*Hasil: 17/17 test suite lolos (PASS).*

### Menjalankan Pemeriksaan Tipe (TypeScript Type-Check):
```bash
npm run lint
```
*Memeriksa seluruh modul frontend dan backend tanpa menghasilkan output error.*

---

## 7. Build & Start Production

Untuk menjalankan dalam mode production di lingkungan server Node.js standar:

```bash
# 1. Compile frontend ke folder dist/
npm run build

# 2. Jalankan server production
NODE_ENV=production npm start
```
Server akan membaca file static dari `dist/` dan melayani API di port yang ditentukan.

---

## 8. Panduan Deployment Multi-Platform

### A. Deployment Menggunakan Docker & Docker Compose *(Paling Direkomendasikan)*

Aplikasi telah dilengkapi `Dockerfile` multi-stage (Node.js 20 Alpine) yang sangat ringan (~150MB) dan aman.

#### Menggunakan Docker Compose (1 Perintah):
```bash
docker compose up -d --build
```
Aplikasi langsung berjalan di port `3000`. Volume `hotel_it_data` akan menjaga database dan file upload tetap aman meskipun kontainer di-restart atau di-update.

#### Menggunakan Docker CLI Manual:
```bash
# 1. Build image
docker build -t hotel-it-inventory:latest .

# 2. Jalankan container dengan volume persistence
docker run -d \
  --name hotel_it_app \
  -p 3000:3000 \
  -e PORT=3000 \
  -e NODE_ENV=production \
  -e SECRET_CODE=INNRATTAN.BJM \
  -v hotel_it_data:/app/data \
  --restart unless-stopped \
  hotel-it-inventory:latest
```

---

### B. Deployment ke VPS (Ubuntu/Debian dengan PM2 & Nginx)

#### 1. Setup Node.js dan PM2 di VPS:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs nginx git
sudo npm install -g pm2 tsx
```

#### 2. Clone dan Siapkan Aplikasi:
```bash
cd /var/www
git clone https://github.com/username/hotel-it-inventory.git
cd hotel-it-inventory
npm ci
npm run build
```

#### 3. Konfigurasi PM2:
Jalankan aplikasi di background dengan auto-restart:
```bash
pm2 start server.ts --name "hotel-it" --interpreter tsx --env NODE_ENV=production,PORT=3000
pm2 save
pm2 startup
```

#### 4. Konfigurasi Reverse Proxy Nginx (`/etc/nginx/sites-available/hotel-it`):
```nginx
server {
    listen 80;
    server_name inventaris.hotelanda.com;

    client_max_body_size 25M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Aktifkan dan restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/hotel-it /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

### C. Deployment ke Render.com

1. Buat akun di **[Render.com](https://render.com/)**.
2. Klik **New +** > **Web Service**.
3. Hubungkan repositori GitHub/GitLab Anda.
4. Konfigurasikan Service:
   - **Environment**: `Node`
   - **Region**: Singapore / terdekat
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npx tsx server.ts`
5. Tambahkan **Environment Variables**:
   - `NODE_ENV` = `production`
   - `PORT` = `3000` *(Render akan menginjeksi port otomatis, server.ts membaca `process.env.PORT`)*
   - `SECRET_CODE` = `INNRATTAN.BJM`
   - `DATA_DIR` = `/var/data`
6. Tambahkan **Persistent Disk**:
   - Buka tab **Disks** di setting service Render.
   - Klik **Add Disk**.
   - Nama: `hotel-it-disk`
   - Mount Path: `/var/data`
   - Size: `1 GB` (cukup untuk database JSON & ribuan foto).
7. Klik **Create Web Service**. Render akan mem-build dan me-launch aplikasi.
8. Set Health Check Path: `/api/health`.

---

### D. Deployment ke Railway.app

1. Buat project baru di **[Railway.app](https://railway.app/)**.
2. Pilih **Deploy from GitHub repo**.
3. Railway otomatis mendeteksi aplikasi Node.js.
4. Buka tab **Variables** dan tambahkan:
   - `NODE_ENV` = `production`
   - `SECRET_CODE` = `INNRATTAN.BJM`
   - `DATA_DIR` = `/app/data`
5. Tambahkan Volume:
   - Klik menu **Settings** > **Volumes** > **Add Volume**.
   - Mount Path: `/app/data`
6. Selesai! Railway akan memberikan public URL ber-SSL otomatis.

---

### E. Deployment ke Vercel

Vercel dioptimalkan untuk frontend statis atau Serverless Functions:
1. **Frontend**: Buat build statis dengan `npm run build` yang menghasilkan output di `dist/`.
2. **Backend**: Jika ingin full serverless di Vercel, pisahkan route Express ke dalam direktori `api/` Vercel Functions (`api/index.ts`), atau host backend Node.js di Render/Railway dan arahkan environment variable `VITE_API_URL` di Vercel ke URL backend tersebut.
3. Karena database lokal flat-file membutuhkan persistent storage yang tidak didukung serverless ephemeral disk Vercel, disarankan menggunakan PostgreSQL (seperti Supabase / Neon) jika memilih arsitektur serverless murni Vercel.

---

## 9. Menghubungkan Database Eksternal & Object Storage (S3 / R2)

Jika aplikasi berkembang ke puluhan ribu inventaris, arsitektur modular ini sangat mudah dihubungkan ke database relasional:

### Menghubungkan ke PostgreSQL:
1. Pasang driver PostgreSQL:
   ```bash
   npm install pg @types/pg
   ```
2. Buat file koneksi database terpisah di `src/db/client.ts` menggunakan pooling koneksi `new pg.Pool({ connectionString: process.env.DATABASE_URL })`.
3. Ganti fungsi pembacaan `dbCache` pada controller dengan query SQL `SELECT * FROM inventory`.

### Menghubungkan ke Object Storage (AWS S3 / Cloudflare R2):
1. Pasang AWS SDK:
   ```bash
   npm install @aws-sdk/client-s3
   ```
2. Pada endpoint `POST /api/upload`, ganti penulisan file lokal `fs.writeFileSync` dengan perintah `PutObjectCommand` ke bucket S3/R2 dan kembalikan URL CDN publiknya.

---

## 10. Pemantauan Log & Pemecahan Masalah (Troubleshooting)

### Memeriksa Status Kesehatan Server:
Kunjungi endpoint:
```bash
curl http://localhost:3000/api/health
```
Respon sukses:
```json
{
  "status": "ok",
  "uptime": 1284,
  "timestamp": "2026-10-24T02:15:30.000Z",
  "nodeVersion": "v20.18.0",
  "environment": "production",
  "port": 3000,
  "stats": {
    "users": 3,
    "inventory": 8,
    "purchaseOrders": 8,
    "preloved": 8,
    "activities": 12
  }
}
```

### Masalah Umum & Solusi:

1. **Port 3000 Sudah Terpakai (`EADDRINUSE`)**:
   - Jalankan pada port lain: `PORT=3001 npm start`.
   - Atau matikan proses yang menggunakan port: `sudo lsof -i :3000` lalu `kill -9 <PID>`.

2. **Halaman Menghasilkan 404 Saat di-Refresh di Browser**:
   - Pada server production, pastikan Express menangani fallback routing dengan `app.get('*', (req, res) => res.sendFile(path.resolve(distPath, 'index.html')))` (sudah diimplementasikan di `server.ts`).

3. **Izin Akses File Upload / Database Gagal di Linux (`EACCES`)**:
   - Berikan hak akses pada folder data: `chmod -R 775 data/` atau ubah kepemilikan user: `chown -R $USER:$USER data/`.

4. **Container Docker Berstatus Unhealthy**:
   - Periksa log container: `docker logs hotel_it_inventory_app`.
   - Pastikan endpoint health check merespons: `docker exec -it hotel_it_inventory_app wget -qO- http://127.0.0.1:3000/api/health`.

---

## 🛡️ Lisensi & Hak Cipta
Hotel IT Department Management System — Dirancang dan dibangun dengan standar rekayasa perangkat lunak full-stack yang handal, modular, dan siap pakai.
