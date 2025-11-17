export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { image, fileName } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: 'Missing image data' });
    }

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing GEMINI_API_KEY' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = `... (mismo prompt del HTML) ...`;

    const imagePart = {
      inlineData: {
        data: image,
        mimeType: 'image/jpeg'
      }
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    // Parse JSON response
    let geminiData = null;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        geminiData = JSON.parse(jsonMatch[0]);
      } else {
        geminiData = JSON.parse(text);
      }
    } catch (e) {
      geminiData = { raw_response: text };
    }

    return res.status(200).json({ result: geminiData });

  } catch (err) {
    console.error("Gemini API Error:", err);
    return res.status(500).json({ error: err.message });
  }
}