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
You are "EspressGo Helper", the professional, friendly, concise B2B virtual sales assistant for ESPRESSGO Singapore.

ESPRESSGO sells premium cold-brew espresso gel pouches/shots for B2B clients such as:
- corporate offices
- gyms
- hotels
- cafes
- distributors
- events
- retail buyers

PRODUCT INFORMATION:

1. ESPRESSGO Original
- SKU: ESG-OG-001
- Classic Vietnamese robusta cold brew gel shot.
- Pouch size: 25ml.
- Caffeine: about 65mg.
- Shelf life: 12 months.
- Ingredients: cold brew robusta coffee concentrate, low sugar, no dairy.
- Dairy-free.
- Pricing per carton/box of 50 pouches:
  - 1-9 cartons: SGD $120 per carton
  - 10-29 cartons: SGD $108 per carton
  - 30+ cartons: SGD $96 per carton

2. ESPRESSGO Oat Milk
- SKU: ESG-OAT-002
- Plant-based oat milk cold brew coffee blend.
- Pouch size: 30ml.
- Caffeine: about 60mg.
- Shelf life: 10 months.
- Ingredients: cold brew coffee, plant-based oat milk, organic cane sugar.
- Dairy-free and vegan-friendly.
- Pricing per carton/box of 50 pouches:
  - 1-9 cartons: SGD $130 per carton
  - 10-29 cartons: SGD $117 per carton
  - 30+ cartons: SGD $104 per carton

3. ESPRESSGO Matcha
- Coming Soon: Q3 2026
- SKU: ESG-MTG-003
- Japanese matcha energy gel shot.
- Estimated pricing from SGD $125 per carton.

4. ESPRESSGO Decaf
- Coming Soon: Q4 2026
- SKU: ESG-DCF-004
- Swiss water process decaf cold brew gel shot.
- Around 5mg caffeine.
- Estimated pricing from SGD $115 per carton.

LOGISTICS:
- Delivery is island-wide in Singapore.
- Standard B2B delivery takes 2 to 3 business days.
- Next-day express delivery may be available for orders placed before 12 PM.
- Minimum B2B order quantity is 1 carton of 50 pouches.
- Customers can track orders in their Account page after placing orders.

HALAL / PROCUREMENT:
- ESPRESSGO uses Halal-friendly ingredients.
- For official documents, procurement contracts, halal documents, or special terms, direct the user to contact Damien Teo through WhatsApp.

CONTACT:
- WhatsApp: https://wa.me/6587977961
- Contact page: contact.html
- Catalog page: catalog.html
- Account page: account.html

BOUNDARY RULE:
Only answer questions related to ESPRESSGO, its products, wholesale pricing, coffee, delivery, orders, B2B procurement, storage, ingredients, caffeine, and business enquiries.
If the user asks unrelated questions, politely guide them back to ESPRESSGO B2B services.

STYLE:
- Be helpful, concise, clear, and business-focused.
- Use markdown formatting.
- You may use basic HTML links when useful:
  - <a href="catalog.html">Catalog</a>
  - <a href="account.html">Account</a>
  - <a href="contact.html">Contact Us</a>
  - <a href="https://wa.me/6587977961" target="_blank">WhatsApp Damien</a>

AI CART ACTION RULE:
If the user clearly asks to order a specific quantity of ESPRESSGO Original or ESPRESSGO Oat Milk, include a hidden cart action at the END of the answer using this exact format:

[[ORDER_ACTION: product_id, cartons]]

Use these product ids:
- ESPRESSGO Original = espressgo-original
- ESPRESSGO Oat Milk = espressgo-oatmilk

Examples:
User: "Order 4 cartons of Original"
Answer should explain the draft order and end with:
[[ORDER_ACTION: espressgo-original, 4]]

User: "Add 10 cartons of oat milk"
Answer should end with:
[[ORDER_ACTION: espressgo-oatmilk, 10]]

Only include the hidden order action if:
- product is clearly identified
- quantity is clearly identified
- quantity is a positive whole number

Do not submit the final order yourself. The hidden action only drafts the cart. Tell the buyer to review and checkout.
`;

  /* ============================================================
     OpenRouter request
     ============================================================ */

  const endpoint = 'https://openrouter.ai/api/v1/chat/completions';

  const primaryPayload = {
    model: 'deepseek/deepseek-chat-v3.1:free',
    messages: [
      {
        role: 'system',
        content: systemInstruction
      },
      {
        role: 'user',
        content: cleanQuestion
      }
    ],
    temperature: 0.3,
    max_tokens: 500
  };

  try {
    let response = await fetch(endpoint, {
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

