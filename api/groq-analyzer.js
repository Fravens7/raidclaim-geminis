export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    let body = {};
    try {
      body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    } catch (e) {
      return res.status(400).json({ error: "Invalid JSON body" });
    }

    const { image, fileName, mimeType } = body;
    if (!image) {
      return res.status(400).json({ error: 'Missing image data' });
    }

    const apiKey = process.env.GROQ_API_KEY_IMAGES;
    if (!apiKey) {
      console.error("❌ No GROQ_API_KEY_IMAGES found in environment variables");
      return res.status(500).json({ error: 'Missing GROQ API key' });
    }

    const prompt = `Extract all text from this receipt image. Return only the extracted text, no analysis or formatting.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY_IMAGES}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant", // Open source model for text extraction
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 1024
      }),
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("⚠️ GROQ no devolvió JSON:", text);
      return res.status(500).json({ error: 'Invalid JSON response from GROQ' });
    }

    if (!response.ok) {
      console.error("❌ GROQ API Error:", data);
      return res.status(response.status).json({ error: data.error || 'GROQ API error' });
    }

    const extractedText = data.choices?.[0]?.message?.content || '';

    return res.status(200).json({
      extractedText: extractedText,
      fileName: fileName
    });

  } catch (err) {
    console.error("💥 Server error:", err);
    return res.status(500).json({ error: err.message });
  }
}