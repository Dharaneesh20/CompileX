import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  try {
    console.log("Navigating to auth so we can set local storage on the origin...");
    await page.goto('http://localhost:5173/auth');
    
    await page.evaluate(() => {
        const payload = btoa(JSON.stringify({ user_id: "test", email: "dev@test.com" }));
        localStorage.setItem('token', 'header.' + payload + '.signature');
    });

    console.log("Navigating to dashboard to fetch projects...");
    await page.goto('http://localhost:5173/dashboard');
    await page.waitForTimeout(1000);
    
    console.log("Navigating to editor...");
    await page.goto('http://localhost:5173/editor/69a414850802e342132d640c');
    await page.waitForTimeout(3000);
    
    const html = await page.content();
    console.log("HTML length on editor:", html.length);
  } catch (err) {
    console.log('Error:', err.message);
  } finally {
    await browser.close();
  }
})();
