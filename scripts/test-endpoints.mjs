async function check() {
  const routes = [
    'http://localhost:3000/',
    'http://localhost:3000/signup',
    'http://localhost:3000/login',
    'http://localhost:3000/onboarding',
    'http://localhost:3000/w/factor-labs',
    'http://localhost:3000/w/factor-labs/settings/members'
  ];

  console.log('Testing OneDesk live server endpoints:\n');
  for (const url of routes) {
    try {
      const res = await fetch(url, { redirect: 'manual' });
      const location = res.headers.get('location');
      console.log(`[${res.status}] ${url}${location ? ' -> Redirect: ' + location : ''}`);
    } catch (e) {
      console.error(`[ERR] ${url}:`, e.message);
    }
  }
}

check();

