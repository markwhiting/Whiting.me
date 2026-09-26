const assert = require("assert/strict")
const http = require("http")

function get(path) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:4000${path}`, res => {
      if (res.statusCode !== 200) {
        res.resume()
        reject(new Error(`${path}: HTTP ${res.statusCode}`))
        return
      }
      res.setEncoding("utf8")
      let body = ""
      res.on("data", chunk => { body += chunk })
      res.on("end", () => resolve(body))
      res.on("error", reject)
    })
    req.setTimeout(5000, () => req.destroy(new Error(`${path}: timed out`)))
    req.on("error", reject)
  })
}

function unescapeHtml(text) {
  const entities = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" }
  return text.replace(/&(?:amp|lt|gt|quot);|&#39;/g, entity => entities[entity])
}

async function main() {
  const [cv, page] = await Promise.all([get("/cv"), get("/bib")])
  for (const body of [cv, page]) {
    assert(!/\{[{%]\s*(?:pub\.|site\.|include\b)/.test(body), "Unrendered Liquid")
  }

  const [working, published] = cv.split("<!-- Publications -->")
  const rows = published.match(/<tr>[\s\S]*?<\/tr>/g)
  const cases = [
    ["Boomerang:", "UIST"],
    ["Crowd guilds:", "CSCW"],
    ["Did It Have To End This Way?", "CSCW"],
    ["Parallel Worlds:", "CSCW"],
    ["My Team Will Go On:", "CSCW"],
    ["Can Online Juries Make Consistent, Repeatable Decisions?", "CHI"],
    ["Are Deepfakes Concerning?", "CHI"],
    ["A framework for quantifying individual and collective common sense", "PNAS"],
    ["Insights into accuracy of social scientists", "Nature Human Behaviour"],
    ["COVID-19 non-pharmaceutical interventions", "Scientific Data"],
    ["Beyond Playing 20 Questions with Nature:", "Behavioral and Brain Sciences"],
    ["Designing A Constitution", "Collective Intelligence Conference, Brooklyn, NY, USA"],
    ["Empirica:", "Behavior Research Methods"],
    ["Automated Induction of General Grammars", "Design Computing and Cognition"]
  ]
  for (const [title, venue] of cases) {
    const row = rows.find(row => row.includes(title))
    assert(row?.includes(`<strong>${venue}</strong>`), `${title}: expected ${venue}`)
  }
  console.log("PASS: short venues and full-name fallbacks on the CV")

  const title = "LLMs Show No Signs Of Individuated Metacognition"
  assert(!working.includes(title) && published.includes(title))
  const paper = rows.find(row => row.includes(title))
  assert(paper.includes("<strong>NeurIPS</strong>"))
  assert(!paper.includes("Accepted"))
  assert(paper.includes("https://doi.org/10.48550/arXiv.2605.24299"))
  assert(!paper.includes("https://arxiv.org/abs/2605.24299"))
  assert(cv.includes('>orcid.org/0000-0002-6395-7833</a>'))
  assert(!cv.includes("ORCiD:"))

  const pre = page.match(/<pre\b([^>]*)>([\s\S]*?)<\/pre>/)
  assert(pre, "Bibliography must use a preformatted block")
  assert(pre[1].includes("white-space: pre-wrap"))
  assert(!page.includes("/publications.bib"))
  assert(!page.includes("<h1") && !page.includes("<header"), "Keep the original standalone bibliography")
  const bib = unescapeHtml(pre[2]).trim()
  const entries = bib.trim().split(/\n\n+/)
  assert(entries.length > 1)
  for (const entry of entries) {
    const lines = entry.split("\n")
    assert(/^@\w+\{[^\n]+,$/.test(lines[0]), "Entry starts on its own line")
    assert.equal(lines.at(-1), "}", "Entry closes on its own line")
    for (const field of lines.slice(1, -1)) {
      assert(/^  \w+=\{.*\},$/.test(field), `Field must occupy one line: ${field}`)
    }
  }
  const publications = entries.map(entry => ({
    title: entry.match(/^  title=\{(.*)\},$/m)[1],
    type: entry.match(/^@(\w+)\{/)[1],
    year: Number(entry.match(/^  year=\{(\d+)\},$/m)[1]),
    month: Number(entry.match(/^  month=\{(\d+)\},$/m)?.[1] ?? 13)
  }))
  const expected = [...publications].sort((a, b) => b.year - a.year || b.month - a.month)
  assert.deepEqual(publications, expected, "BibTeX: descending year/month, blank month first")

  const sections = [
    [cv.split("<!-- Patents -->")[1].split("<!-- Working papers -->")[0], pub => pub.type === "patent"],
    [cv.split("<!-- Working papers -->")[1].split("<!-- Publications -->")[0], pub => pub.type === "unpublished"],
    [published, pub => pub.type !== "patent" && pub.type !== "unpublished"]
  ]
  for (const [section, includes] of sections) {
    const expectedTitles = expected.filter(includes).map(pub => pub.title)
    const renderedTitles = (section.match(/<tr>[\s\S]*?<\/tr>/g) ?? [])
      .filter(row => row.includes('<strong class="">'))
      .map(row => expectedTitles.find(title => unescapeHtml(row).includes(title)))
    assert.deepEqual(renderedTitles, expectedTitles, "CV: descending year/month, blank month first")
  }
  assert(published.indexOf(title) < published.indexOf("The Task Space:"))
  console.log("PASS: numeric year/month ordering with blank months first in CV and BibTeX")

  const metacognition = entries.find(entry => entry.includes(title))
  for (const field of [
    "journal={Conference on Neural Information Processing Systems}",
    "year={2026}", "month={12}", "doi={10.48550/arXiv.2605.24299}"
  ]) assert(metacognition.includes(field), `Missing ${field}`)
  assert(!metacognition.includes("url={"))
  assert(!bib.includes("day={") && !bib.includes("note={Accepted}"))
  assert(bib.includes("journal={CHI Conference on Human Factors in Computing Systems}"))
  assert(bib.includes("journal={Proceedings of the ACM on Human-Computer Interaction}"))
  assert(!/\b(?:booktitle|journal)=\{(?:CHI|CSCW|NeurIPS)\}/.test(bib))
  console.log("PASS: standalone BibTeX, full venues, line breaks, original DOI, year/month and ORCID text")
}

main().catch(error => {
  console.error(`FAIL: ${error.message}`)
  process.exitCode = 1
})
