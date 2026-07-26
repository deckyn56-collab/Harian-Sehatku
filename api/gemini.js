// ========== API GEMINI PROXY (Vercel Serverless Function) ==========
export default async function handler(req, res) {
    // Hanya terima metode POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'API Key not configured' });
    }

    try {
        const { message, imageBase64, history = [] } = req.body;

        if (!message && !imageBase64) {
            return res.status(400).json({ error: 'No message or image provided' });
        }

        // Bangun konten untuk Gemini
        const contents = [];
        
        if (history && history.length > 0) {
            history.forEach(msg => {
                contents.push({
                    role: msg.role,
                    parts: [{ text: msg.text }]
                });
            });
        }

        const parts = [];

        if (imageBase64) {
            parts.push({
                inline_data: {
                    mime_type: 'image/jpeg',
                    data: imageBase64
                }
            });
        }

        if (message) {
            parts.push({ text: message });
        }

        contents.push({
            role: 'user',
            parts: parts
        });

        // Panggil Gemini API dengan API Key via query parameter
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    system_instruction: {
                        parts: [{
                            text: `Kamu adalah asisten resep sehat untuk ibu-ibu di Indonesia.
                            Kamu bisa melihat gambar bahan makanan dan memberikan rekomendasi resep.
                            Berikan rekomendasi resep dengan format JSON:
                            {
                                "judul": "Nama Resep",
                                "bahan": "Daftar bahan dan takaran",
                                "cara": "Langkah-langkah memasak",
                                "kalori": angka,
                                "protein": angka,
                                "lemak": angka,
                                "karbo": angka
                            }
                            Jika pengguna memberikan gambar, identifikasi bahan-bahan yang terlihat.
                            Jika multi-turn chat, jawab dengan ramah dan informatif.`
                        }]
                    },
                    contents: contents
                })
            }
        );

        const data = await response.json();

        console.log('📥 Response dari Gemini:', data);

        if (!data.candidates || data.candidates.length === 0) {
            const errorMsg = data.error?.message || 'Gagal mendapatkan respons dari Gemini';
            throw new Error(errorMsg);
        }

        const reply = data.candidates[0].content.parts[0].text;
        return res.status(200).json({ reply });

    } catch (error) {
        console.error('❌ Gemini API error:', error);
        return res.status(500).json({ error: error.message || 'Terjadi kesalahan' });
    }
}
