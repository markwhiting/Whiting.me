# Personal Website - Jekyll Site

Mark E. Whiting's personal website built with Jekyll and hosted on GitHub Pages using the Minima theme with custom styling. The site features academic CV, bio, blog posts, and personal content.

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

- Bootstrap, build, and run the repository:
  - `gem install --user-install bundler`
  - `export PATH="$PATH:/home/runner/.local/share/gem/ruby/3.2.0/bin"`
  - `bundle config set --local path 'vendor/bundle'`
  - `bundle install` -- takes 30 seconds to complete. NEVER CANCEL. Set timeout to 90+ seconds.
- Build the site:
  - `bundle exec jekyll build` -- takes 2 seconds. Very fast.
- Run the development server:
  - `bundle exec jekyll serve --host 0.0.0.0 --port 4000`
  - Access at: http://localhost:4000
  - Use Ctrl+C to stop the server

## Validation

- ALWAYS manually validate any changes by running through complete end-to-end scenarios after making changes.
- Test the website functionality by navigating to key pages:
  - Homepage (/) - shows latest work and intro
  - Bio (/bio) - personal background
  - CV (/cv) - comprehensive academic CV  
  - FAQ (/faq) - frequently asked questions
- Test navigation links work correctly between pages
- Verify that the site builds without errors (`bundle exec jekyll build`)
- Test the development server runs and serves pages correctly
- The CI pipeline (.github/workflows/jekyll.yml) builds the site automatically on push using Docker

## Common Tasks

The following are frequently accessed directories and files in the repository:

### Repository Structure
```
.
├── README.md
├── _config.yml          # Jekyll configuration
├── Gemfile              # Ruby dependencies  
├── Gemfile.lock         # Locked dependency versions
├── _posts/              # Blog posts in Markdown
├── _layouts/            # Page templates
├── _includes/           # Reusable components
├── _sass/               # SCSS stylesheets
├── _data/              # YAML data files
├── assets/             # Images, CSS, JS
├── bio.md              # Bio page
├── cv.html             # CV page
├── faq.md              # FAQ page
├── index.md            # Homepage
├── .github/workflows/  # CI/CD configuration
└── vendor/             # Dependencies (ignored)
```

### Key Configuration Files

#### _config.yml
```yaml
title: Mark E. Whiting
email: mark@whiting.me
description: Mark studies coordination at scale.
url: "https://whiting.me"
theme: minima
plugins:
  - jekyll-feed
```

#### Gemfile
```ruby
source "https://rubygems.org"
gem "minima", "~> 2.0"
gem "github-pages", group: :jekyll_plugins
gem "jekyll-feed", "~> 0.11"
gem "webrick", "~> 1.8"
```

### Content Management

- Blog posts go in `_posts/` using format: `YYYY-MM-DD-title.markdown`
- Each post needs front matter with title, date, categories
- Pages can be Markdown (.md) or HTML (.html)
- Layouts are in `_layouts/` (default.html, post.html, etc.)
- Styling uses Minima theme with customizations in `_sass/`
- Data files in `_data/` provide structured content (e.g., mentees.yml)

### Development Workflow

1. **Setup environment** (one time):
   ```bash
   gem install --user-install bundler
   export PATH="$PATH:/home/runner/.local/share/gem/ruby/3.2.0/bin"
   ```

2. **Install dependencies**:
   ```bash
   bundle config set --local path 'vendor/bundle'
   bundle install  # NEVER CANCEL - takes 30 seconds
   ```

3. **Make changes** to content, layouts, or styles

4. **Test locally**:
   ```bash
   bundle exec jekyll build
   bundle exec jekyll serve --host 0.0.0.0 --port 4000
   ```

5. **Manual validation** - Always browse to http://localhost:4000 and test:
   - Homepage loads with correct content
   - Navigation links work (Bio, CV, FAQ, Archive)
   - Any changed pages display correctly
   - No broken links or missing images

6. **Deploy** - Push to GitHub; CI will build and deploy automatically

### Time Expectations

- **Bundle install**: 30 seconds - NEVER CANCEL, use 90+ second timeout
- **Jekyll build**: 2 seconds - very fast
- **Jekyll serve startup**: 2-3 seconds
- **CI build**: 1-2 minutes on GitHub Actions

### Troubleshooting

- If bundle install fails with permissions: Use `--user-install` flag and ensure PATH includes gem bin directory
- If Jekyll serve fails: Check that port 4000 is available or use different port with `--port 4001`
- If build fails: Check for YAML front matter syntax errors in posts/pages
- If styling is broken: Check `_sass/` files and ensure CSS is valid
- Dependencies are installed locally in `vendor/bundle/` (not tracked in git)

## CI/CD Pipeline

The repository uses GitHub Actions for continuous integration:

- **Trigger**: Every push to `gh-pages` branch
- **Action**: `.github/workflows/jekyll.yml`
- **Process**: Uses `ruby/setup-ruby@v1` with Ruby 3.2 and bundler caching
- **Build Command**: `bundle exec jekyll build --future`
- **Deploy**: Automatic to GitHub Pages using `actions/deploy-pages@v4`

The CI pipeline consists of three jobs:
1. **Build**: Sets up Ruby environment, builds the Jekyll site, and uploads the artifact
2. **Deploy**: Deploys the built site to GitHub Pages
3. **Test**: Runs automated tests to verify site functionality

The workflow uses bundler caching to speed up builds and ensures consistency with local development environment.