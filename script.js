// ========== KONFIGURASI SUPABASE ==========
const SUPABASE_URL = 'https://ciyluvqtxdydnjnaisxl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpeWx1dnF0eGR5ZG5qbmFpc3hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4NTAwNDUsImV4cCI6MjEwMDQyNjA0NX0.UozVCSkCO2CckOxPAVcuJFLcwoP-amydS4jTfcEdsY0';

// ========== STATE ==========
let currentUser = null;
let currentProfile = null;
let todayFoods = [];
let currentFilter = 'all';

// ========== DOM ELEMENTS ==========
const loginSection = document.getElementById('loginSection');
const appSection = document.getElementById('appSection');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const logoutBtn = document.getElementById('logoutBtn');

const userName = document.getElementById('userName');
const targetKaloriInput = document.getElementById('targetKalori');
const setTargetBtn = document.getElementById('setTargetBtn');
const targetKaloriDisplay = document.getElementById('targetKaloriDisplay');

const totalKalori = document.getElementById('totalKalori');
const totalProtein = document.getElementById('totalProtein');
const totalLemak = document.getElementById('totalLemak');
const totalKarbo = document.getElementById('totalKarbo');

const namaMakanan = document.getElementById('namaMakanan');
const porsiMakanan = document.getElementById('porsiMakanan');
const tambahMakananBtn = document.getElementById('tambahMakananBtn');
const daftarMakanan = document.getElementById('daftarMakanan');

const beratBadan = document.getElementById('beratBadan');
const simpanBeratBtn = document.getElementById('simpanBeratBtn');

// ========== FUNGSI AUTENTIKASI ==========

// Cek session saat halaman dimuat
async function checkSession() {
    const session = JSON.parse(localStorage.getItem('supabaseSession'));
    if (session) {
        currentUser = session.user;
        showApp();
        await loadProfile();
        await loadTodayFoods();
    } else {
        showLogin();
    }
}

// Login
async function login(email, password) {
    try {
        const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.msg || 'Login gagal');
        }

        const data = await response.json();
        currentUser = data.user;
        localStorage.setItem('supabaseSession', JSON.stringify(data));
        showApp();
        await loadProfile();
        await loadTodayFoods();
    } catch (error) {
        alert('❌ Login gagal: ' + error.message);
    }
}

// Register
async function register(email, password) {
    try {
        const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.msg || 'Registrasi gagal');
        }

        const data = await response.json();
        currentUser = data.user;
        localStorage.setItem('supabaseSession', JSON.stringify(data));
        showApp();
        await loadProfile();
        await loadTodayFoods();
    } catch (error) {
        alert('❌ Registrasi gagal: ' + error.message);
    }
}

// Logout
async function logout() {
    try {
        await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${currentUser ? currentUser.id : ''}`
            }
        });
        localStorage.removeItem('supabaseSession');
        currentUser = null;
        showLogin();
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// ========== FUNGSI PROFIL & TARGET ==========

async function loadProfile() {
    if (!currentUser) return;

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/profil_pengguna?user_id=eq.${currentUser.id}&select=*`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${currentUser.id}`
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                // Profil belum ada, buat default
                await createDefaultProfile();
                return;
            }
            throw new Error('Gagal mengambil profil');
        }

        const data = await response.json();
        if (data.length > 0) {
            currentProfile = data[0];
            targetKaloriInput.value = currentProfile.target_kalori;
            targetKaloriDisplay.textContent = currentProfile.target_kalori;
            userName.textContent = currentUser.email.split('@')[0];
        } else {
            await createDefaultProfile();
        }
    } catch (error) {
        console.error('Error load profile:', error);
        await createDefaultProfile();
    }
}

async function createDefaultProfile() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/profil_pengguna`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${currentUser.id}`
            },
            body: JSON.stringify({
                user_id: currentUser.id,
                target_kalori: 2000
            })
        });

        if (!response.ok) throw new Error('Gagal membuat profil default');
        await loadProfile();
    } catch (error) {
        console.error('Error create profile:', error);
    }
}

async function updateTargetKalori(target) {
    if (!currentUser) return;

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/profil_pengguna?user_id=eq.${currentUser.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${currentUser.id}`
            },
            body: JSON.stringify({
                target_kalori: target,
                updated_at: new Date().toISOString()
            })
        });

        if (!response.ok) throw new Error('Gagal update target');
        targetKaloriDisplay.textContent = target;
        alert('✅ Target kalori berhasil diupdate!');
    } catch (error) {
        alert('❌ Gagal update target: ' + error.message);
    }
}

