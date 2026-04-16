const http = require('http');

console.log('Running color space shipping test...');

function request(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 4000,
      path,
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

function extractBlock(source, openBraceIndex) {
  if (openBraceIndex === -1 || source[openBraceIndex] !== '{') {
    return null;
  }

  let depth = 0;

  for (let i = openBraceIndex; i < source.length; i++) {
    if (source[i] === '{') {
      depth++;
    } else if (source[i] === '}') {
      depth--;

      if (depth === 0) {
        return source.slice(openBraceIndex + 1, i);
      }
    }
  }

  return null;
}

function findColorSupportBlock(css) {
  let searchIndex = 0;

  while (searchIndex < css.length) {
    const supportsIndex = css.indexOf('@supports', searchIndex);

    if (supportsIndex === -1) {
      return null;
    }

    const braceIndex = css.indexOf('{', supportsIndex);

    if (braceIndex === -1) {
      return null;
    }

    const block = extractBlock(css, braceIndex);

    if (block && /:root/.test(block) && /lab\(/i.test(block) && /lch\(/i.test(block)) {
      return block;
    }

    searchIndex = braceIndex + 1;
  }

  return null;
}

function logFailureAndExit(message, details) {
  console.error(`FAIL: ${message}`);

  if (details) {
    console.error(details);
  }

  process.exit(1);
}

(async () => {
  try {
    const home = await request('/');

    console.log(`Homepage status: ${home.statusCode}`);

    if (home.statusCode !== 200) {
      logFailureAndExit(`Homepage returned status code ${home.statusCode}`);
    }

    const stylesheetMatch = home.body.match(
      /<link[^>]+href="([^"]*main\.css[^"]*)"[^>]*>/i
    );

    if (!stylesheetMatch) {
      logFailureAndExit('Could not find the main stylesheet link on the homepage');
    }

    const stylesheetUrl = new URL(stylesheetMatch[1], 'http://127.0.0.1:4000');
    const cssResponse = await request(`${stylesheetUrl.pathname}${stylesheetUrl.search}`);

    console.log(`Stylesheet status: ${cssResponse.statusCode}`);

    if (cssResponse.statusCode !== 200) {
      logFailureAndExit(`Stylesheet returned status code ${cssResponse.statusCode}`);
    }

    const css = cssResponse.body;
    const colorSupportBlock = findColorSupportBlock(css);

    const tests = [
      {
        name: 'CSS ships an HSL fallback palette',
        test: () =>
          /--light:\s*hsla\(/i.test(css) &&
          /--dark:\s*hsla\(/i.test(css) &&
          /--blue:\s*hsla\(/i.test(css) &&
          /--orange:\s*hsla\(/i.test(css)
      },
      {
        name: 'CSS ships a LAB/LCH progressive enhancement block',
        test: () => Boolean(colorSupportBlock)
      },
      {
        name: 'Support block overrides neutral tokens with LAB',
        test: () =>
          Boolean(colorSupportBlock) &&
          /--light:\s*lab\(/i.test(colorSupportBlock) &&
          /--dark:\s*lab\(/i.test(colorSupportBlock)
      },
      {
        name: 'Support block overrides accent tokens with LCH',
        test: () =>
          Boolean(colorSupportBlock) &&
          /--blue:\s*lch\(/i.test(colorSupportBlock) &&
          /--orange:\s*lch\(/i.test(colorSupportBlock)
      },
      {
        name: 'JavaScript probes runtime LCH support',
        test: () =>
          /(CSS|window\.CSS)[\s\S]{0,80}supports[\s\S]{0,120}lch\(/i.test(home.body)
      },
      {
        name: 'JavaScript ships an HSL fallback path',
        test: () => /hsla\(/i.test(home.body)
      },
      {
        name: 'JavaScript applies the chosen color to the page background',
        test: () =>
          /backgroundColor/i.test(home.body) &&
          /prefers-color-scheme/i.test(home.body)
      }
    ];

    let passed = 0;
    let failed = 0;

    tests.forEach(check => {
      if (check.test()) {
        console.log(`✓ PASS: ${check.name}`);
        passed++;
      } else {
        console.error(`✗ FAIL: ${check.name}`);
        failed++;
      }
    });

    console.log(`\nResults: ${passed} passed, ${failed} failed`);

    if (failed > 0) {
      process.exit(1);
    }

    console.log('PASS: LAB/LCH styles and JavaScript fallback are shipped');
    process.exit(0);
  } catch (error) {
    logFailureAndExit(error.message);
  }
})();
