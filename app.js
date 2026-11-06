const inputGambar = document.getElementById('inputGambar');
const inputNik = document.getElementById('inputNik');
const btnCek = document.getElementById('btnCek');
const statusScan = document.getElementById('statusScan');
const hasilCard = document.getElementById('hasilCard');
const pesanError = document.getElementById('pesanError');

let dataPenduduk = [];

// 1. Ambil data JSON lokal
async function muatData() {
    try {
        const response = await fetch('data.json');
        dataPenduduk = await response.json();
    } catch (error) {
        console.error("Gagal memuat data.json:", error);
    }
}
muatData();

// 2. Fitur Scan KTP (Tesseract OCR)
inputGambar.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    statusScan.classList.remove('hidden');
    hasilCard.classList.add('hidden');
    pesanError.classList.add('hidden');

    try {
        const result = await Tesseract.recognize(file, 'ind');
        const teksHasil = result.data.text;
        
        // Cari 16 digit angka menggunakan Regex
        const regexNik = /\b\d{16}\b/;
        const cocok = teksHasil.match(regexNik);

        if (cocok) {
            const nikDitemukan = cocok[0];
            inputNik.value = nikDitemukan; 
            cekData(nikDitemukan); 
        } else {
            tampilkanError("Gagal membaca NIK. Pastikan foto KTP jelas, tidak silau, dan fokus.");
        }
    } catch (error) {
        tampilkanError("Terjadi kesalahan saat memproses gambar.");
    } finally {
        statusScan.classList.add('hidden');
        inputGambar.value = ""; 
    }
});

// 3. Fitur Cek Manual
btnCek.addEventListener('click', () => {
    const nik = inputNik.value.trim();
    if (nik.length === 16) {
        cekData(nik);
    } else {
        tampilkanError("NIK harus tepat 16 digit angka.");
    }
});

// 4. Logika Pencarian
function cekData(nikDicari) {
    hasilCard.classList.add('hidden');
    pesanError.classList.add('hidden');

    const hasil = dataPenduduk.find(orang => orang.nik === nikDicari);

    if (hasil) {
        document.getElementById('outNama').textContent = hasil.nama;
        document.getElementById('outNik').textContent = hasil.nik;
        document.getElementById('outKip').textContent = hasil.status_kip;
        
        document.getElementById('outBansos').textContent = 
            hasil.bantuan_lain.length > 0 ? hasil.bantuan_lain.join(', ') : "Tidak ada";

        hasilCard.classList.remove('hidden');
    } else {
        tampilkanError("Data NIK tidak ditemukan dalam sistem.");
    }
}

function tampilkanError(pesan) {
    pesanError.textContent = pesan;
    pesanError.classList.remove('hidden');
}