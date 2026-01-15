const http = require('http');

console.log('Running footer update functionality test...');

const options = {
  hostname: '127.0.0.1',
  port: 4000,
  path: '/',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`STATUS: ${res.statusCode}`);

    if (res.statusCode !== 200) {
      console.error(`FAIL: Homepage returned status code ${res.statusCode}`);
      process.exit(1);
    }

    // Check for footer elements
    const tests = [
      {
        name: 'Footer has upDate span',
        test: () => data.includes('class="upDate"'),
        required: true
      },
      {
        name: 'Footer has fallback date',
        test: () => /<span class="upDate">[^<]+<\/span>/.test(data),
        required: true
      },
      {
        name: 'Footer has fetchCommitData function',
        test: () => data.includes('function fetchCommitData()'),
        required: true
      },
      {
        name: 'Footer has lastUpdated function',
        test: () => data.includes('function lastUpdated(commit)'),
        required: true
      },
      {
        name: 'Footer has cache mechanism',
        test: () => data.includes('CACHE_KEY') && data.includes('getCachedData'),
        required: true
      },
      {
        name: 'Footer uses DOM manipulation',
        test: () => data.includes('createElement') && !data.includes('innerHTML = linkHtml'),
        required: true
      },
      {
        name: 'SHA validation present',
        test: () => data.includes('/^[0-9a-f]{40}$/i'),
        required: true
      },
      {
        name: 'Uses toLocaleDateString',
        test: () => data.includes('toLocaleDateString'),
        required: true
      }
    ];

    let passed = 0;
    let failed = 0;

    tests.forEach(test => {
      if (test.test()) {
        console.log(`✓ PASS: ${test.name}`);
        passed++;
      } else {
        console.error(`✗ FAIL: ${test.name}`);
        if (test.required) {
          failed++;
        }
      }
    });

    console.log(`\nResults: ${passed} passed, ${failed} failed`);

    if (failed > 0) {
      console.error('FAIL: Some required tests failed');
      process.exit(1);
    } else {
      console.log('PASS: All footer tests passed');
      process.exit(0);
    }
  });
});

req.on('error', (e) => {
  console.error(`FAIL: Connection refused or other error: ${e.message}`);
  process.exit(1);
});

req.on('timeout', () => {
  req.destroy();
  console.error('FAIL: Request timed out');
  process.exit(1);
});

req.end();
