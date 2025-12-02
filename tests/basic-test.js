const http = require('http');

console.log('Running basic connectivity test...');

const options = {
  hostname: '127.0.0.1',
  port: 4000,
  path: '/',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);

  if (res.statusCode === 200) {
    console.log('PASS: Homepage is accessible');
    process.exit(0);
  } else {
    console.error(`FAIL: Homepage returned status code ${res.statusCode}`);
    process.exit(1);
  }
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