// ========== FUNGSI MAKANAN ==========

async function loadTodayFoods() {
    if (!currentUser) return;

    try {
        const today = new Date().toISOString().split('T')[0];
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/catatan_makanan?user_id=eq.${currentUser.id}&tanggal=eq.${today}&select=*,makanan(*)`,
            {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${currentUser.id}`
                }
            }
        );

        if (!response.ok) throw new Error('Gagal mengambil catatan makanan');

        const data = await response.json();
        todayFoods = data;
        renderFoods(data);
        updateSummary(data);
    } catch (error) {
        console.error('Error load foods:', error);
        daftarMakanan.innerHTML = '<p class="empty-state">❌ Gagal memuat data makanan</p>';
    }
}

async function addFood(nama, porsi = 1) {
    if (!currentUser) {
        alert('Silakan login terlebih dahulu!');
        return;
    }

    // Cari makanan di database
    try {
        const searchResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/makanan?nama=ilike.%${encodeURIComponent(nama)}%&limit=1`,
            {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${currentUser.id}`
                }
            }
        );

        if (!searchResponse.ok) throw new Error('Gagal mencari makanan');

        const searchResult = await searchResponse.json();

        if (searchResult.length === 0) {
            // Makanan tidak ditemukan, tawarkan tambah manual
            if (confirm(`Makanan "${nama}" tidak ditemukan. Apakah Anda ingin menambahkannya ke database?`)) {
                const kalori = prompt('Masukkan jumlah kalori untuk 1 porsi:');
                if (kalori === null) return;
                const protein = prompt('Masukkan protein (gram):') || 0;
                const lemak = prompt('Masukkan lemak (gram):') || 0;
                const karbo = prompt('Masukkan karbohidrat (gram):') || 0;

                const newFood = await createFood(nama, parseInt(kalori), parseFloat(protein), parseFloat(lemak), parseFloat(karbo));
                if (newFood) {
                    await saveFoodEntry(newFood.id, porsi);
                }
            }
            return;
        }

        // Jika makanan ditemukan, langsung simpan
        await saveFoodEntry(searchResult[0].id, porsi);

    } catch (error) {
        alert('❌ Gagal menambah makanan: ' + error.message);
    }
}

async function createFood(nama, kalori, protein, lemak, karbo) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/makanan`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${currentUser.id}`
            },
            body: JSON.stringify({
                nama: nama,
                kalori: kalori,
                protein: protein || 0,
                lemak: lemak || 0,
                karbo: karbo || 0
            })
        });

        if (!response.ok) throw new Error('Gagal menambah makanan baru');

        const data = await response.json();
        alert('✅ Makanan berhasil ditambahkan ke database!');
        return data[0];
    } catch (error) {
        alert('❌ Gagal menambah makanan: ' + error.message);
        return null;
    }
}

