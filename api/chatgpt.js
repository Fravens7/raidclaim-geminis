export default async function handler(req, res) {
  try {
    console.log("🚀 Starting ChatGPT text extraction");
    
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
    console.log("📁 File info:", { fileName, mimeType, imageSize: image?.length });
    
    if (!image) {
      return res.status(400).json({ error: 'Missing image data' });
    }

    // Check for OpenAI API key
    const openaiApiKey = process.env.OPENAI_API_KEY;
    console.log("🔑 API key check:", openaiApiKey ? "Present" : "Missing");
    
    if (!openaiApiKey) {
      console.error("❌ No OPENAI_API_KEY found");
      return res.status(500).json({ error: 'Missing OpenAI API key' });
    }

    const dataUrl = `data:${mimeType || 'image/jpeg'};base64,${image}`;
    console.log("🖼️ Data URL created, length:", dataUrl.length);

    console.log("📡 Calling ChatGPT API...");
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract ONLY the date and time from this receipt image. Return in format: 'Date: [date], Time: [time]'. Do not include any other information."
              },
              {
                type: "image_url",
                image_url: {
                  url: dataUrl
                }
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 100
      }),
    });

    console.log("📡 ChatGPT response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ ChatGPT API Error:", errorText);
      return res.status(response.status).json({ error: `ChatGPT API error: ${errorText}` });
    }

    const result = await response.json();
    console.log("📄 ChatGPT raw response:", result);
    
    const extractedText = result.choices?.[0]?.message?.content || '';
    console.log("✅ Date/Time extracted:", extractedText);

    return res.status(200).json({
      extractedText: extractedText || 'No date/time extracted',
      fileName: fileName,
      success: true
    });

  } catch (err) {
    console.error("💥 Server error:", err);
    return res.status(500).json({ error: err.message });
  }
}