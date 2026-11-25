const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://campmatch-7f53.onrender.com/', { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  
  const content = await page.content();
  console.log('PAGE_TITLE:', page.title());
  console.log('HAS_CAMPCHAMP:', content.includes('Campmatch'));
  console.log('HAS_SIGNIN_BUTTON:', content.includes('Sign in with campus email'));
  console.log('CONTENT_LENGTH:', content.length);
  
  // Click sign in with campus email
  try {
    await page.click('button:has-text("Sign in with campus email")');
    await page.waitForTimeout(2000);
    const content2 = await page.content();
    console.log('HAS_AUTH_MODAL:', content2.includes('Create your account') || content2.includes('Welcome back'));
    console.log('HAS_EMAIL_FIELD:', content2.includes('Student Email') || content2.includes('name@ug.edu.gh'));
  } catch(e) {
    console.log('CLICK_ERROR:', e.message);
  }
  
  await browser.close();
})();