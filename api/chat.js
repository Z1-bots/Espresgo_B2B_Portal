// api/chat.js — Secure backend proxy for ESPRESSGO AI Chatbox
// Works as a Vercel Serverless Function.
//
// IMPORTANT:
// Add this environment variable in Vercel:
// OPENROUTER_API_KEY=your_openrouter_key_here
//
// Never hardcode your real API key inside this file.

module.exports = async function handler(req, res) {
  /* ============================================================
     CORS headers
     ============================================================ */

  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method Not Allowed. Use POST.'
    });
  }

  /* ============================================================
     Request validation
     ============================================================ */

  const { question } = req.body || {};

  if (!question || typeof question !== 'string') {
    return res.status(400).json({
      error: 'Missing parameter: "question" string is required.'
    });
  }

  const cleanQuestion = question.trim();

  if (!cleanQuestion) {
    return res.status(400).json({
      error: 'Question cannot be empty.'
    });
  }

  if (cleanQuestion.length > 1000) {
    return res.status(400).json({
      error: 'Question is too long. Please keep it below 1000 characters.'
    });
  }

  /* ============================================================
     API key
     ============================================================ */

  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    const mockAnswer = getLocalFallbackAnswer(cleanQuestion);

    return res.status(200).json({
      answer: mockAnswer,
      mode: 'fallback'
    });
  }

  /* ============================================================
     System instruction
     ============================================================ */

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
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': getReferer(req),
        'X-Title': 'ESPRESSGO B2B Portal'
      },
      body: JSON.stringify(primaryPayload)
    });

    /* ============================================================
       Fallback model if primary model fails
       ============================================================ */

    if (!response.ok) {
      console.warn('Primary OpenRouter model failed. Trying fallback model.');

      const fallbackPayload = {
        ...primaryPayload,
        model: 'liquid/lfm-2.5-1.2b-instruct:free'
      };

      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': getReferer(req),
          'X-Title': 'ESPRESSGO B2B Portal'
        },
        body: JSON.stringify(fallbackPayload)
      });
    }

    if (!response.ok) {
      const errorText = await response.text();

      console.error('OpenRouter API Error:', errorText);

      return res.status(502).json({
        error: 'Failed to retrieve response from OpenRouter API.',
        details: errorText
      });
    }

    const data = await response.json();

    const answerText = data?.choices?.[0]?.message?.content;

    if (!answerText) {
      console.error('Malformed OpenRouter response:', data);

      return res.status(502).json({
        error: 'Received malformed response from OpenRouter.',
        raw: data
      });
    }

    return res.status(200).json({
      answer: answerText,
      mode: 'ai'
    });
  } catch (error) {
    console.error('Serverless internal exception:', error);

    return res.status(500).json({
      error: 'Internal Server Error within serverless chat handler.',
      details: error.message
    });
  }
};


/* ============================================================
   Helper: fallback answer when API key is missing
   ============================================================ */

function getLocalFallbackAnswer(question) {
  const q = question.toLowerCase();

  if (q.includes('halal')) {
    return [
      'Yes, ESPRESSGO uses Halal-friendly ingredients.',
      '',
      'For official certificates or procurement documents, please contact Damien through <a href="https://wa.me/6587977961" target="_blank">WhatsApp</a>.'
    ].join('\n');
  }

  if (
    q.includes('delivery') ||
    q.includes('deliver') ||
    q.includes('shipping') ||
    q.includes('ship')
  ) {
    return [
      'Standard B2B delivery in Singapore usually takes **2 to 3 business days**.',
      '',
      'Next-day express delivery may be available for orders placed before 12 PM.'
    ].join('\n');
  }

  if (
    q.includes('price') ||
    q.includes('pricing') ||
    q.includes('cost') ||
    q.includes('carton')
  ) {
    return [
      'Here is the ESPRESSGO wholesale pricing:',
      '',
      '**ESPRESSGO Original**',
      '- 1-9 cartons: SGD $120/carton',
      '- 10-29 cartons: SGD $108/carton',
      '- 30+ cartons: SGD $96/carton',
      '',
      '**ESPRESSGO Oat Milk**',
      '- 1-9 cartons: SGD $130/carton',
      '- 10-29 cartons: SGD $117/carton',
      '- 30+ cartons: SGD $104/carton',
      '',
      'Each carton contains **50 pouches**.'
    ].join('\n');
  }

  if (
    q.includes('dairy') ||
    q.includes('vegan') ||
    q.includes('oat') ||
    q.includes('sugar')
  ) {
    return [
      'ESPRESSGO Original is dairy-free.',
      '',
      'ESPRESSGO Oat Milk uses plant-based oat milk and is also dairy-free and vegan-friendly.',
      '',
      'For full ingredient or procurement details, contact the team through the Contact page.'
    ].join('\n');
  }

  const orderAction = parseOrderAction(question);

  if (orderAction) {
    return [
      `Sure — I can draft **${orderAction.cartons} carton${orderAction.cartons > 1 ? 's' : ''}** of **${orderAction.productName}** into your cart.`,
      '',
      'Please review the cart and confirm checkout before submitting the order.',
      '',
      `[[ORDER_ACTION: ${orderAction.productId}, ${orderAction.cartons}]]`
    ].join('\n');
  }

  return [
    'Hello! I am the ESPRESSGO B2B assistant.',
    '',
    'I can help with:',
    '- product information',
    '- wholesale pricing',
    '- delivery timelines',
    '- caffeine and ingredients',
    '- carton quantities',
    '- B2B enquiries',
    '',
    'For custom procurement, contracts, or event partnerships, contact Damien through <a href="https://wa.me/6587977961" target="_blank">WhatsApp</a>.'
  ].join('\n');
}


/* ============================================================
   Helper: detect simple order requests in fallback mode
   ============================================================ */

function parseOrderAction(question) {
  const q = question.toLowerCase();

  const qtyMatch = q.match(/(\d+)\s*(carton|cartons|box|boxes)/);

  if (!qtyMatch) return null;

  const cartons = parseInt(qtyMatch[1], 10);

  if (!cartons || cartons <= 0) return null;

  if (
    q.includes('original') ||
    q.includes('classic') ||
    q.includes('robusta')
  ) {
    return {
      productId: 'espressgo-original',
      productName: 'ESPRESSGO Original',
      cartons
    };
  }

  if (
    q.includes('oat') ||
    q.includes('oat milk') ||
    q.includes('milk')
  ) {
    return {
      productId: 'espressgo-oatmilk',
      productName: 'ESPRESSGO Oat Milk',
      cartons
    };
  }

  return null;
}


/* ============================================================
   Helper: referer
   ============================================================ */

function getReferer(req) {
  const host = req.headers.host;

  if (!host) {
    return 'https://espressgo-b2b-portal.vercel.app';
  }

  const proto = req.headers['x-forwarded-proto'] || 'https';

  return `${proto}://${host}`;
}

