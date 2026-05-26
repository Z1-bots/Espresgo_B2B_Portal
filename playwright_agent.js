// playwright_agent.js - Automated B2B AI Order Placement Agent

const { chromium } = require('playwright');

// Simulate the AI-parsed order parameters from the client conversation:
// Client request: "Order 4 cartons (200 pouches) of Original to 1 Marina Boulevard"
const mockAiParsedOrder = {
  productName: 'ESPRESSGO Original', // Brand matching
  productId: 'espressgo-original',
  cartons: 4,                        // 4 cartons × 50 pouches = 200 pouches B2B order
  deliveryAddress: '1 Marina Boulevard, Singapore 018989'
};

async function executeB2BOrderAgent(orderSpec) {
  console.log('=====================================================');
  console.log('🤖 ESPRESSGO AI PLAYWRIGHT B2B ORDER AGENT ACTIVATED');
  console.log('=====================================================');
  console.log(`📦 Order Target:  ${orderSpec.cartons} cartons of ${orderSpec.productName}`);
  console.log(`📍 Delivery Dest: ${orderSpec.deliveryAddress}`);
  console.log('=====================================================\n');

  // Launch browser with headless: false so we can watch the automation click-through!
  console.log('🚀 Launching automated Chromium browser...');
  const browser = await chromium.launch({ headless: false, slowMo: 120 });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Navigate to the ESPRESSGO login page (targeting your running Python local server)
    console.log('🌐 Navigating to local ESPRESSGO portal login page...');
    await page.goto('http://localhost:8000/login.html');

    // 2. Perform automated login using B2B credentials
    console.log('🔐 Entering B2B buyer credentials...');
    await page.fill('#email', 'test@gmail.com');
    await page.fill('#password', '123');

    console.log('🚪 Clicking Sign In button...');
    await page.click('button[type="submit"]');

    // Wait for successful redirection to catalog
    await page.waitForURL('**/catalog.html');
    console.log('🎉 Login successful! Arrived at ESPRESSGO B2B Catalog.');

    // 3. Search and Add item to the Cart
    console.log(`🛒 Locating ${orderSpec.productName} carton stepper...`);
    const productCard = page.locator(`.product-card:has-text("${orderSpec.productName}")`);
    
    // Wait for the stepper input to render
    const stepperInput = productCard.locator('.stepper-input');
    await stepperInput.waitFor({ state: 'visible' });

    // Input the cartons quantity dynamically
    console.log(`✨ Automating carton entry: "${orderSpec.cartons}" cartons`);
    await stepperInput.fill(String(orderSpec.cartons));
    await stepperInput.press('Enter');

    // 4. Click sticky bottom checkout bar
    console.log('💳 Locating checkout sticky panel...');
    const checkoutBtn = page.locator('#checkout-btn');
    await checkoutBtn.waitFor({ state: 'visible' });
    
    console.log('👉 Auto-clicking B2B Checkout button...');
    await checkoutBtn.click();

    // 5. Open Modal & Submit B2B Order
    console.log('📝 Waiting for confirmation modal...');
    const placeOrderBtn = page.locator('#modal-place');
    await placeOrderBtn.waitFor({ state: 'visible' });

    console.log('🚀 Finalizing order authorization...');
    await placeOrderBtn.click();

    // 6. Verify success toast is visible
    console.log('🔍 Checking order verification toast...');
    const successToast = page.locator('#order-success');
    await successToast.waitFor({ state: 'visible', timeout: 5000 });
    
    const toastText = await successToast.textContent();
    console.log('\n=====================================================');
    console.log('✅ B2B ORDER COMPLETED SUCCESSFULLY BY AI ROBOT!');
    console.log(`📢 Server Toast response: "${toastText.trim()}"`);
    console.log('=====================================================');

  } catch (error) {
    console.error('\n❌ Playwright Agent automation failed:', error);
  } finally {
    console.log('\n🏁 Closing automated session in 3 seconds...');
    await page.waitForTimeout(3000); // Allow time to view the completed order
    await browser.close();
  }
}

// Start the automation bot!
executeB2BOrderAgent(mockAiParsedOrder);
