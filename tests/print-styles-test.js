const http = require('http');

console.log('Running print styles test...');

function request(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 4000,
      path: path,
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, res => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body: data
        });
      });
    });

    req.on('error', err => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    req.end();
  });
}

function extractMediaPrintBlock(css) {
  const mediaIndex = css.indexOf('@media print');

  if (mediaIndex === -1) {
    return null;
  }

  const blockStart = css.indexOf('{', mediaIndex);

  if (blockStart === -1) {
    return null;
  }

  let depth = 0;

  for (let i = blockStart; i < css.length; i++) {
    if (css[i] === '{') {
      depth++;
    } else if (css[i] === '}') {
      depth--;

      if (depth === 0) {
        return css.slice(blockStart + 1, i);
      }
    }
  }

  return null;
}

function parseTopLevelRules(block) {
  const rules = [];
  let i = 0;

  while (i < block.length) {
    while (i < block.length && /\s/.test(block[i])) {
      i++;
    }

    if (i >= block.length) {
      break;
    }

    const selectorStart = i;

    while (i < block.length && block[i] !== '{') {
      i++;
    }

    if (i >= block.length) {
      break;
    }

    const selector = block.slice(selectorStart, i).trim();
    i++;

    const declarationStart = i;
    let depth = 1;

    while (i < block.length && depth > 0) {
      if (block[i] === '{') {
        depth++;
      } else if (block[i] === '}') {
        depth--;
      }

      i++;
    }

    const declarations = block.slice(declarationStart, i - 1).trim();

    if (selector && declarations) {
      rules.push({ selector, declarations });
    }
  }

  return rules;
}

function targetsPrintableSurface(selector) {
  const normalized = selector.toLowerCase();

  return /\bhtml\b/.test(normalized) || /\bbody\b/.test(normalized) || normalized.includes('*');
}

function hasBackgroundReset(rule) {
  const declarations = rule.declarations.toLowerCase();

  const resetsBackgroundShorthand =
    /background\s*:\s*(?:none|transparent|#fff(?:fff)?|white)\s*!important/.test(declarations);

  const resetsBackgroundColor =
    /background-color\s*:\s*(?:transparent|#fff(?:fff)?|white)\s*!important/.test(declarations);

  const resetsBackgroundImage =
    /background-image\s*:\s*none\s*!important/.test(declarations);

  return (
    resetsBackgroundShorthand ||
    (resetsBackgroundColor && resetsBackgroundImage)
  );
}

(async () => {
  try {
    const home = await request('/');

    console.log(`Homepage status: ${home.statusCode}`);

    if (home.statusCode !== 200) {
      console.error(`FAIL: Homepage returned status code ${home.statusCode}`);
      process.exit(1);
    }

    const stylesheetMatch = home.body.match(
      /<link[^>]+href="([^"]*main\.css[^"]*)"[^>]*>/i
    );

    if (!stylesheetMatch) {
      console.error('FAIL: Could not find the main stylesheet link on the homepage');
      process.exit(1);
    }

    const stylesheetUrl = new URL(stylesheetMatch[1], 'http://127.0.0.1:4000');
    const css = await request(`${stylesheetUrl.pathname}${stylesheetUrl.search}`);

    console.log(`Stylesheet status: ${css.statusCode}`);

    if (css.statusCode !== 200) {
      console.error(`FAIL: Stylesheet returned status code ${css.statusCode}`);
      process.exit(1);
    }

    const printBlock = extractMediaPrintBlock(css.body);

    if (!printBlock) {
      console.error('FAIL: No @media print block found in the stylesheet');
      process.exit(1);
    }

    const rules = parseTopLevelRules(printBlock);
    const printBackgroundResetRule = rules.find(rule => {
      return targetsPrintableSurface(rule.selector) && hasBackgroundReset(rule);
    });

    if (!printBackgroundResetRule) {
      console.error(
        'FAIL: Print CSS does not clear backgrounds for html/body (or a universal printable surface) with !important overrides'
      );
      console.log('Debug: Found selectors inside @media print:');
      rules.forEach(rule => {
        console.log(`- ${rule.selector}`);
      });
      process.exit(1);
    }

    console.log('PASS: Found @media print block');
    console.log(
      `PASS: Print CSS clears backgrounds using selector: ${printBackgroundResetRule.selector}`
    );
    process.exit(0);
  } catch (error) {
    console.error(`FAIL: ${error.message}`);
    process.exit(1);
  }
})();
