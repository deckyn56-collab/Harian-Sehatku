// ========== KONFIGURASI SUPABASE ==========
const SUPABASE_URL = 'https://ciyluvqtxdydnjnaisxl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpeWx1dnF0eGR5ZG5qbmFpc3hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4NTAwNDUsImV4cCI6MjEwMDQyNjA0NX0.UozVCSkCO2CckOxPAVcuJFLcwoP-amydS4jTfcEdsY0';

// Helper: Buat URL dengan apikey
function buildUrl(path, params = {}) {
    const url = new URL(path, SUPABASE_URL);
    url.searchParams.set('apikey', SUPABASE_ANON_KEY);
    Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
            url.searchParams.set(key, params[key]);
        }
    });
    return url.toString();
}

// ========== STATE ==========
let currentUser = null;
let currentProfile = null;
let todayFoods = [];
let chatHistory = [];
let currentImageBase64 = null;
let beratChart = null;

// ========== AMBIL ACCESS TOKEN ==========
function getAccessToken() {
    const session = JSON.parse(localStorage.getItem('supabaseSession'));
    if (session && session.access_token) {
        return session.access_token;
    }
    return null;
}

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

const cariResepBtn = document.getElementById('cariResepBtn');
const bahanResep = document.getElementById('bahanResep');
const hasilResep = document.getElementById('hasilResep');

// ========== FUNGSI AUTENTIKASI ==========

async function checkSession() {
    try {
        const session = JSON.parse(localStorage.getItem('supabaseSession'));
        if (session && session.user) {
            currentUser = session.user;
            showApp();
            await loadProfile();
            await loadTodayFoods();
            await loadWeightChart();
        } else {
            showLogin();
        }
    } catch (error) {
        console.error('Error checkSession:', error);
        showLogin();
    }
}

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
        console.log('🔑 Login berhasil');
        localStorage.setItem('supabaseSession', JSON.stringify(data));
        currentUser = data.user;
        showApp();
        await loadProfile();
        await loadTodayFoods();
        await loadWeightChart();
        alert('✅ Login berhasil!');

    } catch (error) {
        alert('❌ Login gagal: ' + error.message);
        console.error('Login error:', error);
    }
}

async function register(email, password, confirmPassword) {
    if (password !== confirmPassword) {
        alert('❌ Password dan konfirmasi password tidak cocok!');
        return;
    }

    if (password.length < 6) {
        alert('❌ Password minimal 6 karakter!');
        return;
    }

    const registerBtn = document.getElementById('registerBtn');
    const originalText = registerBtn.textContent;
    registerBtn.textContent = '⏳ Mendaftar...';
    registerBtn.disabled = true;

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
        console.log('📝 Register berhasil');
        localStorage.setItem('supabaseSession', JSON.stringify(data));
        currentUser = data.user;
        alert('✅ Pendaftaran berhasil! Email verifikasi telah dikirim ke ' + email);
        
        document.getElementById('registerEmail').value = '';
        document.getElementById('registerPassword').value = '';
        document.getElementById('registerConfirmPassword').value = '';
        
        showApp();
        await loadProfile();
        await loadTodayFoods();
        await loadWeightChart();

    } catch (error) {
        alert('❌ Registrasi gagal: ' + error.message);
    } finally {
        registerBtn.textContent = originalText;
        registerBtn.disabled = false;
    }
}

