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

/**
 * Extract YAML front matter from a post file
 * @param {string} filePath - Full path to the post file
 * @returns {object|null} - Parsed front matter object or null if not found
 */
function extractFrontMatter(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  
  // Match YAML front matter between --- delimiters
  const frontMatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/)
  
  if (!frontMatterMatch) {
    return null
  }
  
  const frontMatterText = frontMatterMatch[1]
  const frontMatter = {}
  
  // Parse YAML front matter (simple key: value pairs)
  const lines = frontMatterText.split('\n')
  for (const line of lines) {
    // Skip empty lines
    if (!line.trim()) continue
    
    // Match "key: value" pattern, handling quoted and unquoted values
    const match = line.match(/^([^:]+?):\s*(.+)$/)
    if (match) {
      const key = match[1].trim()
      let value = match[2].trim()
      
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      
      frontMatter[key] = value
    }
  }
  
  return frontMatter
}

/**
 * Slugify a title the same way Jekyll does
 * @param {string} title - The post title
 * @returns {string} - The slugified title
 */
function slugifyTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters (including underscores)
    .replace(/\s+/g, '-')          // Replace spaces with hyphens
    .replace(/-+/g, '-')           // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, '')       // Trim hyphens from start and end
}

// Extract URL slugs from post titles in front matter
// Jekyll filename format: YYYY-MM-DD-title.md
// With permalink: /:title/, Jekyll uses the post's front matter `title` to generate the URL
const slugs = new Map()

for (const file of files) {
  const filePath = path.join(postsDir, file)
  const frontMatter = extractFrontMatter(filePath)
  
  if (!frontMatter) {
    console.warn(`WARN: File "${file}" has no valid front matter`)
    continue
  }
  
  if (!frontMatter.title) {
    console.warn(`WARN: File "${file}" has no title in front matter`)
    continue
  }
  
  // Slugify the title from front matter
  const slug = slugifyTitle(frontMatter.title)
  
  if (slugs.has(slug)) {
    console.error(`FAIL: URL collision detected!`)
    console.error(`  Slug: /${slug}/`)
    console.error(`  Title: "${frontMatter.title}"`)
    console.error(`  File 1: ${slugs.get(slug)}`)
    console.error(`  File 2: ${file}`)
    console.error(`Both posts have the same title and would generate the same URL.`)
    process.exit(1)
  }
  
  slugs.set(slug, file)
}

console.log(`PASS: No URL collisions found (${files.length} posts checked)`)
process.exit(0)
