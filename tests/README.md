# Automated Testing for PDF Page Numbers

This directory contains automated tests to verify that page numbers are correctly included when generating PDFs from the website pages.

## Test Overview

The tests use Playwright to:
1. Navigate to different pages of the website (CV, Bio, etc.)
2. Generate PDFs with proper print settings
3. Verify that PDFs are generated correctly with appropriate margins
4. Check that print CSS styles are loaded and applied

## Tests Included

- **PDF Generation Tests**: Verify PDFs can be generated from CV and Bio pages
- **CSS Print Styles Tests**: Ensure print media CSS is loaded correctly  
- **Print Preview Tests**: Check that print mode renders properly

## Running Tests

### Prerequisites
- Node.js 18+
- Ruby 3.0+ with bundler
- Jekyll site running locally

### Local Testing
```bash
# Install dependencies
npm install
bundle install

# Start Jekyll server (in separate terminal)
bundle exec jekyll serve --host 0.0.0.0 --port 4000

# Run tests
npm test
```

### CI/CD Testing
Tests run automatically in GitHub Actions on every push:
- Jekyll site is built and served
- Playwright tests are executed
- Results are uploaded as artifacts

## What the Tests Verify

1. **PDF Generation**: Pages can be converted to PDF format
2. **Print Margins**: Proper margins (2.5cm top, 2cm sides, 3cm bottom) are applied
3. **CSS Loading**: Print-specific stylesheets are loaded
4. **Page Content**: Content is properly rendered in print mode

## Expected Behavior

When working correctly:
- PDFs should be generated without errors
- Page numbers should appear in bottom-right corner as "Page 1", "Page 2", etc.
- Print styles should provide adequate spacing for page numbers
- Content should be properly formatted for printing

## Troubleshooting

If tests fail:
1. Check that Jekyll server is running on port 4000
2. Verify CSS print styles in `_sass/minima/_base.scss`
3. Check browser console for JavaScript errors
4. Review test output in GitHub Actions artifacts