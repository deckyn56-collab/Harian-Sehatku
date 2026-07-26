// ========== API GEMINI PROXY (Vercel Serverless Function) ==========
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    try {
        const { message, imageBase64, history = [] } = req.body;

        if (!message && !imageBase64) {
            return res.status(400).json({ error: 'No message or image provided' });
        }

        const messages = [
            {
                role: 'system',
                content: `Kamu adalah asisten resep sehat untuk ibu-ibu di Indonesia.
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
                Jawab dengan ramah dan informatif.`
            }
        ];

        if (history && history.length > 0) {
            history.forEach(msg => {
                if (msg.role !== 'image') {
                    messages.push({
                        role: msg.role,
                        content: msg.text
                    });
                }
            });
        }

        messages.push({
            role: 'user',
            content: message || 'Analisis gambar bahan makanan ini dan berikan rekomendasi resep.'
        });

        console.log('📤 Mengirim request ke Gemini API...');
        console.log('📤 Messages:', JSON.stringify(messages, null, 2));

        // Panggil Gemini API dengan endpoint OpenAI-compatible
        const response = await fetch(
            'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GEMINI_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'gemini-1.5-flash',
                    messages: messages,
                    temperature: 0.7
                })
            }
        );

        const data = await response.json();

        console.log('📥 Response status:', response.status);
        console.log('📥 Response data:', JSON.stringify(data, null, 2));

        if (!response.ok) {
            console.error('Gemini API error:', data);
            throw new Error(data.error?.message || `HTTP ${response.status}`);
        }

        // Cek struktur respons
        if (!data.choices || data.choices.length === 0) {
            console.error('❌ Tidak ada choices dalam respons:', data);
            throw new Error('Tidak ada respons dari Gemini');
        }

        const reply = data.choices[0]?.message?.content;
        
        if (!reply) {
            console.error('❌ Tidak ada content dalam choices:', data.choices);
            throw new Error('Respons kosong dari Gemini');
        }

        console.log('✅ Reply dari Gemini:', reply);
        return res.status(200).json({ reply });

    } catch (error) {
        console.error('❌ Gemini API error:', error);
        return res.status(500).json({ error: error.message || 'Terjadi kesalahan' });
    }
}
