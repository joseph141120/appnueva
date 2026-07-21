const http = require('http');

function makeRequest(path, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function testRecovery() {
  try {
    console.log('1. Probando /recuperar-password...');
    const res1 = await makeRequest('/recuperar-password', { email: 'admin@hardwarestore.com' });
    console.log('Respuesta 1:', res1);

    if (res1.success && res1.codigoSimulado) {
      console.log('2. Probando /resetear-password con código:', res1.codigoSimulado);
      const res2 = await makeRequest('/resetear-password', {
        email: 'admin@hardwarestore.com',
        codigo: res1.codigoSimulado,
        nueva_password: '123'
      });
      console.log('Respuesta 2:', res2);
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}

testRecovery();
