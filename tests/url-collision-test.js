const fs = require('fs')
const path = require('path')

console.log('Running URL collision test...')

const postsDir = path.join(__dirname, '..', '_posts')

// Check if _posts directory exists
if (!fs.existsSync(postsDir)) {
  console.log('SKIP: No _posts directory found')
  process.exit(0)
}

const files = fs.readdirSync(postsDir).filter(f =>
  f.endsWith('.markdown') || f.endsWith('.md')
)

if (files.length === 0) {
  console.log('SKIP: No posts found')
  process.exit(0)
}

// Extract URL slugs from filenames
// Jekyll filename format: YYYY-MM-DD-title.md
// Note: With `permalink: /:title/`, Jekyll uses the post's front matter `title` to generate the URL.
// This script approximates potential collisions by deriving a slug from the filename's title portion.
const slugs = new Map()

for (const file of files) {
  // Remove date prefix (YYYY-MM-DD-) and extension
  const match = file.match(/^\d{4}-\d{2}-\d{2}-(.+)\.(markdown|md)$/)

  if (!match) {
    console.warn(`WARN: File "${file}" doesn't match expected format`)
    continue
  }

  // Jekyll converts spaces to hyphens and lowercases the slug
  const slug = match[1].toLowerCase().replace(/\s+/g, '-')

  if (slugs.has(slug)) {
    console.error(`FAIL: URL collision detected!`)
    console.error(`  Slug: /${slug}/`)
    console.error(`  File 1: ${slugs.get(slug)}`)
    console.error(`  File 2: ${file}`)
    console.error(`Both posts would generate the same URL.`)
    process.exit(1)
  }

  slugs.set(slug, file)
}

console.log(`PASS: No URL collisions found (${files.length} posts checked)`)
process.exit(0)
