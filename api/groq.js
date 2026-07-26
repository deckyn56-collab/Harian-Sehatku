// ========== API GROQ PROXY (Vercel Serverless Function) ==========
export default async function handler(req, res) {
    // Hanya terima metode POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) {
        return res.status(500).json({ error: 'Groq API key not configured' });
    }

    try {
        const { message, imageBase64, history = [] } = req.body;

        if (!message && !imageBase64) {
            return res.status(400).json({ error: 'No message or image provided' });
        }

        // Buat pesan dari history chat
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

        // Tambahkan history chat
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

        // Tambahkan pesan terakhir
        messages.push({
            role: 'user',
            content: message || 'Analisis gambar bahan makanan ini dan berikan rekomendasi resep.'
        });

        console.log('📤 Mengirim request ke Groq...');
        console.log('📤 Messages:', JSON.stringify(messages, null, 2));

        // Panggil Groq API
        const response = await fetch(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GROQ_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: messages,
                    temperature: 0.7,
                    response_format: { type: 'json_object' }
                })
            }
        );

        const data = await response.json();

        console.log('📥 Response status:', response.status);
        console.log('📥 Response data:', data);

        if (!response.ok) {
            console.error('Groq API error:', data);
            throw new Error(data.error?.message || `HTTP ${response.status}`);
        }

        const reply = data.choices[0]?.message?.content;
        
        if (!reply) {
            throw new Error('Tidak ada respons dari Groq');
        }

        return res.status(200).json({ reply });

    } catch (error) {
        console.error('❌ Groq API error:', error);
        return res.status(500).json({ error: error.message || 'Terjadi kesalahan' });
    }
}
