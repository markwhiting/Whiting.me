const http = require("http")

console.log("Running family page test...")

function request(path, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "127.0.0.1",
      port: 4000,
      path,
      method: "GET",
      timeout: 5000
    }

    const req = http.request(options, res => {
      let data = ""

      res.on("data", chunk => {
        data += chunk
      })

      res.on("end", async () => {
        const isRedirect =
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          typeof res.headers.location === "string"

        if (isRedirect && redirectCount < 5) {
          try {
            const nextUrl = new URL(
              res.headers.location,
              "http://127.0.0.1:4000"
            )
            const redirected = await request(
              `${nextUrl.pathname}${nextUrl.search}`,
              redirectCount + 1
            )
            resolve(redirected)
            return
          } catch (error) {
            reject(error)
            return
          }
        }

        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        })
      })
    })

    req.on("error", err => {
      reject(err)
    })

    req.on("timeout", () => {
      req.destroy()
      reject(new Error(`Request timed out for ${path}`))
    })

    req.end()
  })
}

function fail(message) {
  console.error(`FAIL: ${message}`)
  process.exit(1)
}

;(async () => {
  try {
    const home = await request("/")

    console.log(`Homepage status: ${home.statusCode}`)

    if (home.statusCode !== 200) {
      fail(`Homepage returned status code ${home.statusCode}`)
    }

    const hasFamilyNavLink =
      /<a[^>]+href="\/family\/?"[^>]*>\s*Family(?:\s*[^<]+)?\s*<\/a>/i.test(
        home.body
      )

    if (!hasFamilyNavLink) {
      fail("Homepage does not include a Family navigation link")
    }

    const family = await request("/family")

    console.log(`Family page status: ${family.statusCode}`)

    if (family.statusCode !== 200) {
      fail(`Family page returned status code ${family.statusCode}`)
    }

    const checks = [
      {
        name: "Family page renders a Family title or heading",
        test: () =>
          /<title>\s*Family(?:\s*[^<]*)?<\/title>/i.test(family.body) ||
          /<h1[^>]*>\s*Family\s*<\/h1>/i.test(family.body)
      },
      {
        name: "Family page includes Bridget Whiting as a linked list entry with a sister summary",
        test: () =>
          /<li>\s*<a[^>]+href="https:\/\/bridget\.whiting\.me"[^>]*>\s*Bridget Whiting\s*<\/a>[\s\S]*?\bsister\b[\s\S]*?<\/li>/i.test(
            family.body
          )
      },
      {
        name: "Family page includes Ruth Whiting as a linked list entry with a sister summary",
        test: () =>
          /<li>\s*<a[^>]+href="http:\/\/Ruthwhiting\.com\/?"[^>]*>\s*Ruth Whiting\s*<\/a>[\s\S]*?\bsister\b[\s\S]*?<\/li>/i.test(
            family.body
          )
      },
      {
        name: "Family page includes Bernard Whiting as a linked list entry with a father summary and both public links",
        test: () =>
          /<li>\s*<a[^>]+href="https:\/\/phys\.ufl\.edu\/people\/faculty\/bernard-whiting\/"[^>]*>\s*Bernard Whiting\s*<\/a>[\s\S]*?\bfather\b[\s\S]*?<a[^>]+href="https:\/\/www\.linkedin\.com\/in\/bernard-whiting-035aa353\/"[^>]*>\s*LinkedIn\s*<\/a>[\s\S]*?<\/li>/i.test(
            family.body
          )
      }
    ]

    let passed = 0
    let failed = 0

    checks.forEach(check => {
      if (check.test()) {
        console.log(`✓ PASS: ${check.name}`)
        passed++
      } else {
        console.error(`✗ FAIL: ${check.name}`)
        failed++
      }
    })

    console.log(`\nResults: ${passed} passed, ${failed} failed`)

    if (failed > 0) {
      process.exit(1)
    }

    console.log("PASS: Family page and navigation link render correctly")
    process.exit(0)
  } catch (error) {
    fail(error.message)
  }
})()
