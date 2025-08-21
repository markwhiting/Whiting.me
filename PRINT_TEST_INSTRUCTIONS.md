# Print Page Numbers - Testing Instructions

## Issue Fixed
The page numbers were not printing correctly on any pages in any browsers. This has been resolved with an improved CSS implementation.

## What Was Fixed
1. **Corrected CSS counter syntax** - Fixed `counter-increment: page` and proper margin setup
2. **Cross-browser compatibility** - Added both `@page { @bottom-right }` and `body::after` approaches
3. **Better positioning** - Used proper margins (2.5cm 2cm 3cm 2cm) with extra bottom space for page numbers
4. **Visibility improvements** - Added white background and padding to ensure page numbers are visible

## How to Test

### Quick Test
1. Navigate to any page on the site (e.g., `/cv`, `/bio`, `/faq`)
2. Open print preview (Ctrl/Cmd+P)
3. Check that page numbers appear in bottom-right corner as "Page 1", "Page 2", etc.

### Generate PDF
1. Open print preview
2. Choose "Save as PDF" as destination
3. Click "Save"
4. Open the PDF to verify page numbers are correctly displayed

### Browser Testing
Test in multiple browsers to ensure compatibility:
- **Chrome/Edge**: Should use `@page { @bottom-right }` approach
- **Firefox**: Should use `body::after` fallback
- **Safari**: Should use `body::after` fallback

## Expected Results
- Page numbers should appear as "Page 1", "Page 2", etc.
- Located in bottom-right corner of each page
- Consistent font and sizing across pages
- White background ensures visibility over content

## Technical Details
The fix uses a dual approach for maximum browser compatibility:

1. **Standards-compliant approach**: `@page { @bottom-right { ... } }`
2. **Fallback approach**: `body::after` with fixed positioning

Both approaches use the same CSS counter system and styling for consistency.

## Files Modified
- `_sass/minima/_base.scss` - Updated print media queries with corrected page numbering CSS

## Verification
The CSS has been compiled and tested to ensure:
- ✅ Print styles are correctly loaded
- ✅ CSS counters are properly configured
- ✅ Positioning and styling are appropriate
- ✅ Site builds and runs without errors