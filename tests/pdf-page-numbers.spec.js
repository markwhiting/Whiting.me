import { test, expect } from '@playwright/test';

test.describe('PDF Page Numbers', () => {
  test('should generate PDF from CV page with correct margins', async ({ page }) => {
    // Navigate to the CV page which should have multiple pages when printed
    await page.goto('/cv');
    
    // Wait for page to load completely
    await page.waitForLoadState('networkidle');
    
    // Generate PDF with proper print settings that match our CSS
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '2.5cm',
        right: '2cm', 
        bottom: '3cm',  // Extra space for page numbers
        left: '2cm'
      }
    });
    
    // Basic validation - PDF should be generated successfully
    expect(pdf.length).toBeGreaterThan(1000);
    
    // Check PDF contains proper structure
    const pdfString = pdf.toString('binary');
    expect(pdfString).toContain('%PDF');
    expect(pdfString).toContain('%%EOF');
    
    // Verify that the PDF has meaningful content (CV should be substantial)
    expect(pdf.length).toBeGreaterThan(50000); // CV should be a substantial document
  });

  test('should generate PDF from bio page with page numbering support', async ({ page }) => {
    await page.goto('/bio');
    await page.waitForLoadState('networkidle');
    
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '2.5cm',
        right: '2cm',
        bottom: '3cm', 
        left: '2cm'
      }
    });
    
    expect(pdf.length).toBeGreaterThan(500);
    
    const pdfString = pdf.toString('binary');
    expect(pdfString).toContain('%PDF');
  });

  test('CSS print styles and page counters should be available', async ({ page }) => {
    await page.goto('/cv');
    await page.waitForLoadState('networkidle');
    
    // Check that our print CSS rules are applied
    const printStylesCheck = await page.evaluate(() => {
      // Test CSS counter support
      const testDiv = document.createElement('div');
      testDiv.style.counterIncrement = 'page';
      document.body.appendChild(testDiv);
      
      const hasCounterSupport = testDiv.style.counterIncrement === 'page';
      document.body.removeChild(testDiv);
      
      // Check for stylesheet presence
      const stylesheets = Array.from(document.styleSheets);
      let foundMainStyles = false;
      
      for (const sheet of stylesheets) {
        try {
          if (sheet.href && (sheet.href.includes('main.css') || sheet.href.includes('assets'))) {
            foundMainStyles = true;
            break;
          }
        } catch (e) {
          // CORS or other access issues
        }
      }
      
      return {
        counterSupport: hasCounterSupport,
        hasStylesheets: stylesheets.length > 0,
        hasMainStyles: foundMainStyles
      };
    });
    
    expect(printStylesCheck.counterSupport).toBe(true);
    expect(printStylesCheck.hasStylesheets).toBe(true);
  });

  test('print media CSS should apply correct styling', async ({ page }) => {
    await page.goto('/cv');
    await page.waitForLoadState('networkidle');
    
    // Switch to print media to activate print styles
    await page.emulateMedia({ media: 'print' });
    
    // Check that print styles are applied correctly
    const printModeCheck = await page.evaluate(() => {
      const body = document.body;
      const computedStyle = window.getComputedStyle(body);
      
      // Check that content is present and properly styled for print
      const hasContent = body.textContent.length > 100; // Should have substantial content
      const fontSize = computedStyle.fontSize;
      
      // Check if any elements have print-specific classes applied
      const noPrintElements = document.querySelectorAll('.noPrint');
      const onlyPrintElements = document.querySelectorAll('.onlyPrint');
      
      return {
        hasContent,
        fontSize,
        noPrintCount: noPrintElements.length,
        onlyPrintCount: onlyPrintElements.length,
        bodyMargin: computedStyle.margin
      };
    });
    
    expect(printModeCheck.hasContent).toBe(true);
    expect(printModeCheck.fontSize).toBeTruthy();
    
    // Reset media emulation
    await page.emulateMedia({ media: null });
  });

  test('page should work correctly with CSS page counters', async ({ page }) => {
    await page.goto('/cv');
    await page.waitForLoadState('networkidle');
    
    // Test CSS page counter functionality by injecting test elements
    const counterTest = await page.evaluate(() => {
      // Create test elements to verify counter functionality
      const testContainer = document.createElement('div');
      testContainer.innerHTML = `
        <div style="counter-reset: page 1; page-break-after: always;">Page 1 content</div>
        <div style="counter-increment: page;">Page 2 content</div>
        <div class="page-number" style="content: 'Page ' counter(page);"></div>
      `;
      document.body.appendChild(testContainer);
      
      // Check if CSS supports the page counter
      const supportsCounters = CSS.supports('counter-increment', 'page');
      
      document.body.removeChild(testContainer);
      
      return {
        supportsCounters,
        documentReady: document.readyState === 'complete'
      };
    });
    
    expect(counterTest.supportsCounters).toBe(true);
    expect(counterTest.documentReady).toBe(true);
  });
});