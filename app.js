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

let databaseBansos = [];

// 1. Inisialisasi Database
async function initDatabase() {
    try {
        const response = await fetch('data.json');
        databaseBansos = await response.json();
    } catch (error) {
        showAlert("Koneksi database gagal. Pastikan aplikasi dijalankan via server (Vercel/Live Server).", "error");
    }
}
initDatabase();

// 2. Kinerja OCR Tesseract dengan Progress Bar & Regex Lanjutan
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

        // Preprocessing Teks: Hapus semua karakter selain angka
        const teksKotor = result.data.text;
        const teksBersih = teksKotor.replace(/\D/g, ''); 
        
        // Cari urutan 16 digit angka dari teks yang sudah dibersihkan
        const kecocokan = teksBersih.match(/\d{16}/);

        if (kecocokan) {
            const nikDitemukan = kecocokan[0];
            DOM.nik.value = nikDitemukan;
            prosesPencarian(nikDitemukan);
            showAlert("KTP berhasil dipindai!", "success");
        } else {
            showAlert("16 Digit NIK tidak terbaca. Pastikan foto terang dan fokus, atau input manual.", "error");
        }
    } catch (error) {
        showAlert("Gagal memproses gambar OCR.", "error");
    } finally {
        setTimeout(() => {
            DOM.progContainer.classList.add('hidden');
            DOM.progBar.style.width = '0%';
            DOM.gambar.value = "";
        }, 1000);
    }
});

// 3. Validasi Input Manual
DOM.btnCek.addEventListener('click', () => {
    const nikInput = DOM.nik.value.replace(/\D/g, '').trim(); 
    DOM.nik.value = nikInput; 
    
    if (nikInput.length === 16) {
        prosesPencarian(nikInput);
    } else {
        showAlert(`Format NIK salah. Terisi ${nikInput.length} digit (Harus 16 digit).`, "error");
    }
});

// 4. Logika Pencarian & Render Data
function prosesPencarian(nikDicari) {
    resetUI();
    const dataWarga = databaseBansos.find(penduduk => penduduk.nik === nikDicari);

    if (dataWarga) {
        // Render ke Antarmuka
        document.getElementById('outNama').textContent = dataWarga.nama;
        document.getElementById('outNik').textContent = dataWarga.nik;
        document.getElementById('outProv').textContent = dataWarga.provinsi;
        document.getElementById('outKab').textContent = dataWarga.kabupaten;
        document.getElementById('outPeriode').textContent = dataWarga.periode_salur;

        // Styling Status KIP
        const kipEl = document.getElementById('outKip');
        kipEl.textContent = dataWarga.status_kip;
        if (dataWarga.status_kip.includes("AKTIF")) {
            kipEl.className = "inline-block px-3 py-1 rounded-full text-sm font-bold bg-green-100 text-green-700";
        } else {
            kipEl.className = "inline-block px-3 py-1 rounded-full text-sm font-bold bg-red-100 text-red-700";
        }

        // Render List Bansos
        const bansosList = document.getElementById('outBansos');
        bansosList.innerHTML = "";
        if (dataWarga.bantuan_lain.length > 0) {
            dataWarga.bantuan_lain.forEach(bantuan => {
                const li = document.createElement('li');
                li.textContent = bantuan;
                bansosList.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.className = "list-none text-slate-500 italic";
            li.textContent = "Tidak ada riwayat penerimaan bantuan lain.";
            bansosList.appendChild(li);
        }

        // Waktu Cetak (Timestamp real-time)
        const date = new Date();
        DOM.waktu.textContent = `${date.toLocaleDateString('id-ID')} ${date.toLocaleTimeString('id-ID')}`;

        // Simpan ke Local Storage
        localStorage.setItem('cekBansosTerakhir', nikDicari);

        // Tampilkan Card
        DOM.awal.classList.add('hidden');
        DOM.card.classList.remove('hidden');
    } else {
        showAlert(`Data tidak ditemukan untuk NIK: ${nikDicari}`, "error");
    }
}

// 5. Utilitas Alert & UI
function showAlert(pesan, tipe) {
    DOM.alert.textContent = pesan;
    DOM.alert.classList.remove('hidden', 'bg-red-100', 'text-red-700', 'bg-green-100', 'text-green-700');
    
    if (tipe === "error") {
        DOM.alert.classList.add('bg-red-100', 'text-red-700');
    } else if (tipe === "success") {
        DOM.alert.classList.add('bg-green-100', 'text-green-700');
    }
    
    // Sembunyikan otomatis setelah 5 detik
    setTimeout(() => {
        DOM.alert.classList.add('hidden');
    }, 5000);
}

function resetUI() {
    DOM.alert.classList.add('hidden');
    DOM.card.classList.add('hidden');
    DOM.awal.classList.remove('hidden');
}

// 6. Cek Riwayat di LocalStorage saat dimuat (Opsional)
window.addEventListener('DOMContentLoaded', () => {
    const nikTerakhir = localStorage.getItem('cekBansosTerakhir');
    if (nikTerakhir) {
        DOM.nik.value = nikTerakhir;
    }
});