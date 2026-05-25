// api/chat.js - Secure backend proxy using native https to guarantee 100% runtime compatibility on Vercel Node

const https = require('https');

// Helper to make HTTPS requests using Node's native core module (no dependencies, works on any Node version)
function makeHttpsRequest(options, payload) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    
    // Add Content-Length dynamically
    options.headers = {
      ...options.headers,
      'Content-Length': Buffer.byteLength(postData)
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          text: () => Promise.resolve(body),
          json: () => {
            try {
              return Promise.resolve(JSON.parse(body));
            } catch (err) {
              return Promise.reject(new Error('Failed to parse JSON response: ' + body));
            }
          }
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

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

  const apiKey = process.env.OPENROUTER_API_KEY;

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
You are "EspressGo Helper", the highly professional, energetic, and expert B2B coffee concierge and sales assistant for ESPRESSGO (Singapore).
ESPRESSGO is pioneering the B2B coffee revolution with premium, high-performance cold-brew espresso gel pouches/shots designed for corporate offices, workspaces, gyms, events, and cafes. No machines, no hot water, and zero clean-up.

PRODUCT INFORMATION:
1. ESPRESSGO Original:
   - SKU: ESG-OG-001
   - Classic high-potency Vietnamese robusta cold brew gel shot.
   - Pouch size: 25ml pouch (drink straight or squeeze into cold water/milk).
   - Caffeine content: ~65mg caffeine (pure focus).
   - Shelf life: 12-month shelf life.
   - Ingredients: Premium cold brew robusta coffee concentrate, low sugar, completely dairy-free.
   - B2B Pricing Tiers (per box of 50 pouches):
     * 1-9 boxes: $120 per box.
     * 10-29 boxes: $108 per box.
     * 30+ boxes: $96 per box.

2. ESPRESSGO Oat Milk:
   - SKU: ESG-OAT-002
   - Creamy, plant-based oat milk cold brew coffee blend.
   - Pouch size: 30ml pouch.
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
- Delivery Location: Island-wide Singapore B2B delivery.
- Delivery Times: Standard B2B shipping takes 2 to 3 business days. Next-day express shipping is available for orders submitted before 12 PM, subject to a small SGD 15 surcharge.
- Order Tracking: Customers can track their orders in real-time on their Account dashboard.
- Halal Status: 100% Halal-certified ingredients. Facility complies with MUIS standards in Singapore. We provide certificate copies on request.
- Wholesale terms: Minimum B2B order quantity is 1 box (50 pouches). Billing terms can be discussed with Damien.

AI BRAND RULES & BRAND LOYALTY:
- Tone: Highly energetic, premium, helpful, B2B-focused, and welcoming. Speak like a luxury coffee representative. Address users as "B2B Partner", "Procurement Manager", or "Office Concierge".
- Formatting: Use standard markdown (e.g., bolding with **text** or lists). You may output standard HTML anchor tags for page linking when relevant:
  * Link to Catalog page: <a href="catalog.html">Catalog</a>
  * Link to Account page: <a href="account.html">Account</a>
  * Link to Contact page: <a href="contact.html">Contact Us</a>
- Boundary Rule: ONLY answer questions related to ESPRESSGO products, pricing, logistics, coffee, or orders. If a user asks general knowledge questions or unrelated topics, politely guide them back to ESPRESSGO B2B services.
- Persona & "What model are you?" Rule: If asked who you are, what model you are, or if you are an AI, respond strictly in-character:
  * "I am the official **EspressGo B2B Sales Concierge**! Under the hood, I'm powered by advanced generative AI from OpenRouter, but my true passion is premium cold-brew gel shots and helping Singapore's best offices fuel their teams!"
- Conversational Commerce / Order Triggers Rule:
  * If the client explicitly requests to purchase, order, buy, or add specific quantities of gel pouches or cartons to their cart (e.g., "Add 4 cartons of Original", "Order 200 pouches of Original to 1 Marina Boulevard", or "Draft an order of 3 boxes of Oat Milk"):
    1. Identify the requested product ID: "espressgo-original" or "espressgo-oatmilk".
    2. Identify the quantity in "cartons". Note: 1 carton contains 50 pouches. If they specify "pouches", divide by 50 to get cartons (e.g., 200 pouches = 4 cartons, 100 pouches = 2 cartons, 50 pouches = 1 carton).
    3. Respond in a highly professional, encouraging way confirming you have drafted/added this order for them.
    4. At the very end of your response text, append the exact structured command token:
       [[ORDER_ACTION: product-id, quantity]]
       (For example: [[ORDER_ACTION: espressgo-original, 4]] or [[ORDER_ACTION: espressgo-oatmilk, 2]]).
- Contact: If the user requires custom procurement contracts, wholesale discounts, or customized event partnerships, warmly direct them to chat with Damien Teo via WhatsApp (button is right in the bottom float or links to https://wa.me/6587977961).
`;

  try {
    const models = [
      'google/gemini-2.5-flash:free',
      'meta-llama/llama-3-8b-instruct:free',
      'qwen/qwen-2.5-coder-32b-instruct:free',
      'microsoft/phi-3-medium-128k-instruct:free',
      'liquid/lfm-2.5-1.2b-instruct:free'
    ];

    let lastErrorText = '';
    let successfullyFetched = false;
    let responseData = null;

    const options = {
      hostname: 'openrouter.ai',
      port: 443,
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://espresgo-b2-b-portal.vercel.app',
        'X-Title': 'Espresgo B2B Portal'
      }
    };

    for (const model of models) {
      try {
        console.log(`[Proxy] Trying model: ${model}`);
        const payload = {
          model: model,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: question }
          ],
          temperature: 0.4,
          max_tokens: 500
        };

        const response = await makeHttpsRequest(options, payload);

        if (response.ok) {
          responseData = await response.json();
          successfullyFetched = true;
          console.log(`[Proxy] Success with model: ${model}`);
          break;
        } else {
          lastErrorText = await response.text();
          console.warn(`[Proxy] Model ${model} failed (${response.status}): ${lastErrorText.substring(0, 200)}`);
        }
      } catch (modelErr) {
        lastErrorText = modelErr.message;
        console.warn(`[Proxy] Exception with model ${model}:`, modelErr.message);
      }
    }

    if (!successfullyFetched) {
      console.error('[Proxy] All models exhausted. Last error:', lastErrorText);
      return res.status(502).json({
        error: 'All configured AI models are currently unavailable.',
        details: lastErrorText
      });
    }

    let answerText = '';
    try {
      answerText = responseData.choices[0].message.content;
    } catch (parseErr) {
      console.error('[Proxy] Failed to parse choices from response:', parseErr, JSON.stringify(responseData).substring(0, 500));
      return res.status(502).json({
        error: 'Malformed response from OpenRouter API.',
        raw: responseData
      });
    }

    return res.status(200).json({ answer: answerText });

  } catch (error) {
    console.error('[Proxy] Unexpected internal exception:', error);
    return res.status(500).json({
      error: 'Internal Server Error in chat handler.',
      details: error.message
    });
  }
};

