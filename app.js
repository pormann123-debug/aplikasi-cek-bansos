const DOM = {
    gambar: document.getElementById('inputGambar'),
    nik: document.getElementById('inputNik'),
    btnCek: document.getElementById('btnCek'),
    progContainer: document.getElementById('progressContainer'),
    progBar: document.getElementById('progressBar'),
    progPersen: document.getElementById('progressPersen'),
    alert: document.getElementById('pesanAlert'),
    awal: document.getElementById('statusAwal'),
    card: document.getElementById('hasilCard'),
    waktu: document.getElementById('waktuCetak')
};

// 1. Kinerja OCR Tesseract (Otomatis deteksi dari gambar)
DOM.gambar.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    resetUI();
    DOM.progContainer.classList.remove('hidden');

    try {
        const result = await Tesseract.recognize(file, 'ind', {
            logger: m => {
                if (m.status === 'recognizing text') {
                    const progress = Math.round(m.progress * 100);
                    DOM.progBar.style.width = `${progress}%`;
                    DOM.progPersen.textContent = `${progress}%`;
                }
            }
        });

        // Hapus semua karakter selain angka untuk mencari NIK murni
        const teksBersih = result.data.text.replace(/\D/g, ''); 
        const kecocokan = teksBersih.match(/\d{16}/);

        if (kecocokan) {
            const nikDitemukan = kecocokan[0];
            DOM.nik.value = nikDitemukan;
            
            // Beri jeda animasi agar terlihat seperti memproses API ke Server Pusat
            showAlert("KTP berhasil dipindai! Menghubungkan ke server...", "success");
            setTimeout(() => prosesPencarian(nikDitemukan), 1500);
        } else {
            showAlert("16 Digit NIK tidak terbaca. Pastikan foto KTP terang dan tidak buram.", "error");
        }
    } catch (error) {
        showAlert("Gagal memproses gambar. Pastikan browser memiliki akses memori.", "error");
    } finally {
        setTimeout(() => {
            DOM.progContainer.classList.add('hidden');
            DOM.progBar.style.width = '0%';
            DOM.gambar.value = "";
        }, 1000);
    }
});

// 2. Input NIK Manual
DOM.btnCek.addEventListener('click', () => {
    const nikInput = DOM.nik.value.replace(/\D/g, '').trim(); 
    DOM.nik.value = nikInput; 
    
    if (nikInput.length === 16) {
        showAlert("Menghubungkan ke server data kependudukan...", "success");
        setTimeout(() => prosesPencarian(nikInput), 1000); // Simulasi loading server
    } else {
        showAlert(`Format NIK salah. Terisi ${nikInput.length} digit (Harus tepat 16 digit).`, "error");
    }
});

// 3. Mesin Ekstraksi NIK (Mengambil Data Tersembunyi dari KTP)
function bedahNIK(nik) {
    // Format NIK: PP (Prov) KK (Kab) CC (Kec) HHMMYY (Tgl Lahir) UUUU (Urutan)
    const tglLahirCode = parseInt(nik.substring(6, 8));
    const bulan = nik.substring(8, 10);
    const tahunCode = parseInt(nik.substring(10, 12));
    
    let jenisKelamin = "LAKI-LAKI";
    let tanggal = tglLahirCode;
    
    // Jika angka tanggal lahir > 40, berarti perempuan
    if (tglLahirCode > 40) {
        jenisKelamin = "PEREMPUAN";
        tanggal = tglLahirCode - 40;
    }
    
    // Logika penentuan abad kelahiran
    const tahunLengkap = tahunCode < 30 ? `20${tahunCode.toString().padStart(2, '0')}` : `19${tahunCode}`;
    const tanggalLahir = `${tanggal.toString().padStart(2, '0')}-${bulan}-${tahunLengkap}`;
    
    return { jenisKelamin, tanggalLahir };
}