async function saveFoodEntry(makananId, porsi) {
    try {
        const today = new Date().toISOString().split('T')[0];
        const response = await fetch(`${SUPABASE_URL}/rest/v1/catatan_makanan`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${currentUser.id}`
            },
            body: JSON.stringify({
                user_id: currentUser.id,
                makanan_id: makananId,
                porsi: porsi,
                tanggal: today
            })
        });

        if (!response.ok) throw new Error('Gagal menyimpan catatan makanan');

        await loadTodayFoods();
        alert('✅ Makanan berhasil dicatat!');
    } catch (error) {
        alert('❌ Gagal menyimpan catatan: ' + error.message);
    }
}

async function deleteFoodEntry(entryId) {
    if (!confirm('Yakin ingin menghapus catatan ini?')) return;

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/catatan_makanan?id=eq.${entryId}`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${currentUser.id}`
            }
        });

        if (!response.ok) throw new Error('Gagal menghapus catatan');

        await loadTodayFoods();
        alert('✅ Catatan berhasil dihapus!');
    } catch (error) {
        alert('❌ Gagal menghapus: ' + error.message);
    }
}

// ========== FUNGSI BERAT BADAN ==========

async function saveBerat(berat) {
    if (!currentUser) {
        alert('Silakan login terlebih dahulu!');
        return;
    }

    try {
        const today = new Date().toISOString().split('T')[0];
        const response = await fetch(`${SUPABASE_URL}/rest/v1/riwayat_berat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${currentUser.id}`
            },
            body: JSON.stringify({
                user_id: currentUser.id,
                berat: berat,
                tanggal: today
            })
        });

        if (!response.ok) throw new Error('Gagal menyimpan berat badan');

        alert('✅ Berat badan berhasil disimpan!');
    } catch (error) {
        alert('❌ Gagal menyimpan berat: ' + error.message);
    }
}

// ========== FUNGSI TAMPILAN ==========

function renderFoods(foods) {
    if (foods.length === 0) {
        daftarMakanan.innerHTML = '<p class="empty-state">📭 Belum ada makanan yang dicatat hari ini.</p>';
        return;
    }

    daftarMakanan.innerHTML = '';
    foods.forEach(food => {
        const div = document.createElement('div');
        div.className = 'catatan-item';
        div.innerHTML = `
            <div class="info">
                <span class="nama">${food.makanan.nama}</span>
                <span class="detail">
                    ${food.porsi} porsi · ${Math.round(food.makanan.kalori * food.porsi)} kkal · 
                    P: ${(food.makanan.protein * food.porsi).toFixed(1)}g · 
                    L: ${(food.makanan.lemak * food.porsi).toFixed(1)}g · 
                    K: ${(food.makanan.karbo * food.porsi).toFixed(1)}g
                </span>
            </div>
            <div class="aksi">
                <button class="hapus-btn" data-id="${food.id}">Hapus</button>
            </div>
        `;
        daftarMakanan.appendChild(div);
    });

    // Event listener hapus
    document.querySelectorAll('.hapus-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.dataset.id;
            deleteFoodEntry(id);
        });
    });
}

function updateSummary(foods) {
    let totalKal = 0, totalProt = 0, totalLem = 0, totalKarb = 0;

    foods.forEach(food => {
        const porsi = food.porsi || 1;
        totalKal += food.makanan.kalori * porsi;
        totalProt += (food.makanan.protein || 0) * porsi;
        totalLem += (food.makanan.lemak || 0) * porsi;
        totalKarb += (food.makanan.karbo || 0) * porsi;
    });

    totalKalori.textContent = Math.round(totalKal);
    totalProtein.textContent = totalProt.toFixed(1);
    totalLemak.textContent = totalLem.toFixed(1);
    totalKarbo.textContent = totalKarb.toFixed(1);
}

function showLogin() {
    loginSection.style.display = 'block';
    appSection.style.display = 'none';
}

function showApp() {
    loginSection.style.display = 'none';
    appSection.style.display = 'block';
    if (currentUser) {
        userName.textContent = currentUser.email.split('@')[0];
    }
}

// ========== EVENT LISTENER ==========

// Login & Register
loginBtn.addEventListener('click', function() {
    const email = loginEmail.value.trim();
    const password = loginPassword.value.trim();
    if (email && password) {
        login(email, password);
    } else {
        alert('Masukkan email dan password!');
    }
});

registerBtn.addEventListener('click', function() {
    const email = loginEmail.value.trim();
    const password = loginPassword.value.trim();
    if (email && password) {
        register(email, password);
    } else {
        alert('Masukkan email dan password!');
    }
});

logoutBtn.addEventListener('click', logout);

// Target Kalori
setTargetBtn.addEventListener('click', function() {
    const target = parseInt(targetKaloriInput.value);
    if (target > 0) {
        updateTargetKalori(target);
    } else {
        alert('Masukkan target kalori yang valid!');
    }
});

// Tambah Makanan
tambahMakananBtn.addEventListener('click', function() {
    const nama = namaMakanan.value.trim();
    const porsi = parseFloat(porsiMakanan.value) || 1;
    if (nama) {
        addFood(nama, porsi);
        namaMakanan.value = '';
        porsiMakanan.value = '1';
    } else {
        alert('Masukkan nama makanan!');
    }
});

// Simpan Berat Badan
simpanBeratBtn.addEventListener('click', function() {
    const berat = parseFloat(beratBadan.value);
    if (berat > 0) {
        saveBerat(berat);
        beratBadan.value = '';
    } else {
        alert('Masukkan berat badan yang valid!');
    }
});

// ========== INISIALISASI ==========
document.addEventListener('DOMContentLoaded', function() {
    checkSession();
});