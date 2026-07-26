// api/gemini.js (atau api/openai.js yang dimodifikasi)
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Ambil API Key Gemini dari environment variable
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
                content: `Kamu adalah asisten resep sehat untuk ibu-ibu di Indonesia... (prompt tetap sama)`
            }
        ];
        // ... (bagian history dan messages sama seperti kode OpenAI sebelumnya) ...

        // ⭐ PERBEDAAN UTAMA: Arahkan ke endpoint Gemini dan pakai model Gemini
        const response = await fetch(
            'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', // Endpoint Gemini
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GEMINI_API_KEY}` // Pakai API Key Gemini
                },
                body: JSON.stringify({
                    model: 'gemini-1.5-flash', // Model Gemini yang stabil
                    messages: messages,
                    temperature: 0.7
                })
            }
        );

        const data = await response.json();
        // ... (bagian parsing response sama) ...
        const reply = data.choices[0]?.message?.content;
        return res.status(200).json({ reply });

    } catch (error) {
        console.error('Gemini API error:', error);
        return res.status(500).json({ error: error.message || 'Terjadi kesalahan' });
    }
}
