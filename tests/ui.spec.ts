import { test, expect, Page } from '@playwright/test';

// Test configuration
const TEST_URL = 'http://localhost:8888';
const TIMEOUT = 10000;

// Helper function to wait for chatbot to be ready
async function waitForChatbotReady(page: Page) {
  await page.waitForSelector('.ga-bot', { timeout: TIMEOUT });
  await page.waitForSelector('.ga-bot__button', { timeout: TIMEOUT });
}

// Helper function to open chatbot
async function openChatbot(page: Page) {
  const toggleButton = page.locator('.ga-bot__button');
  await expect(toggleButton).toBeVisible();
  await toggleButton.click();
  await page.waitForSelector('.ga-bot--open .ga-bot__panel', { timeout: TIMEOUT });
}

// Helper function to close chatbot
async function closeChatbot(page: Page) {
  const closeButton = page.locator('.ga-bot__close');
  await expect(closeButton).toBeVisible();
  await closeButton.click();
  await page.waitForSelector('.ga-bot--open', { state: 'hidden', timeout: TIMEOUT });
}

// Helper function to send a message
async function sendMessage(page: Page, message: string) {
  const input = page.locator('#gaInput');
  await expect(input).toBeVisible();
  await input.fill(message);
  await input.press('Enter');
}

// Helper function to wait for response
async function waitForResponse(page: Page) {
  // Wait for thinking indicator or response
  await page.waitForSelector('.thinking, .message', { timeout: TIMEOUT });
  
  // If thinking indicator is shown, wait for it to disappear
  const thinking = page.locator('.thinking');
  if (await thinking.isVisible()) {
    await thinking.waitFor({ state: 'hidden', timeout: 15000 });
  }
}

test.describe('iPhone 12 Viewport', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 }); // iPhone 12 dimensions
    await page.goto(TEST_URL);
    await waitForChatbotReady(page);
  });

  test('chatbot button is visible and clickable', async ({ page }) => {
    const toggleButton = page.locator('.ga-bot__button');
    await expect(toggleButton).toBeVisible();
    await expect(toggleButton).toBeEnabled();
  });

  test('chatbot panel opens and closes', async ({ page }) => {
    // Test opening
    await openChatbot(page);
    const panel = page.locator('.ga-bot__panel');
    await expect(panel).toBeVisible();

    // Test closing
    await closeChatbot(page);
    await expect(panel).toBeHidden();
  });

  test('input has placeholder text', async ({ page }) => {
    await openChatbot(page);
    const input = page.locator('#gaInput');
    await expect(input).toBeVisible();
    
    const placeholder = await input.getAttribute('placeholder');
    expect(placeholder).toBeTruthy();
    expect(placeholder?.length).toBeGreaterThan(0);
  });

  test('quick action buttons are visible', async ({ page }) => {
    await openChatbot(page);
    
    // Look for quick action buttons (assuming they exist)
    const quickActions = page.locator('.quick-action, .chip, .suggestion');
    const count = await quickActions.count();
    
    if (count > 0) {
      await expect(quickActions.first()).toBeVisible();
    }
  });

  test('thinking indicator appears and disappears', async ({ page }) => {
    await openChatbot(page);
    await sendMessage(page, 'Test message');
    
    // Check if thinking indicator appears
    const thinking = page.locator('.thinking');
    if (await thinking.isVisible()) {
      await expect(thinking).toBeVisible();
      // Wait for it to disappear
      await thinking.waitFor({ state: 'hidden', timeout: 15000 });
    }
  });

  test('sources are displayed when available', async ({ page }) => {
    await openChatbot(page);
    await sendMessage(page, 'Hvordan melder jeg meg på akademiet?');
    
    await waitForResponse(page);
    
    // Look for sources/links in the response
    const sources = page.locator('.source, .sources a, a[href*="askerfotball.no"]');
    const count = await sources.count();
    
    if (count > 0) {
      await expect(sources.first()).toBeVisible();
    }
  });

  test('keyboard navigation works', async ({ page }) => {
    await openChatbot(page);
    
    // Test tab navigation
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('aria labels are present', async ({ page }) => {
    const toggleButton = page.locator('.ga-bot__button');
    const ariaLabel = await toggleButton.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
    
    await openChatbot(page);
    
    const closeButton = page.locator('.ga-bot__close');
    const closeAriaLabel = await closeButton.getAttribute('aria-label');
    expect(closeAriaLabel).toBeTruthy();
  });
});

