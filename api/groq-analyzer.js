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

    const dataUrl = `data:${mimeType || 'image/jpeg'};base64,${image}`;

    const prompt = `
Analyze this receipt image from a service like a ride-sharing or food delivery app. 
Extract key information and respond in requested JSON format.

Focus on extracting:
1. The name of location, destination, or store
2. The date of transaction (e.g., "Nov 10")
3. The time of transaction (e.g., "3:30 PM")
4. The total cost of transaction
5. The currency code
6. The status of transaction
7. The type of activity

Respond in JSON format with these fields:
{
  "title": "The name of location, destination, or store",
  "date": "The date of transaction",
  "time": "The time of transaction",
  "amount": "The total cost of transaction",
  "currency": "The currency code, e.g., 'LKR'",
  "status": "The status of transaction",
  "type": "The type of activity (ride, tuktuk, delivery, or other)"
}

Image: ${dataUrl}
`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY_IMAGES}`,
      },
      body: JSON.stringify({
        model: "llava-v1.5-7b-4096-preview", // Vision model
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

    const responseText = data.choices?.[0]?.message?.content || '';
    
    // Parse JSON response
    let groqData = null;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        groqData = JSON.parse(jsonMatch[0]);
      } else {
        groqData = JSON.parse(responseText);
      }
    } catch (e) {
      groqData = { 
        raw_response: responseText,
        error: 'Could not parse JSON'
      };
    }

    return res.status(200).json({
      result: groqData,
    });

  } catch (err) {
    console.error("💥 Server error:", err);
    return res.status(500).json({ error: err.message });
  }
}