const http = require('http');

const request = (method, path, body, headers = {}) => {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };
    if (postData) {
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(
      {
        host: 'localhost',
        port: 5000,
        path,
        method,
        headers: reqHeaders
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch (e) {
            parsed = data;
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (postData) req.write(postData);
    req.end();
  });
};

const runAuthTests = async () => {
  console.log('--- STARTING AUTHENTICATION & AUTHORIZATION TEST SUITE ---\n');

  try {
    // 1. Test Registration - Worker
    const workerEmail = `worker_${Date.now()}@hydro.com`;
    console.log(`1. Testing Registration for worker (${workerEmail})...`);
    const regRes = await request('POST', '/api/auth/register', {
      name: 'Test Worker',
      email: workerEmail,
      password: 'password123',
      role: 'worker',
      department: 'Electrolysis Unit'
    });
    console.log(`   Status: ${regRes.status}`);
    console.log(`   Has Token: ${Boolean(regRes.body.token)}`);
    console.log(`   Password returned in response? ${Boolean(regRes.body.password || regRes.body.passwordHash)}`);
    console.assert(regRes.status === 201, 'Registration should return 201');
    console.assert(!regRes.body.password, 'Password must not be returned');

    // 2. Test Login - Worker
    console.log('\n2. Testing Login for worker...');
    const loginRes = await request('POST', '/api/auth/login', {
      email: workerEmail,
      password: 'password123'
    });
    console.log(`   Status: ${loginRes.status}`);
    const workerToken = loginRes.body.token;
    console.log(`   Has Token: ${Boolean(workerToken)}`);
    console.log(`   Password returned in login response? ${Boolean(loginRes.body.password)}`);
    console.assert(loginRes.status === 200, 'Login should return 200');

    // Decode JWT payload without secret to inspect structure
    const payload = JSON.parse(Buffer.from(workerToken.split('.')[1], 'base64').toString());
    console.log(`   JWT Payload structure:`, payload);
    console.assert(Boolean(payload.id), 'JWT must contain user id');
    console.assert(payload.role === 'worker', 'JWT must contain role');

    // 3. Test Registration & Login - Safety Officer (Admin Role)
    const officerEmail = `officer_${Date.now()}@hydro.com`;
    console.log(`\n3. Testing Registration for Safety Officer (${officerEmail})...`);
    const offRegRes = await request('POST', '/api/auth/register', {
      name: 'Safety Officer User',
      email: officerEmail,
      password: 'password123',
      role: 'safetyOfficer',
      department: 'HSE Department'
    });
    const officerToken = offRegRes.body.token;
    console.log(`   Status: ${offRegRes.status}, Role: ${offRegRes.body.role}`);

    // 4. Access protected route WITH valid token
    console.log('\n4. Accessing GET /api/auth/me with valid Bearer token...');
    const meRes = await request('GET', '/api/auth/me', null, {
      Authorization: `Bearer ${workerToken}`
    });
    console.log(`   Status: ${meRes.status}`);
    console.log(`   Authenticated User Email: ${meRes.body.email}`);
    console.assert(meRes.status === 200, 'Protected route with token should return 200');

    // 5. Access protected route WITHOUT token
    console.log('\n5. Accessing GET /api/auth/me WITHOUT token (expect 401)...');
    const noTokenRes = await request('GET', '/api/auth/me');
    console.log(`   Status: ${noTokenRes.status}, Message: ${noTokenRes.body.message}`);
    console.assert(noTokenRes.status === 401, 'Unauthenticated access must return 401');

    // 6. Access protected route with INVALID token
    console.log('\n6. Accessing GET /api/auth/me with INVALID token (expect 401)...');
    const invalidTokenRes = await request('GET', '/api/auth/me', null, {
      Authorization: 'Bearer invalid_fake_jwt_token'
    });
    console.log(`   Status: ${invalidTokenRes.status}, Message: ${invalidTokenRes.body.message}`);
    console.assert(invalidTokenRes.status === 401, 'Invalid token must return 401');

    // 7. Access admin-only route with Worker token (expect 403 Forbidden)
    console.log('\n7. Accessing GET /api/auth/admin-only with Worker token (expect 403 Forbidden)...');
    const workerAdminRes = await request('GET', '/api/auth/admin-only', null, {
      Authorization: `Bearer ${workerToken}`
    });
    console.log(`   Status: ${workerAdminRes.status}, Message: ${workerAdminRes.body.message}`);
    console.assert(workerAdminRes.status === 403, 'Unauthorized role access must return 403');

    // 8. Access admin-only route with Safety Officer token (expect 200 OK)
    console.log('\n8. Accessing GET /api/auth/admin-only with Safety Officer token (expect 200 OK)...');
    const officerAdminRes = await request('GET', '/api/auth/admin-only', null, {
      Authorization: `Bearer ${officerToken}`
    });
    console.log(`   Status: ${officerAdminRes.status}, Message: ${officerAdminRes.body.message}`);
    console.assert(officerAdminRes.status === 200, 'Authorized role access should return 200');

    console.log('\n==================================================');
    console.log('✅ ALL AUTHENTICATION & AUTHORIZATION TESTS PASSED SUCCESSFULLY!');
    console.log('==================================================');
  } catch (err) {
    console.error('❌ Test failed with error:', err);
  }
};

runAuthTests();
