const http = require('http');

console.log('Running family page test...');

function request(path, redirectCount = 0) {
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

      res.on('end', async () => {
        const isRedirect =
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          typeof res.headers.location === 'string';

        if (isRedirect && redirectCount < 5) {
          try {
            const nextUrl = new URL(res.headers.location, 'http://127.0.0.1:4000');
            const redirected = await request(
              `${nextUrl.pathname}${nextUrl.search}`,
              redirectCount + 1
            );
            resolve(redirected);
            return;
          } catch (error) {
            reject(error);
            return;
          }
        }

        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', err => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timed out for ${path}`));
    });

    req.end();
  });
}

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

(async () => {
  try {
    const home = await request('/');

    console.log(`Homepage status: ${home.statusCode}`);

    if (home.statusCode !== 200) {
      fail(`Homepage returned status code ${home.statusCode}`);
    }

    const hasFamilyNavLink =
      /<a[^>]+class="page-link"[^>]+href="\/family\/?"[^>]*>\s*Family\s*<\/a>/i.test(home.body) ||
      /<a[^>]+href="\/family\/?"[^>]+class="page-link"[^>]*>\s*Family\s*<\/a>/i.test(home.body);

    if (!hasFamilyNavLink) {
      fail('Homepage does not include a Family navigation link');
    }

    const family = await request('/family');

    console.log(`Family page status: ${family.statusCode}`);

    if (family.statusCode !== 200) {
      fail(`Family page returned status code ${family.statusCode}`);
    }

    const checks = [
      {
        name: 'Family page renders a Family heading or title',
        test: () =>
          /<title>Family(?:\s*\|[^<]*)?<\/title>/i.test(family.body) ||
          /<h1[^>]*>\s*Family\s*<\/h1>/i.test(family.body)
      },
      {
        name: 'Family page includes Bridget Whiting',
        test: () =>
          /Bridget Whiting/i.test(family.body) &&
          /href="https:\/\/bridget\.whiting\.me"/i.test(family.body)
      },
      {
        name: 'Family page includes Ruth Whiting',
        test: () =>
          /Ruth Whiting/i.test(family.body) &&
          /href="https:\/\/windfiredesigns\.com\/Ruth-Whiting-Portfolio\.html"/i.test(family.body)
      },
      {
        name: 'Family page includes Bernard Whiting faculty link',
        test: () =>
          /Bernard Whiting/i.test(family.body) &&
          /href="https:\/\/phys\.ufl\.edu\/people\/faculty\/bernard-whiting\/"/i.test(family.body)
      },
      {
        name: 'Family page includes Bernard Whiting LinkedIn link',
        test: () =>
          /Bernard Whiting/i.test(family.body) &&
          /href="https:\/\/www\.linkedin\.com\/in\/bernard-whiting-035aa353\/"/i.test(family.body)
      }
    ];

    let passed = 0;
    let failed = 0;

    checks.forEach(check => {
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

    console.log('PASS: Family page and navigation link render correctly');
    process.exit(0);
  } catch (error) {
    fail(error.message);
  }
})();