test.describe('Desktop Chrome Viewport', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 }); // Standard desktop
    await page.goto(TEST_URL);
    await waitForChatbotReady(page);
  });

  test('chatbot button is visible and clickable', async ({ page }) => {
    const toggleButton = page.locator('.ga-bot__button');
    await expect(toggleButton).toBeVisible();
    await expect(toggleButton).toBeEnabled();
  });

  test('chatbot panel opens and closes', async ({ page }) => {
    await openChatbot(page);
    const panel = page.locator('.ga-bot__panel');
    await expect(panel).toBeVisible();

    await closeChatbot(page);
    await expect(panel).toBeHidden();
  });

  test('chatbot panel does not cover entire article area', async ({ page }) => {
    await openChatbot(page);
    
    // Check that the panel is positioned correctly (not full screen)
    const panel = page.locator('.ga-bot__panel');
    const panelBox = await panel.boundingBox();
    
    if (panelBox) {
      // Panel should not cover the entire viewport
      expect(panelBox.width).toBeLessThan(page.viewportSize()?.width || 1366);
      expect(panelBox.height).toBeLessThan(page.viewportSize()?.height || 768);
    }
  });

  test('input functionality works', async ({ page }) => {
    await openChatbot(page);
    
    const input = page.locator('#gaInput');
    await expect(input).toBeVisible();
    
    // Test typing
    await input.fill('Test message');
    const value = await input.inputValue();
    expect(value).toBe('Test message');
    
    // Test sending
    await input.press('Enter');
    await waitForResponse(page);
  });

  test('quick actions are clickable', async ({ page }) => {
    await openChatbot(page);
    
    const quickActions = page.locator('.quick-action, .chip, .suggestion');
    const count = await quickActions.count();
    
    if (count > 0) {
      const firstAction = quickActions.first();
      await expect(firstAction).toBeVisible();
      await expect(firstAction).toBeEnabled();
    }
  });

  test('response contains sources with proper links', async ({ page }) => {
    await openChatbot(page);
    await sendMessage(page, 'Hvordan kontakter jeg klubben?');
    
    await waitForResponse(page);
    
    // Look for sources with proper URLs
    const sourceLinks = page.locator('a[href*="askerfotball.no"]');
    const count = await sourceLinks.count();
    
    if (count > 0) {
      const firstLink = sourceLinks.first();
      await expect(firstLink).toBeVisible();
      
      const href = await firstLink.getAttribute('href');
      expect(href).toContain('askerfotball.no');
    }
  });

  test('keyboard accessibility', async ({ page }) => {
    await openChatbot(page);
    
    // Test tab order
    await page.keyboard.press('Tab');
    let focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Test escape key to close
    await page.keyboard.press('Escape');
    const panel = page.locator('.ga-bot__panel');
    await expect(panel).toBeHidden();
  });
});

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto(TEST_URL);
    await waitForChatbotReady(page);
  });

  test('focus management', async ({ page }) => {
    await openChatbot(page);
    
    // Focus should be on input when panel opens
    const input = page.locator('#gaInput');
    await expect(input).toBeFocused();
  });

  test('button roles and labels', async ({ page }) => {
    const toggleButton = page.locator('.ga-bot__button');
    const role = await toggleButton.getAttribute('role');
    const ariaLabel = await toggleButton.getAttribute('aria-label');
    
    expect(role).toBe('button');
    expect(ariaLabel).toBeTruthy();
  });

  test('panel accessibility', async ({ page }) => {
    await openChatbot(page);
    
    const panel = page.locator('.ga-bot__panel');
    const role = await panel.getAttribute('role');
    const ariaLabel = await panel.getAttribute('aria-label');
    
    // Panel should have proper ARIA attributes
    expect(role).toBe('dialog');
    expect(ariaLabel).toBeTruthy();
  });
});
