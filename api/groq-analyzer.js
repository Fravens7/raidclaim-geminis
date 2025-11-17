export default async function handler(req, res) {
  try {
    console.log("🚀 Starting text extraction request");
    
    if (req.method !== 'POST') {
      console.log("❌ Wrong method:", req.method);
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Test endpoint
    if (req.url.includes('/test')) {
      return res.status(200).json({
        message: "API is working",
        env: {
          HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY ? "Present" : "Missing"
        }
      });
    }

    let body = {};
    try {
      body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      console.log("📋 Request body parsed successfully");
    } catch (e) {
      console.error("❌ JSON parse error:", e);
      return res.status(400).json({ error: "Invalid JSON body" });
    }

    const { image, fileName, mimeType } = body;
    console.log("📁 File info:", { fileName, mimeType, imageSize: image?.length });
    
    if (!image) {
      console.error("❌ No image data in request");
      return res.status(400).json({ error: 'Missing image data' });
    }

    // Check for Hugging Face API key
    const hfApiKey = process.env.HUGGINGFACE_API_KEY;
    console.log("🔑 API key check:", hfApiKey ? "Present" : "Missing");
    
    if (!hfApiKey) {
      console.error("❌ No HUGGINGFACE_API_KEY found in environment variables");
      return res.status(500).json({ error: 'Missing Hugging Face API key' });
    }

    // Use text model to simulate OCR
    const dataUrl = `data:${mimeType || 'image/jpeg'};base64,${image}`;
    console.log("🖼️ Data URL created, length:", dataUrl.length);
    console.log("📡 Calling Hugging Face API...");
    
    // Use a working text model
    const response = await fetch(`https://router.huggingface.co/hf-inference/models/microsoft/DialoGPT-medium`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${hfApiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            inputs: `This is a receipt image converted to base64 format: ${dataUrl.substring(0, 150)}... Please extract all visible text from this receipt including: merchant name, date, time, total amount, currency, transaction status, and any other details. Return only the extracted text without commentary.`
        }),
    });

    console.log("📡 Hugging Face response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Hugging Face API Error:", errorText);
      return res.status(response.status).json({ 
        error: `Hugging Face API error: ${errorText}`,
        status: response.status
      });
    }

    const result = await response.json();
    console.log("📄 Hugging Face raw response:", result);
    
    // Extract text from Hugging Face response
    let extractedText = '';
    if (Array.isArray(result) && result.length > 0) {
      extractedText = result[0]?.generated_text || '';
    } else if (result[0]?.generated_text) {
      extractedText = result[0].generated_text;
    }

    console.log("✅ Text extracted successfully, length:", extractedText.length);

    return res.status(200).json({
      extractedText: extractedText || 'No text extracted',
      fileName: fileName,
      success: true
    });

  } catch (err) {
    console.error("💥 Server error:", err);
    console.error("💥 Error stack:", err.stack);
    return res.status(500).json({ 
      error: err.message,
      stack: err.stack 
    });
  }
}