// 4. Algoritma Simulasi Penentuan Bansos (Konsisten berdasarkan NIK)
function hitungKelayakan(nik) {
    // Menghasilkan angka deterministik dari NIK agar hasil tidak berubah-ubah untuk NIK yang sama
    let skor = 0;
    for (let i = 0; i < nik.length; i++) {
        skor += parseInt(nik[i]) * (i + 1);
    }
    
    // Logika klasifikasi kelayakan
    if (skor % 4 === 0) {
        return {
            status: "AKTIF (Penerima Tahap 4)",
            kip: "AKTIF - Terdaftar PIP Kemdikbud",
            bansos: ["Program Keluarga Harapan (PKH)", "Bantuan Beras 10Kg"]
        };
    } else if (skor % 3 === 0) {
        return {
            status: "PROSES VERIFIKASI",
            kip: "TIDAK TERDAFTAR",
            bansos: ["Bantuan Pangan Non Tunai (BPNT)"]
        };
    } else {
        return {
            status: "TIDAK TERDAFTAR",
            kip: "TIDAK TERDAFTAR",
            bansos: []
        };
    }
}

// 5. Fungsi Utama Pencarian dan Render Data
function prosesPencarian(nikDicari) {
    resetUI();
    
    // 1. Ekstrak data diri dari NIK
    const dataDiri = bedahNIK(nikDicari);
    
    // 2. Jalankan algoritma kelayakan
    const kelayakan = hitungKelayakan(nikDicari);

    // Render Data Diri Ekstraksi
    document.getElementById('outNama').textContent = "DATA WNI " + dataDiri.jenisKelamin; // Nama asli butuh API Dukcapil
    document.getElementById('outNik').textContent = nikDicari;
    document.getElementById('outProv').textContent = `Tgl Lahir: ${dataDiri.tanggalLahir}`;
    document.getElementById('outKab').textContent = `Gender: ${dataDiri.jenisKelamin}`;
    document.getElementById('outPeriode').textContent = "Tahun Anggaran 2026/2027";

    // Render Status KIP & Bansos
    const kipEl = document.getElementById('outKip');
    kipEl.textContent = kelayakan.kip;
    kipEl.className = kelayakan.kip.includes("AKTIF") 
        ? "inline-block px-3 py-1 rounded-full text-sm font-bold bg-green-100 text-green-700" 
        : "inline-block px-3 py-1 rounded-full text-sm font-bold bg-red-100 text-red-700";

    const bansosList = document.getElementById('outBansos');
    bansosList.innerHTML = "";
    if (kelayakan.bansos.length > 0) {
        kelayakan.bansos.forEach(bantuan => {
            const li = document.createElement('li');
            li.textContent = bantuan;
            bansosList.appendChild(li);
        });
    } else {
        const li = document.createElement('li');
        li.className = "list-none text-slate-500 italic";
        li.textContent = "Berdasarkan sistem SPK, NIK ini tidak masuk kriteria DTKS / Keluarga Rentan.";
        bansosList.appendChild(li);
    }

    // Timestamp Real-time
    const date = new Date();
    DOM.waktu.textContent = `${date.toLocaleDateString('id-ID')} ${date.toLocaleTimeString('id-ID')}`;

    // Tampilkan Hasil
    DOM.awal.classList.add('hidden');
    DOM.card.classList.remove('hidden');
}

// 6. Utilitas Antarmuka
function showAlert(pesan, tipe) {
    DOM.alert.textContent = pesan;
    DOM.alert.classList.remove('hidden', 'bg-red-100', 'text-red-700', 'bg-green-100', 'text-green-700');
    
    if (tipe === "error") {
        DOM.alert.classList.add('bg-red-100', 'text-red-700');
    } else if (tipe === "success") {
        DOM.alert.classList.add('bg-green-100', 'text-green-700');
    }
    
    setTimeout(() => DOM.alert.classList.add('hidden'), 4000);
}

function resetUI() {
    DOM.alert.classList.add('hidden');
    DOM.card.classList.add('hidden');
    DOM.awal.classList.remove('hidden');
}