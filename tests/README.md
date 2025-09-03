# Automated Testing for PDF Page Numbers

This directory contains automated tests to verify that page numbers are correctly included when generating PDFs from the website pages.

## Test Architecture

The testing system uses a **two-tier approach** for maximum reliability:

1. **Basic Tests** (`basic-test.js`): Node.js tests that verify core functionality without requiring browser installation
2. **Browser Tests** (`pdf-page-numbers.spec.js`): Playwright tests that verify actual PDF generation and browser rendering

## Test Overview

### Basic Tests (Always Run)
- Website accessibility and response validation
- Content verification for key pages (homepage, CV, bio)  
- CSS stylesheet loading and compilation verification
- Print CSS implementation validation (all required rules present)
- Cross-page navigation testing

### Browser Tests (When Available)
- PDF generation from CV and Bio pages with correct margins
- Print media CSS application and styling verification
- CSS page counter functionality testing
- Print preview mode validation

## Tests Included

### Core Functionality Tests
- **Server Accessibility**: Verify Jekyll server is running and responding
- **Content Validation**: Check that pages load with expected content
- **CSS Loading**: Ensure stylesheets are properly referenced and compiled
- **Page Accessibility**: Test that key pages (CV, Bio) are accessible and substantial

### Print CSS Validation Tests  
- **CSS File Existence**: Verify print CSS source file exists
- **Required Rules**: Check for all essential page numbering CSS rules:
  - `@page` margin specifications
  - `counter-increment: page` functionality
  - `@bottom-right` standard approach for modern browsers
  - `body::after` fallback approach for compatibility  
  - `counter(page)` usage for page number display
- **CSS Compilation**: Verify print styles are included in compiled CSS

### PDF Generation Tests (Browser Required)
- **PDF Creation**: Generate PDFs from CV and Bio pages
- **Margin Validation**: Ensure proper margins (2.5cm top, 2cm sides, 3cm bottom)
- **CSS Application**: Test print media CSS in browser environment
- **Counter Functionality**: Verify CSS page counters work in browser

## Running Tests

### Prerequisites
- Node.js 18+
- Ruby 3.2+ with bundler
- Jekyll site dependencies installed

### Local Testing

#### Quick Test (Basic functionality only)
```bash
# Install dependencies
npm install
bundle install

# Start Jekyll server (in separate terminal)  
bundle exec jekyll serve --host 0.0.0.0 --port 4000

# Run basic tests (no browser required)
npm run test:basic
```

#### Full Test Suite (Including browser tests)
```bash
# Install dependencies
npm install  
bundle install

# Install Playwright browsers (may require additional system dependencies)
npx playwright install --with-deps chromium

# Start Jekyll server (in separate terminal)
bundle exec jekyll serve --host 0.0.0.0 --port 4000

# Run all tests
npm test
```

### CI/CD Testing

Tests run automatically in GitHub Actions on every push:

1. **Build Phase**: Jekyll site is built using Docker
2. **Basic Tests**: Core functionality verified without browser installation
3. **Browser Installation**: Attempts to install Playwright browsers (with fallback)
4. **Browser Tests**: PDF generation tests (if browsers available)
5. **Results Upload**: Test artifacts uploaded for review

The CI system is designed to **always pass basic tests** even if browser installation fails, ensuring core functionality is always validated.

## What the Tests Verify

### Basic Tests Verify
1. **Jekyll Server**: Responds correctly on expected port
2. **Page Content**: Homepage, CV, and Bio pages load with expected content
3. **CSS Integration**: Stylesheets are properly referenced and compiled
4. **Print CSS Implementation**: All required CSS rules are present:
   - Page margin specifications
   - Counter increment setup
   - Standard `@bottom-right` page numbering
   - Fallback `body::after` page numbering
   - Proper counter usage

### Browser Tests Verify (When Available)
1. **PDF Generation**: Pages convert to PDF format successfully
2. **Print Margins**: Correct margins applied (extra bottom space for page numbers)
3. **CSS Rendering**: Print-specific stylesheets applied in browser
4. **Page Counters**: CSS counters function correctly in browser environment

## Expected Behavior

When working correctly:
- **Basic tests pass consistently** (essential functionality)
- **PDFs generate without errors** (when browser available)
- **Page numbers appear in bottom-right corner** as "Page 1", "Page 2", etc.
- **Print styles provide adequate spacing** for page numbers  
- **Content renders properly** for printing across different browsers

## Browser Compatibility

The print CSS implementation supports:
- **Chrome/Edge**: Uses CSS Paged Media `@page { @bottom-right }` approach
- **Firefox/Safari**: Uses `body::after` fallback approach  
- **All modern browsers**: Should display page numbers correctly

## Troubleshooting

### Basic Tests Failing
1. Check Jekyll server is running: `bundle exec jekyll serve`
2. Verify port 4000 is accessible: `curl http://localhost:4000`
3. Check CSS compilation: Look for `_site/assets/main.css`
4. Verify print CSS in source: Check `_sass/minima/_base.scss`

### Browser Tests Failing  
1. Ensure Playwright browsers installed: `npx playwright install chromium`
2. Check system dependencies for headless browsers
3. Verify Jekyll server accessible to test runner
4. Review Playwright configuration in `playwright.config.js`

### CI/CD Issues
1. Check GitHub Actions logs for specific error messages
2. Verify Ruby and Node.js versions match workflow configuration
3. Review uploaded test artifacts for detailed results
4. Basic tests should always pass even if browser tests fail

The testing system prioritizes **reliability and essential functionality verification** while providing comprehensive browser testing when possible.