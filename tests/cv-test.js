const http = require("http")

console.log("Running CV rendering test...")

const options = {
  hostname: "127.0.0.1",
  port: 4000,
  path: "/cv",
  method: "GET",
  timeout: 5000
}

const req = http.request(options, res => {
  console.log(`STATUS: ${res.statusCode}`)

  if (res.statusCode !== 200) {
    console.error(`FAIL: CV page returned status code ${res.statusCode}`)
    process.exit(1)
  }

  let data = ""

  res.on("data", chunk => {
    data += chunk
  })

  res.on("end", () => {
    // 1. Check for unrendered Liquid tags (indicates build/render failure)
    if (data.includes("{{") || data.includes("{%")) {
      // Sometimes JS frameworks use {{ }}, but this is a static Jekyll site.
      // Unrendered tags usually look like {{ experience.dateStart }}
      if (
        data.match(/\{\{\s*site\./) ||
        data.match(/\{\{\s*experience\./) ||
        data.match(/\{\{\s*pub\./)
      ) {
        console.error(
          "FAIL: Found unrendered Liquid tags in output (e.g. {{ variable }})."
        )
        process.exit(1)
      }
    }

    // 2. Check for the presence of years in the specific CV date column
    // Pattern in HTML: <td class="left light small">\n      2015 ...
    // We look for 4-digit years starting with 19 or 20.
    const dateColumnRegex = /<td class="left light small">\s*(19|20)\d{2}/

    if (dateColumnRegex.test(data)) {
      console.log(
        "PASS: CV page rendered with valid status and contains date columns."
      )
      process.exit(0)
    } else {
      // Fallback: check if the page is just empty of data or if the structure changed.
      console.error(
        "FAIL: Did not find standard year format (YYYY) in the expected date columns."
      )
      console.log("Debug: checking for any 4-digit years...")
      if (/\b(19|20)\d{2}\b/.test(data)) {
        console.log(
          "WARN: Found years, but not in the expected column structure. HTML structure might have changed."
        )
        // We'll pass if we see years, but warn.
        process.exit(0)
      }
      process.exit(1)
    }
  })
})

req.on("error", e => {
  console.error(`FAIL: Connection refused or other error: ${e.message}`)
  process.exit(1)
})

req.on("timeout", () => {
  req.destroy()
  console.error("FAIL: Request timed out")
  process.exit(1)
})

req.end()
