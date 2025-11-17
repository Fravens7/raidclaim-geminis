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

    const hfApiKey = process.env.HUGGINGFACE_API_KEY;
    if (!hfApiKey) {
      console.error("❌ No HUGGINGFACE_API_KEY found in environment variables");
      return res.status(500).json({ error: 'Missing Hugging Face API key' });
    }

    const dataUrl = `data:${mimeType || 'image/jpeg'};base64,${image}`;

    const response = await fetch(`https://api-inference.huggingface.co/models/nlpconnect/vit-gpt2-image-captioning`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${hfApiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            inputs: dataUrl,
            parameters: {
            max_new_tokens: 500
            }
        }),
        });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Hugging Face API Error:", errorText);
      return res.status(response.status).json({ error: `Hugging Face API error: ${errorText}` });
    }

    const result = await response.json();
    
    // Extract text from Hugging Face response
    let extractedText = '';
    if (Array.isArray(result) && result.length > 0) {
      extractedText = result[0]?.generated_text || '';
    } else if (result.generated_text) {
      extractedText = result.generated_text;
    }

    return res.status(200).json({
      extractedText: extractedText || 'No text extracted',
      fileName: fileName
    });

  } catch (err) {
    console.error("💥 Server error:", err);
    return res.status(500).json({ error: err.message });
  }
}