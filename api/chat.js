// api/chat.js - Secure backend proxy for the OpenRouter / Gemini 2.5 Flash AI Chatbox

module.exports = async function handler(req, res) {
  // CORS Headers for safety
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  const { question } = req.body || {};
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'Missing parameter: "question" string is required.' });
  }

  const apiKey = process.env.OPENROUTER_API_KEY || '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';

  // Friendly fallback if key is not configured yet (for instant ease-of-use/testing)
  if (!apiKey) {
    let mockAnswer = "";
    const qLower = question.toLowerCase();

    if (qLower.includes('halal')) {
      mockAnswer = "Yes, absolutely! **EspressGo is 100% Halal-certified**. All of our manufacturing lines in Singapore follow MUIS guidelines. (Note: *This is a local demonstration reply. Add your `OPENROUTER_API_KEY` to Vercel to activate real Gemini AI*).";
    } else if (qLower.includes('delivery') || qLower.includes('long')) {
      mockAnswer = "Standard B2B delivery in Singapore takes **2 to 3 business days**. For urgent orders submitted before 12 PM, we offer next-day express courier service for an extra SGD 15. (Note: *This is a local demonstration reply. Add your `OPENROUTER_API_KEY` to Vercel to activate real Gemini AI*).";
    } else if (qLower.includes('dairy') || qLower.includes('sugar') || qLower.includes('oat')) {
      mockAnswer = "All ESPRESSGO gel shots are **100% dairy-free** and vegan-friendly! Original uses low-sugar robusta cold brew, while Oat Milk uses premium plant-based oat milk and raw cane sugar. (Note: *This is a local demonstration reply. Add your `OPENROUTER_API_KEY` to Vercel to activate real Gemini AI*).";
    } else {
      mockAnswer = `Hello there! I am your automated B2B sales assistant. I received your custom inquiry: "${question}". \n\nTo activate real Gemini Generative AI responses, please set your \`OPENROUTER_API_KEY\` environment variable in Vercel. We can also handle wholesale requests and custom quotes if you contact Damien directly via **<a href='https://wa.me/6587977961' target='_blank'>WhatsApp</a>**!`;
    }
    return res.status(200).json({ answer: mockAnswer });
  }

  const systemInstruction = `
You are "EspressGo Helper", the highly professional, friendly, and expert B2B virtual sales assistant for ESPRESSGO (Singapore).
ESPRESSGO manufactures and sells premium, high-quality cold-brew espresso gel pouches/shots designed for B2B clients, corporate offices, gyms, hotels, events, and cafes.

PRODUCT INFORMATION:
1. ESPRESSGO Original:
   - SKU: ESG-OG-001
   - Classic Vietnamese robusta cold brew gel shot.
   - Pouch size: 25ml.
   - Caffeine content: ~65mg caffeine.
   - Shelf life: 12-month shelf life.
   - Ingredients: Premium cold brew robusta coffee concentrate, low sugar, no dairy. Completely dairy-free.
   - B2B Pricing Tiers (per box of 50 pouches):
     * 1-9 boxes: $120 per box.
     * 10-29 boxes: $108 per box.
     * 30+ boxes: $96 per box.

2. ESPRESSGO Oat Milk:
   - SKU: ESG-OAT-002
   - Creamy, plant-based oat milk cold brew coffee blend.
   - Pouch size: 30ml.
   - Caffeine content: ~60mg caffeine.
   - Shelf life: 10-month shelf life.
   - Ingredients: Cold brew coffee, premium plant-based oat milk, lightly sweetened with organic cane sugar. 100% dairy-free and vegan.
   - B2B Pricing Tiers (per box of 50 pouches):
     * 1-9 boxes: $130 per box.
     * 10-29 boxes: $117 per box.
     * 30+ boxes: $104 per box.

3. ESPRESSGO Matcha (Coming Soon - Q3 2026):
   - SKU: ESG-MTG-003
   - Japanese matcha + energy gel shot.
   - Pricing Tiers (Est): 1-9 boxes: $125.

4. ESPRESSGO Decaf (Coming Soon - Q4 2026):
   - SKU: ESG-DCF-004
   - Swiss water process decaf cold brew gel shot (~5mg caffeine).
   - Pricing Tiers (Est): 1-9 boxes: $115.

B2B LOGISTICS & PROCUREMENT SPECS:
- Delivery Location: We deliver island-wide in Singapore.
- Delivery Times: Standard B2B shipping takes 2 to 3 business days. Next-day express shipping is available for orders submitted before 12 PM, subject to a small SGD 15 surcharge.
- Order Tracking: Customers can track their orders in real-time on their Account dashboard.
- Halal Status: 100% Halal-certified ingredients. Facility complies with MUIS standards in Singapore. We provide certificate copies on request.
- Wholesale terms: Minimum B2B order quantity is 1 box (50 pouches). Billing terms can be discussed with Damien.

AI SYSTEM RULES:
- Tone: Extremely helpful, welcoming, concise, and business-focused (B2B). Keep answers clear, readable, and structured.
- Formatting: Use standard markdown (e.g., bolding with **text** or lists). You may output standard HTML anchor tags for page linking when relevant:
  * Link to Catalog page: <a href="catalog.html">Catalog</a>
  * Link to Account page: <a href="account.html">Account</a>
  * Link to Contact page: <a href="contact.html">Contact Us</a>
- Boundary Rule: ONLY answer questions related to ESPRESSGO products, pricing, logistics, coffee, or orders. If a user asks general knowledge questions or unrelated topics, politely guide them back to ESPRESSGO B2B services.
- Contact: If the user requires custom procurement contracts, wholesale discounts, or customized event partnerships, warmly direct them to chat with Damien Teo via WhatsApp (button is right in the bottom float or links to https://wa.me/6587977961).
`;

  try {
    const endpoint = 'https://openrouter.ai/api/v1/chat/completions';

    const payload = {
      model: 'deepseek/deepseek-v4-flash:free',
      messages: [
        {
          role: 'system',
          content: systemInstruction
        },
        {
          role: 'user',
          content: question
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    };

    let response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost',
        'X-Title': 'Espresgo B2B Portal'
      },
      body: JSON.stringify(payload)
    });

    // Auto Fallback: If primary model fails (e.g. DeepSeek out of credits)
    if (!response.ok) {
      console.warn('DeepSeek v4 Flash failed. Falling back to Liquid free model...');
      const fallbackPayload = {
        ...payload,
        model: 'liquid/lfm-2.5-1.2b-instruct:free'
      };
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'http://localhost',
          'X-Title': 'Espresgo B2B Portal'
        },
        body: JSON.stringify(fallbackPayload)
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API Error details (fallback failed):', errorText);
      return res.status(502).json({
        error: 'Failed to retrieve response from OpenRouter API.',
        details: errorText
      });
    }

    const data = await response.json();
    let answerText = "";

    try {
      answerText = data.choices[0].message.content;
    } catch (parseError) {
      console.error('Failed to parse OpenRouter response payload:', parseError, data);
      return res.status(502).json({
        error: 'Received malformed payload from OpenRouter.',
        raw: data
      });
    }

    return res.status(200).json({ answer: answerText });
  } catch (error) {
    console.error('Serverless internal exception:', error);
    return res.status(500).json({
      error: 'Internal Server Error within serverless chat handler.',
      details: error.message
    });
  }
};
