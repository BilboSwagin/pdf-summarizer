const { getDocument } = require('pdfjs-dist');
const fetch = require('node-fetch'); // Vercel supports fetch natively

module.exports = async (req, res) => {
  try {
    // Expect PDF file as base64 or buffer in the request body
    const { pdfData } = req.body; // Assume frontend sends PDF as base64
    if (!pdfData) {
      return res.status(400).json({ error: 'No PDF data provided' });
    }

    // Decode base64 to buffer
    const pdfBuffer = Buffer.from(pdfData, 'base64');

    // Parse PDF with pdfjs-dist
    const loadingTask = getDocument({ data: pdfBuffer });
    const pdf = await loadingTask.promise;
    let fullText = '';
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      fullText += textContent.items.map(item => item.str).join(' ') + '\n';
    }

    // Summarize with xAI API
    const truncatedText = fullText.substring(0, 5000); // Adjust for API limits
    const apiResponse = await fetch('https://api.x.ai/v1/summarize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.XAI_API_KEY}` // Store key in Vercel env vars
      },
      body: JSON.stringify({
        text: truncatedText,
        max_length: 200
      })
    });

    if (!apiResponse.ok) {
      throw new Error('API request failed');
    }

    const { summary } = await apiResponse.json();
    res.status(200).json({ summary });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};