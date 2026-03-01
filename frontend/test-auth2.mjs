import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('request', request => console.log('REQUEST:', request.method(), request.url()));
  page.on('response', response => console.log('RESPONSE:', response.status(), response.url()));

  try {
    console.log("Navigating to auth...");
    await page.goto('http://localhost:5173/auth');
    await page.waitForTimeout(1000);
    
    console.log("Filling form...");
    await page.fill('input[name="email"]', 'dev@test.com');
    await page.fill('input[name="password"]', 'password');
    
    console.log("Clicking Sign In...");
    await page.click('button[type="submit"]', { force: true });
    
    await page.waitForTimeout(3000);
    
    const html = await page.content();
    console.log("Button text was:", await page.locator('button[type="submit"]').textContent());
  } catch (err) {
    console.log('Error:', err.message);
  } finally {
    await browser.close();
  }
})();
