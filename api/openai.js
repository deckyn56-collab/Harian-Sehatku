
// api/openai.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
        return res.status(500).json({ error: 'OpenAI API key not configured' });
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
                }`
            }
        ];

        // Tambahkan history chat
        if (history && history.length > 0) {
            history.forEach(msg => {
                // Hanya masukkan pesan user dan assistant, bukan pesan image
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

        // Panggil OpenAI API
        const response = await fetch(
            'https://api.openai.com/v1/chat/completions',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: messages,
                    temperature: 0.7
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error('OpenAI API error:', data);
            throw new Error(data.error?.message || 'Gagal mendapatkan respons dari OpenAI');
        }

        const reply = data.choices[0]?.message?.content;
        return res.status(200).json({ reply });

    } catch (error) {
        console.error('OpenAI API error:', error);
        return res.status(500).json({ error: error.message || 'Terjadi kesalahan' });
    }
                }
