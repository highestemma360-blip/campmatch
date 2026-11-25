import { test, expect } from '@playwright/test'

test.describe('Campmatch - Auth Flow Tests', () => {

  test('AUTH: signup with valid .edu.gh email', async ({ page }) => {
    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.waitForTimeout(3000)
    
    const createBtn = page.locator('button:has-text("Create account"), button:has-text("Join Campmatch Today")').first()
    if (await createBtn.isVisible({ timeout: 5000 })) {
      await createBtn.click()
      await page.waitForTimeout(2000)
      
      const emailInput = page.locator('input[name="email"]')
      if (await emailInput.isVisible({ timeout: 5000 })) {
        const email = `test${Date.now()}@st.umat.edu.gh`
        await emailInput.fill(email)
        await page.fill('input[name="password"]', 'Test1234!')
        await page.click('button:has-text("Create account")')
        await page.waitForTimeout(3000)
        
        const bodyText = await page.locator('body').textContent()
        console.log('AFTER SIGNUP BODY (first 500):', bodyText?.substring(0, 500))
        
        // Check if we're redirected to profile or onboarding
        const url = page.url()
        console.log('URL AFTER SIGNUP:', url)
        
        // Check for error messages
        const errorMsg = await page.locator('.auth-modal-err, text=error, text=Error').first()
        if (await errorMsg.isVisible({ timeout: 2000 })) {
          console.log('SIGNUP ERROR:', await errorMsg.textContent())
        }
      } else {
        console.log('EMAIL INPUT NOT FOUND IN MODAL')
      }
    } else {
      console.log('CREATE ACCOUNT BUTTON NOT FOUND')
    }
  })

  test('AUTH: login with valid .edu.gh email', async ({ page }) => {
    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.waitForTimeout(3000)
    
    const signinBtn = page.locator('button:has-text("Sign in")').first()
    if (await signinBtn.isVisible({ timeout: 5000 })) {
      await signinBtn.click()
      await page.waitForTimeout(2000)
      
      const emailInput = page.locator('input[name="email"]')
      if (await emailInput.isVisible({ timeout: 5000 })) {
        await emailInput.fill('test@st.umat.edu.gh')
        await page.fill('input[name="password"]', 'wrongpassword')
        await page.click('button:has-text("Sign in")')
        await page.waitForTimeout(3000)
        
        const errorMsg = await page.locator('.auth-modal-err').first()
        if (await errorMsg.isVisible({ timeout: 2000 })) {
          console.log('LOGIN ERROR (expected for wrong password):', await errorMsg.textContent())
        }
      }
    }
  })

  test('API: direct signup test', async ({ page, context }) => {
    const email = `apitest${Date.now()}@st.umat.edu.gh`
    const res = await context.request.post('http://localhost:8000/api/signup', {
      data: { email, password: 'Test1234!' }
    })
    console.log('API SIGNUP STATUS:', res.status())
    const body = await res.json()
    console.log('API SIGNUP BODY:', JSON.stringify(body).substring(0, 500))
    
    if (res.ok()) {
      // Now test login with the created account
      const loginRes = await context.request.post('http://localhost:8000/api/login', {
        data: { email, password: 'Test1234!' }
      })
      console.log('API LOGIN STATUS:', loginRes.status())
      const loginBody = await loginRes.json()
      console.log('API LOGIN BODY:', JSON.stringify(loginBody).substring(0, 500))
      
      if (loginRes.ok()) {
        // Test authenticated endpoint
        const token = loginBody.access_token
        const meRes = await context.request.get('http://localhost:8000/api/me', {
          headers: { Authorization: `Bearer ${token}` }
        })
        console.log('API /ME STATUS:', meRes.status())
        const meBody = await meRes.json()
        console.log('API /ME BODY:', JSON.stringify(meBody).substring(0, 500))
      }
    }
  })

  test('API: profile update test', async ({ page, context }) => {
    // Create account first
    const email = `profiletest${Date.now()}@st.umat.edu.gh`
    const signupRes = await context.request.post('http://localhost:8000/api/signup', {
      data: { email, password: 'Test1234!' }
    })
    console.log('PROFILE TEST SIGNUP:', signupRes.status())
    
    const loginRes = await context.request.post('http://localhost:8000/api/login', {
      data: { email, password: 'Test1234!' }
    })
    const loginBody = await loginRes.json()
    const token = loginBody.access_token
    
    // Get current profile
    const meRes = await context.request.get('http://localhost:8000/api/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
    const meBody = await meRes.json()
    console.log('CURRENT PROFILE NAME:', meBody.name, 'COURSE:', meBody.course)
    
    // Update profile
    const updateRes = await context.request.post('http://localhost:8000/api/profile', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        name: 'Test Student',
        level: '200',
        age: 20,
        course: 'Computer Science',
        gender: 'male',
        interested_in: 'female',
        bio: 'Test bio for profile update',
        min_age: 18,
        max_age: 30,
        preferred_levels: '',
        show_me: 'everyone',
        max_distance_km: 50,
        verified_only: false,
        snoozed: false,
        mode: 'date',
        looking_for: 'Long-term partner',
        interests: [],
        explore_vibes: [],
        prompts: [],
        opening_move: '',
        hall: '',
        zodiac: '',
        height: '',
        spotify_anthem: '',
        photo_urls: []
      }
    })
    console.log('PROFILE UPDATE STATUS:', updateRes.status())
    const updateBody = await updateRes.json()
    console.log('PROFILE UPDATE BODY:', JSON.stringify(updateBody).substring(0, 500))
    
    // Verify profile was updated
    const meRes2 = await context.request.get('http://localhost:8000/api/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
    const meBody2 = await meRes.json()
    console.log('UPDATED PROFILE NAME:', meBody2.name, 'COURSE:', meBody2.course, 'BIO:', meBody2.bio)
  })

  test('API: deck endpoint', async ({ page, context }) => {
    const email = `decktest${Date.now()}@st.umat.edu.gh`
    await context.request.post('http://localhost:8000/api/signup', {
      data: { email, password: 'Test1234!' }
    })
    const loginRes = await context.request.post('http://localhost:8000/api/login', {
      data: { email, password: 'Test1234!' }
    })
    const token = (await loginRes.json()).access_token
    
    const deckRes = await context.request.get('http://localhost:8000/api/deck', {
      headers: { Authorization: `Bearer ${token}` }
    })
    console.log('DECK STATUS:', deckRes.status())
    const deckBody = await deckRes.json()
    console.log('DECK LENGTH:', Array.isArray(deckBody) ? deckBody.length : 'not array')
    console.log('DECK BODY (first 300):', JSON.stringify(deckBody).substring(0, 300))
  })
})
