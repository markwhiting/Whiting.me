const fs = require("fs")
const path = require("path")
const { spawnSync } = require("child_process")

console.log("Running URL collision test...")

const repoRoot = path.join(__dirname, "..")
const postsDir = path.join(repoRoot, "_posts")

// Check if _posts directory exists
if (!fs.existsSync(postsDir)) {
  console.log("SKIP: No _posts directory found")
  process.exit(0)
}

const files = fs
  .readdirSync(postsDir)
  .filter(file => file.endsWith(".markdown") || file.endsWith(".md"))

if (files.length === 0) {
  console.log("SKIP: No posts found")
  process.exit(0)
}

/**
 * Ask Jekyll for the canonical post URLs instead of reimplementing
 * front matter parsing and slug generation in JavaScript.
 * @returns {Array<{file: string, title: string | null, url: string}>}
 */
function getPostUrlsFromJekyll() {
  const rubyScript = `
require 'json'
require 'tmpdir'
require 'jekyll'

source = ARGV.fetch(0)

Dir.mktmpdir('whiting-url-collision-') do |destination|
  config = Jekyll.configuration(
    'source' => source,
    'destination' => destination,
    'quiet' => true
  )

  site = Jekyll::Site.new(config)
  site.process

  posts = site.posts.docs.map do |post|
    {
      'file' => post.relative_path,
      'title' => post.data['title'],
      'url' => post.url
    }
  end

  puts '__URL_COLLISION_JSON_START__'
  puts JSON.generate(posts)
  puts '__URL_COLLISION_JSON_END__'
end
`.trim()

  const result = spawnSync(
    "bundle",
    ["exec", "ruby", "-e", rubyScript, repoRoot],
    {
      cwd: repoRoot,
      encoding: "utf8"
    }
  )

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    const details = [result.stderr, result.stdout]
      .filter(Boolean)
      .join("\n")
      .trim()

    throw new Error(
      details || `Jekyll URL lookup failed with exit code ${result.status}`
    )
  }

  const output = result.stdout || ""
  const jsonMatch = output.match(
    /__URL_COLLISION_JSON_START__\n([\s\S]*?)\n__URL_COLLISION_JSON_END__/
  )

  if (!jsonMatch) {
    throw new Error("Could not find Jekyll URL JSON markers in Ruby output")
  }

  return JSON.parse(jsonMatch[1])
}

let posts

try {
  posts = getPostUrlsFromJekyll()
} catch (error) {
  console.error(
    `FAIL: Unable to read canonical post URLs from Jekyll: ${error.message}`
  )
  process.exit(1)
}

if (!Array.isArray(posts) || posts.length === 0) {
  console.error("FAIL: Jekyll did not return any post URLs to validate")
  process.exit(1)
}

const urls = new Map()

for (const post of posts) {
  if (!post.url) {
    console.error(`FAIL: Post "${post.file}" did not produce a URL`)
    process.exit(1)
  }

  if (urls.has(post.url)) {
    const existingPost = urls.get(post.url)

    console.error("FAIL: URL collision detected!")
    console.error(`  URL: ${post.url}`)
    if (existingPost.title) {
      console.error(`  Title 1: "${existingPost.title}"`)
    }
    console.error(`  File 1: ${existingPost.file}`)
    if (post.title) {
      console.error(`  Title 2: "${post.title}"`)
    }
    console.error(`  File 2: ${post.file}`)
    console.error("Both posts resolve to the same canonical Jekyll URL.")
    process.exit(1)
  }

  urls.set(post.url, post)
}

console.log(
  `PASS: No URL collisions found (${posts.length} posts checked with Jekyll)`
)
process.exit(0)
