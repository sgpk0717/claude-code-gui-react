const { chromium } = require('playwright');

async function testDragIssue() {
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true 
  });
  const page = await browser.newPage();
  
  // Go to the app
  await page.goto('http://localhost:7003');
  await page.waitForTimeout(2000);
  
  // Create a new session
  console.log('Creating new session...');
  await page.click('button:has-text("+ 새 세션")');
  await page.waitForTimeout(1000);
  
  // Select a directory
  const dirButton = await page.locator('button:has-text("claude-code-gui")').first();
  if (await dirButton.isVisible()) {
    await dirButton.click();
  } else {
    // Input directory manually
    await page.fill('input[placeholder="/path/to/your/project"]', '/Users/seonggukpark/claude-code-gui');
  }
  
  await page.click('button:has-text("생성")');
  await page.waitForTimeout(2000);
  
  // Now let's test dragging
  console.log('Testing drag...');
  
  // Listen for console logs
  page.on('console', msg => {
    if (msg.text().includes('Drag start') || msg.text().includes('Setting initial')) {
      console.log('Console:', msg.text());
    }
  });
  
  // Find the window header
  const windowHeader = await page.locator('.window-header').first();
  const box = await windowHeader.boundingBox();
  
  if (box) {
    console.log('Window initial position:', box);
    
    // Start dragging
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    
    // Wait a moment to see if size changes
    await page.waitForTimeout(500);
    
    // Get the window size after mouse down
    const windowDiv = await page.locator('.bg-white.border.rounded-lg.shadow-lg').first();
    const sizeAfterMouseDown = await windowDiv.evaluate(el => ({
      width: el.offsetWidth,
      height: el.offsetHeight
    }));
    
    console.log('Size after mouse down:', sizeAfterMouseDown);
    
    // Move the mouse
    await page.mouse.move(box.x + 100, box.y + 50);
    await page.waitForTimeout(500);
    
    // Get size during drag
    const sizeDuringDrag = await windowDiv.evaluate(el => ({
      width: el.offsetWidth,
      height: el.offsetHeight
    }));
    
    console.log('Size during drag:', sizeDuringDrag);
    
    // Release
    await page.mouse.up();
    
    // Final size
    const finalSize = await windowDiv.evaluate(el => ({
      width: el.offsetWidth,
      height: el.offsetHeight
    }));
    
    console.log('Final size:', finalSize);
    
    // Check if size changed
    if (sizeAfterMouseDown.width !== finalSize.width || sizeAfterMouseDown.height !== finalSize.height) {
      console.log('❌ Window size changed during drag!');
      console.log(`Width: ${sizeAfterMouseDown.width} -> ${finalSize.width}`);
      console.log(`Height: ${sizeAfterMouseDown.height} -> ${finalSize.height}`);
    } else {
      console.log('✅ Window size remained constant');
    }
  }
  
  // Keep browser open for manual inspection
  console.log('\nPress Ctrl+C to close the browser...');
  await page.waitForTimeout(300000);
}

testDragIssue().catch(console.error);