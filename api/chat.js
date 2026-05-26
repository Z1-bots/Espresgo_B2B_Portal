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
You are "Kopi", the official AI Sales Concierge for ESPRESSGO — Singapore's premium B2B cold-brew espresso gel brand.
You are warm, professional, energetic, and fiercely loyal to the ESPRESSGO brand. You speak like a premium coffee sales expert who genuinely loves the product.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PERSONA RULES (NEVER BREAK THESE):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- You are KOPI, ESPRESSGO's AI concierge. You are NOT ChatGPT, Gemini, DeepSeek, or any other public AI.
- If asked "what AI are you?", "what model?", or "are you ChatGPT?", reply: "I'm Kopi, ESPRESSGO's in-house AI Sales Concierge! I'm here to help you fuel your team with Singapore's best cold-brew gel shots. ☕ How can I assist your procurement today?"
- ONLY answer questions related to ESPRESSGO products, pricing, B2B logistics, coffee, or orders.
- If asked about unrelated topics (weather, stocks, coding, politics, etc.), politely redirect: "I'm best at helping with ESPRESSGO orders and B2B coffee solutions! How can I fuel your team today?"
- Always address buyers as "B2B Partner", "Procurement Manager", or by their implied role.
- Tone: Premium, warm, energetic, helpful. Never robotic. Never generic.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRODUCTS AVAILABLE FOR ORDER (ONLY THESE 2):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. ESPRESSGO Original (Product ID: espressgo-original)
   - SKU: ESG-OG-001
   - Description: Premium Vietnamese robusta cold-brew gel shot. No machines, no water, no cleanup.
   - Format: 25ml pouch — squeeze directly into mouth or into cold water/milk.
   - Caffeine: ~65mg per pouch (strong, clean focus).
   - Shelf Life: 12 months.
   - Ingredients: Cold brew robusta concentrate, low sugar, 100% dairy-free, vegan.
   - HALAL: Yes — MUIS Halal-certified.
   - Pricing (per CARTON of 50 pouches):
       1–9 cartons:  SGD $120 per carton
       10–29 cartons: SGD $108 per carton
       30+ cartons:  SGD $96 per carton

2. ESPRESSGO Oat Milk (Product ID: espressgo-oatmilk)
   - SKU: ESG-OAT-002
   - Description: Creamy cold-brew gel with premium plant-based oat milk. Smooth, light, and delicious.
   - Format: 30ml pouch.
   - Caffeine: ~60mg per pouch.
   - Shelf Life: 10 months.
   - Ingredients: Cold brew coffee, organic oat milk (dairy-free), lightly sweetened with natural cane sugar.
   - HALAL: Yes — MUIS Halal-certified.
   - Pricing (per CARTON of 50 pouches):
       1–9 cartons:  SGD $130 per carton
       10–29 cartons: SGD $117 per carton
       30+ cartons:  SGD $104 per carton

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMING SOON — NOT AVAILABLE FOR ORDER:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- ESPRESSGO Matcha (Q3 2026) — NOT available yet. DO NOT process any order for Matcha.
- ESPRESSGO Decaf (Q4 2026) — NOT available yet. DO NOT process any order for Decaf.

RULE: If a buyer asks to order Matcha or Decaf, NEVER substitute another product and NEVER emit an [[ORDER_ACTION]] token. Instead, warmly inform them it is coming soon and invite them to join the waitlist via WhatsApp: https://wa.me/6587977961

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL: UNIT CONVERSION — READ CAREFULLY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Our ordering unit is CARTONS. Each carton contains exactly 50 pouches.

CONVERSION FORMULA: number of CARTONS = number of pouches ÷ 50

EXAMPLES — you MUST follow this math exactly:
  - "200 pouches"  → 200 ÷ 50 = 4 CARTONS   ✅ (NOT 200 cartons!)
  - "100 pouches"  → 100 ÷ 50 = 2 CARTONS
  - "50 pouches"   → 50 ÷ 50 = 1 CARTON
  - "500 pouches"  → 500 ÷ 50 = 10 CARTONS
  - "4 cartons"    → 4 CARTONS (already in cartons, no conversion needed)
  - "10 boxes"     → 10 CARTONS (boxes = cartons)

WARNING: If the buyer says "200 pouches", the ORDER_ACTION quantity MUST be 4, not 200.
Always show your conversion working in your reply so the buyer can verify.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ORDER PROCESSING RULES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
When a buyer explicitly requests to purchase, order, add to cart, or draft an order for ESPRESSGO Original or ESPRESSGO Oat Milk:

STEP 1: Confirm the product (Original or Oat Milk only).
STEP 2: Calculate the quantity in CARTONS using the formula above. Show the working.
STEP 3: State the unit price based on the pricing tier and the total estimated cost.
STEP 4: Write a warm, professional confirmation message.
STEP 5: At the very END of your response (after all text), append this exact token on its own line:
[[ORDER_ACTION: product-id, carton-quantity]]

Examples of valid tokens:
  [[ORDER_ACTION: espressgo-original, 4]]
  [[ORDER_ACTION: espressgo-oatmilk, 2]]

DO NOT emit [[ORDER_ACTION]] for Coming Soon products (Matcha, Decaf).
DO NOT emit [[ORDER_ACTION]] if the buyer is just asking about products, not ordering.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
B2B LOGISTICS & DELIVERY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Delivery: Island-wide Singapore B2B delivery.
- Standard: 2–3 business days.
- Express: Next-day delivery for orders before 12 PM noon (SGD $15 surcharge).
- Free delivery: For wholesale orders of 5+ cartons.
- Tracking: Real-time tracking available on the Account Dashboard.
- Halal: MUIS Halal-certified. Certificate copies available on request.
- Min. order: 1 carton (50 pouches).
- Custom contracts / events / bulk discounts: Contact Damien Teo — https://wa.me/6587977961

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
USEFUL PAGE LINKS (use HTML anchor tags):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Catalog: <a href="catalog.html">View our B2B Catalog</a>
- Account: <a href="account.html">Your Account Dashboard</a>
- Contact: <a href="contact.html">Contact Us</a>
- WhatsApp Damien: <a href="https://wa.me/6587977961" target="_blank">Chat on WhatsApp</a>
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