async function logout() {
    try {
        const token = getAccessToken();
        if (token) {
            await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${token}`
                }
            });
        }
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

    const token = getAccessToken();
    if (!token) {
        console.error('Token tidak ditemukan');
        return;
    }

    try {
        const url = buildUrl('/rest/v1/profil_pengguna', {
            user_id: `eq.${currentUser.id}`,
            select: '*'
        });

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
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
    const token = getAccessToken();
    if (!token) return;

    try {
        const url = buildUrl('/rest/v1/profil_pengguna');

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
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

// ========== SET TARGET KALORI ==========
if (setTargetBtn) {
    setTargetBtn.addEventListener('click', async function() {
        const target = parseInt(targetKaloriInput.value);

        if (isNaN(target) || target <= 0) {
            alert('⚠️ Masukkan target kalori yang valid (angka positif)!');
            return;
        }

        if (!currentUser) {
            alert('⚠️ Silakan login terlebih dahulu!');
            return;
        }

        const token = getAccessToken();
        if (!token) {
            alert('⚠️ Sesi Anda habis. Silakan login ulang.');
            return;
        }

        try {
            const url = buildUrl('/rest/v1/profil_pengguna', {
                user_id: `eq.${currentUser.id}`
            });

            const response = await fetch(url, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    target_kalori: target,
                    updated_at: new Date().toISOString()
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            targetKaloriDisplay.textContent = target;
            alert('✅ Target kalori berhasil diupdate!');
            await loadProfile();
            await loadTodayFoods();

        } catch (error) {
            alert('❌ Gagal update target: ' + error.message);
            console.error('Error detail:', error);
        }
    });
}

// ========== SIMPAN BERAT BADAN ==========
if (simpanBeratBtn) {
    simpanBeratBtn.addEventListener('click', async function() {
        const berat = parseFloat(beratBadan.value);

        if (isNaN(berat) || berat <= 0) {
            alert('⚠️ Masukkan berat badan yang valid (angka positif, contoh: 65)!');
            return;
        }

        if (!currentUser) {
            alert('⚠️ Silakan login terlebih dahulu!');
            return;
        }

        const token = getAccessToken();
        if (!token) {
            alert('⚠️ Sesi Anda habis. Silakan login ulang.');
            return;
        }

        try {
            const today = new Date().toISOString().split('T')[0];
            const url = buildUrl('/rest/v1/riwayat_berat');

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    user_id: currentUser.id,
                    berat: berat,
                    tanggal: today
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            alert('✅ Berat badan berhasil disimpan!');
            beratBadan.value = '';
            await loadWeightChart();

        } catch (error) {
            alert('❌ Gagal menyimpan berat: ' + error.message);
            console.error('Error detail:', error);
        }
    });
}

// ========== FUNGSI MAKANAN ==========

async function loadTodayFoods() {
    if (!currentUser) return;

    const token = getAccessToken();
    if (!token) {
        daftarMakanan.innerHTML = '<p class="empty-state">❌ Sesi habis. Silakan login ulang.</p>';
        return;
    }

    try {
        const today = new Date().toISOString().split('T')[0];
        const url = buildUrl('/rest/v1/catatan_makanan', {
            user_id: `eq.${currentUser.id}`,
            tanggal: `eq.${today}`,
            select: '*,makanan(*)'
        });

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

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
        alert('Silakan login ter dahulu!');
        return;
    }

    const token = getAccessToken();
    if (!token) {
        alert('⚠️ Sesi Anda habis. Silakan login ulang.');
        return;
    }

    try {
        const searchUrl = buildUrl('/rest/v1/makanan', {
            nama: `ilike.%${encodeURIComponent(nama)}%`,
            limit: 1
        });

        const searchResponse = await fetch(searchUrl, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!searchResponse.ok) {
            const errorText = await searchResponse.text();
            throw new Error(`HTTP ${searchResponse.status}: ${errorText}`);
        }

        const searchResult = await searchResponse.json();

        if (searchResult.length === 0) {
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

        await saveFoodEntry(searchResult[0].id, porsi);

    } catch (error) {
        alert('❌ Gagal menambah makanan: ' + error.message);
    }
}

async function createFood(nama, kalori, protein, lemak, karbo) {
    const token = getAccessToken();
    if (!token) throw new Error('Sesi habis');

    try {
        const url = buildUrl('/rest/v1/makanan');

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
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
    const token = getAccessToken();
    if (!token) throw new Error('Sesi habis');

    try {
        const today = new Date().toISOString().split('T')[0];
        const url = buildUrl('/rest/v1/catatan_makanan');

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
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

    const token = getAccessToken();
    if (!token) {
        alert('⚠️ Sesi Anda habis. Silakan login ulang.');
        return;
    }

    try {
        const url = buildUrl('/rest/v1/catatan_makanan', {
            id: `eq.${entryId}`
        });

        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Gagal menghapus catatan');

        await loadTodayFoods();
        alert('✅ Catatan berhasil dihapus!');
    } catch (error) {
        alert('❌ Gagal menghapus: ' + error.message);
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

// ========== TAB LOGIN / REGISTER ==========
function switchTab(tab) {
    const loginForm = document.getElementById('formLogin');
    const registerForm = document.getElementById('formRegister');
    const loginTab = document.getElementById('tabLoginBtn');
    const registerTab = document.getElementById('tabRegisterBtn');
    const subtitle = document.getElementById('formSubtitle');

    if (tab === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        subtitle.textContent = 'Masuk untuk mulai mencatat';
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        subtitle.textContent = 'Daftar akun baru';
    }
}

// ========== GRAFIK PROGRES BERAT BADAN ==========
async function loadWeightChart() {
    if (!currentUser) return;

    const token = getAccessToken();
    if (!token) return;

    try {
        const url = buildUrl('/rest/v1/riwayat_berat', {
            user_id: `eq.${currentUser.id}`,
            order: 'tanggal.asc',
            select: 'tanggal,berat'
        });

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Gagal mengambil data berat');

        const data = await response.json();

        const canvas = document.getElementById('beratChart');
        if (data.length === 0) {
            canvas.style.display = 'none';
            return;
        }

        canvas.style.display = 'block';

        const labels = data.map(d => new Date(d.tanggal).toLocaleDateString('id-ID'));
        const weights = data.map(d => d.berat);

        const ctx = canvas.getContext('2d');

        if (beratChart) {
            beratChart.destroy();
        }

        beratChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Berat Badan (kg)',
                    data: weights,
                    borderColor: '#A8C3A0',
                    backgroundColor: 'rgba(168, 195, 160, 0.1)',
                    tension: 0.3,
                    fill: true,
                    pointBackgroundColor: '#A8C3A0',
                    pointBorderColor: '#FFFFFF'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.parsed.y + ' kg';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        grid: { color: 'rgba(168, 195, 160, 0.1)' }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });

    } catch (error) {
        console.error('Error load chart:', error);
    }
}

// ========== FUNGSI GEMINI ==========
async function callGemini(message, imageBase64 = null, history = []) {
    try {
        console.log('📤 Memanggil Gemini API...');
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                imageBase64: imageBase64,
                history: history
            })
        });

        console.log('📥 Response status:', response.status);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Gemini berhasil dipanggil');
        return data.reply;

    } catch (error) {
        console.error('❌ Gemini error:', error);
        throw error;
    }
}

// ========== REKOMENDASI MENU AI ==========
const rekomendasiMenuBtn = document.getElementById('rekomendasiMenuBtn');
if (rekomendasiMenuBtn) {
    rekomendasiMenuBtn.addEventListener('click', async function() {
        console.log('🔄 Tombol Rekomendasi diklik');
        const btn = this;
        const hasilDiv = document.getElementById('hasilRekomendasi');
        
        if (!currentUser) {
            alert('Silakan login ter dahulu!');
            return;
        }

        const totalKaloriSekarang = parseInt(document.getElementById('totalKalori').textContent) || 0;
        const targetKalori = parseInt(targetKaloriDisplay.textContent) || 2000;
        const sisaKalori = targetKalori - totalKaloriSekarang;

        if (sisaKalori <= 0) {
            hasilDiv.innerHTML = '<p class="empty-state">✅ Kalori hari ini sudah terpenuhi! Istirahat atau olahraga ringan.</p>';
            return;
        }

        btn.textContent = '⏳ Menghasilkan...';
        btn.disabled = true;
        hasilDiv.innerHTML = '<p class="empty-state">🤖 AI sedang menyusun menu sehat untuk Anda...</p>';

        try {
            const reply = await callGemini(
                `Saya memiliki sisa kalori ${sisaKalori} kkal untuk hari ini. 
                 Berikan rekomendasi menu untuk sarapan, makan siang, dan makan malam. 
                 Total kalori tidak boleh melebihi ${sisaKalori} kkal.
                 Respons harus dalam format JSON dengan struktur:
                 {
                     "sarapan": { "nama": "...", "kalori": angka },
                     "makan_siang": { "nama": "...", "kalori": angka },
                     "makan_malam": { "nama": "...", "kalori": angka },
                     "total": angka
                 }`
            );

            const cleanJson = reply.replace(/```json\s*|\s*```/g, '').trim();
            const menu = JSON.parse(cleanJson);

            const total = menu.total || (menu.sarapan.kalori + menu.makan_siang.kalori + menu.makan_malam.kalori);

            hasilDiv.innerHTML = `
                <div class="catatan-item" style="flex-direction: column; align-items: flex-start; gap: 8px;">
                    <div class="info" style="width: 100%;">
                        <span class="nama">🍽️ Menu Hari Ini (${sisaKalori} kkal tersisa)</span>
                        <span class="detail" style="margin-top: 4px;">🌅 Sarapan: ${menu.sarapan.nama} (${menu.sarapan.kalori} kkal)</span>
                        <span class="detail">☀️ Makan Siang: ${menu.makan_siang.nama} (${menu.makan_siang.kalori} kkal)</span>
                        <span class="detail">🌙 Makan Malam: ${menu.makan_malam.nama} (${menu.makan_malam.kalori} kkal)</span>
                        <span class="detail" style="margin-top: 6px; background: rgba(168, 195, 160, 0.1); padding: 8px; border-radius: 8px;">
                            📊 Total: ${total} kkal
                        </span>
                        <span class="detail" style="font-size: 12px; color: #A8C3A0; margin-top: 4px;">✨ Dihasilkan oleh AI</span>
                    </div>
                </div>
            `;

        } catch (error) {
            hasilDiv.innerHTML = `<p class="empty-state">❌ Gagal mendapatkan rekomendasi: ${error.message}</p>`;
            console.error('Error detail:', error);
        } finally {
            btn.textContent = '✨ Buat Rekomendasi';
            btn.disabled = false;
        }
    });
} else {
    console.error('❌ Tombol rekomendasi tidak ditemukan di DOM');
}

// ========== ASISTEN RESEP ==========
if (cariResepBtn) {
    cariResepBtn.addEventListener('click', async function() {
        console.log('🔄 Tombol Cari Resep diklik');
        const bahan = bahanResep.value.toLowerCase().split(',').map(b => b.trim()).filter(b => b);
        const hasilResep = document.getElementById('hasilResep');

        if (bahan.length === 0) {
            hasilResep.innerHTML = '<p class="empty-state">🌿 Masukkan bahan yang tersedia!</p>';
            return;
        }

        hasilResep.innerHTML = '<p class="empty-state">⏳ Mencari resep...</p>';

        try {
            const token = getAccessToken();
            const headers = { 'apikey': SUPABASE_ANON_KEY };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            let url = buildUrl('/rest/v1/resep', { select: '*' });
            const filters = bahan.map(b => `bahan=ilike.%25${b}%25`).join('&');
            if (filters) url += `&${filters}`;

            const dbResponse = await fetch(url, { headers });

            if (dbResponse.ok) {
                const data = await dbResponse.json();
                if (data.length > 0) {
                    hasilResep.innerHTML = data.map(r => `
                        <div class="catatan-item" style="flex-direction: column; align-items: flex-start; gap: 8px;">
                            <div class="info" style="width: 100%;">
                                <span class="nama">🥗 ${r.judul}</span>
                                <span class="detail" style="margin-top: 4px;">${r.cara}</span>
                                <span class="detail" style="margin-top: 6px;">
                                    🔥 ${r.kalori} kkal · 💪 ${r.protein}g · 🥑 ${r.lemak}g · 🍚 ${r.karbo}g
                                </span>
                            </div>
                        </div>
                    `).join('');
                    return;
                }
            }

            hasilResep.innerHTML = `
                <p class="empty-state">🌿 Belum ada resep dengan bahan itu di database.</p>
                <p class="empty-state" style="font-size: 14px;">💡 Coba bahan lain, atau tambahkan resep baru!</p>
            `;

        } catch (error) {
            hasilResep.innerHTML = `<p class="empty-state">❌ Error: ${error.message}</p>`;
            console.error('Error detail:', error);
        }
    });
} else {
    console.error('❌ Tombol cari resep tidak ditemukan di DOM');
}

// ========== EVENT LISTENER ==========

// Login
if (loginBtn) {
    loginBtn.addEventListener('click', function(e) {
        e.preventDefault();
        const email = loginEmail.value.trim();
        const password = loginPassword.value;
        if (email && password) {
            login(email, password);
        } else {
            alert('Masukkan email dan password!');
        }
    });
}

// Register
if (registerBtn) {
    registerBtn.addEventListener('click', function(e) {
        e.preventDefault();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;
        
        if (email && password) {
            register(email, password, confirmPassword);
        } else {
            alert('Masukkan email dan password!');
        }
    });
}

// Tab
const tabLoginBtn = document.getElementById('tabLoginBtn');
const tabRegisterBtn = document.getElementById('tabRegisterBtn');
const switchToRegister = document.getElementById('switchToRegister');
const switchToLogin = document.getElementById('switchToLogin');

if (tabLoginBtn) tabLoginBtn.addEventListener('click', function() { switchTab('login'); });
if (tabRegisterBtn) tabRegisterBtn.addEventListener('click', function() { switchTab('register'); });
if (switchToRegister) switchToRegister.addEventListener('click', function(e) { e.preventDefault(); switchTab('register'); });
if (switchToLogin) switchToLogin.addEventListener('click', function(e) { e.preventDefault(); switchTab('login'); });

// Logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
}

// Tambah Makanan
if (tambahMakananBtn) {
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
}

// Refresh Chart
const refreshChartBtn = document.getElementById('refreshChartBtn');
if (refreshChartBtn) {
    refreshChartBtn.addEventListener('click', loadWeightChart);
}

// ========== TOGGLE PASSWORD ==========
function setupPasswordToggle(toggleId, inputId) {
    const toggle = document.getElementById(toggleId);
    const input = document.getElementById(inputId);
    if (toggle && input) {
        toggle.addEventListener('click', function() {
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            this.textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
        });
    }
}

// ========== INISIALISASI ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Aplikasi Harian Sehatku dimulai');
    
    setupPasswordToggle('toggleLoginPassword', 'loginPassword');
    setupPasswordToggle('toggleRegisterPassword', 'registerPassword');
    setupPasswordToggle('toggleRegisterConfirmPassword', 'registerConfirmPassword');
    
    checkSession();
});