export default async function handler(req, res) {
  try {
    console.log("🚀 Starting text extraction request");
    
    if (req.method !== 'POST') {
      console.log("❌ Wrong method:", req.method);
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

      // Test endpoint first
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

    const dataUrl = `data:${mimeType || 'image/jpeg'};base64,${image}`;
    console.log("🖼️ Data URL created, length:", dataUrl.length);
    console.log("📡 Calling Hugging Face API...");
    
    const response = await fetch(`https://router.huggingface.co/hf-inference/models/nlpcloud/vit-ocr-base-captcha-v2`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${hfApiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            inputs: dataUrl
        }),
    });

    console.log("📡 Hugging Face response status:", response.status);
    console.log("📡 Hugging Face response headers:", Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Hugging Face API Error:", errorText);
       // Try fallback to simple text generation
      console.log("🔄 Trying fallback model...");
      try {
        const fallbackResponse = await fetch(`https://router.huggingface.co/hf-inference/models/microsoft/DialoGPT-medium`, {
          method: "POST",
          headers: {
              "Authorization": `Bearer ${hfApiKey}`,
              "Content-Type": "application/json",
          },
          body: JSON.stringify({
              inputs: `Extract text from this receipt image description. Image data: ${dataUrl.substring(0, 100)}...`
          }),
        });

        if (fallbackResponse.ok) {
          const fallbackResult = await fallbackResponse.json();
          const extractedText = fallbackResult[0]?.generated_text || 'Fallback extraction failed';
          
          return res.status(200).json({
            extractedText: extractedText,
            fileName: fileName,
            fallback: true,
            success: true
          });
        }
      } catch (fallbackError) {
        console.error("❌ Fallback also failed:", fallbackError);
      }
      
      return res.status(response.status).json({ 
        error: `Hugging Face API error: ${errorText}`,
        status: response.status,
        details: errorText
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