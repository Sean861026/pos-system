// POS 系統 API 完整自我檢測
// 執行：node test-api.mjs

const BASE = process.env.BASE_URL || 'http://localhost:3001';
let PASS = 0, FAIL = 0;

const green = (s) => `\x1b[32m[PASS]\x1b[0m ${s}`;
const red   = (s) => `\x1b[31m[FAIL]\x1b[0m ${s}`;
const blue  = (s) => `\x1b[34m[INFO]\x1b[0m ${s}`;
const bold  = (s) => `\n\x1b[1m${s}\x1b[0m`;

function check(name, status, expected, body = '') {
  if (status === expected) {
    console.log(green(`${name}  (HTTP ${status})`));
    PASS++;
  } else {
    console.log(red(`${name}  (預期 ${expected}，實際 ${status})`));
    if (body) console.log(`         ${body}`);
    FAIL++;
  }
}

async function req(method, path, token, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = text; }
    return { status: res.status, data: json };
  } catch (e) {
    return { status: 0, data: e.message };
  }
}

async function run() {
  console.log(bold('=== POS 系統 API 自我檢測 ==='));
  console.log(`目標：${BASE}`);
  console.log(`時間：${new Date().toLocaleString('zh-TW')}`);

  // ─── 1. 健康檢查 ───
  console.log(bold('1. 基礎健康檢查'));
  let r = await req('GET', '/api/health');
  check('GET /api/health', r.status, 200);

  // ─── 2. 認證模組 ───
  console.log(bold('2. 認證模組'));

  r = await req('POST', '/api/auth/login', null, { email: 'admin@pos.com', password: 'admin123' });
  check('POST /api/auth/login (正確密碼)', r.status, 200);
  const TOKEN = r.data?.token;
  const USER  = r.data?.user;
  if (USER) console.log(blue(`  登入使用者：${USER.name} (${USER.role})`));

  r = await req('POST', '/api/auth/login', null, { email: 'admin@pos.com', password: 'wrongpassword' });
  check('POST /api/auth/login (錯誤密碼應拒絕)', r.status, 401);

  r = await req('GET', '/api/products');
  check('GET /api/products (無 Token 應拒絕)', r.status, 401);

  r = await req('GET', '/api/auth/me', TOKEN);
  check('GET /api/auth/me', r.status, 200);

  // ─── 3. 分類模組 ───
  console.log(bold('3. 商品分類模組'));

  r = await req('GET', '/api/categories', TOKEN);
  check('GET /api/categories', r.status, 200);
  if (Array.isArray(r.data)) console.log(blue(`  分類數量：${r.data.length} 筆`));

  r = await req('POST', '/api/categories', TOKEN, { name: '測試分類_自動', color: '#eb2f96' });
  check('POST /api/categories (新增)', r.status, 201);
  const CAT_ID = r.data?.id;

  // ─── 4. 商品模組 ───
  console.log(bold('4. 商品模組'));

  r = await req('GET', '/api/products', TOKEN);
  check('GET /api/products', r.status, 200);
  if (Array.isArray(r.data)) console.log(blue(`  商品數量：${r.data.length} 筆`));

  r = await req('POST', '/api/products', TOKEN, {
    name: '測試商品_自動', sku: 'AUTO-TEST-001',
    price: 99, cost: 50, categoryId: CAT_ID, initialStock: 20,
  });
  check('POST /api/products (新增)', r.status, 201);
  const PROD_ID = r.data?.id;

  r = await req('GET', `/api/products/${PROD_ID}`, TOKEN);
  check('GET /api/products/:id', r.status, 200);
  if (r.data?.name) console.log(blue(`  商品名稱：${r.data.name}，售價：$${r.data.price}，庫存：${r.data.inventory?.quantity}`));

  r = await req('PUT', `/api/products/${PROD_ID}`, TOKEN, { name: '測試商品_已更新', price: 109 });
  check('PUT /api/products/:id (更新)', r.status, 200);

  // ─── 5. 庫存模組 ───
  console.log(bold('5. 庫存模組'));

  r = await req('GET', '/api/inventory', TOKEN);
  check('GET /api/inventory', r.status, 200);
  if (Array.isArray(r.data)) {
    const low = r.data.filter(i => i.isLowStock).length;
    console.log(blue(`  庫存記錄：${r.data.length} 筆，低庫存：${low} 筆`));
  }

  r = await req('POST', `/api/inventory/${PROD_ID}/adjust`, TOKEN, { quantity: 5, note: '自動測試補貨' });
  check('POST /api/inventory/:id/adjust (+5)', r.status, 200);
  if (r.data?.quantity !== undefined) console.log(blue(`  調整後庫存：${r.data.quantity}`));

  r = await req('POST', `/api/inventory/${PROD_ID}/adjust`, TOKEN, { quantity: -999, note: '超額扣減' });
  check('POST /api/inventory/:id/adjust (負超額應拒絕)', r.status, 400);

  r = await req('GET', `/api/inventory/${PROD_ID}/movements`, TOKEN);
  check('GET /api/inventory/:id/movements', r.status, 200);
  if (Array.isArray(r.data)) console.log(blue(`  異動記錄：${r.data.length} 筆`));

  // ─── 6. 訂單 / 結帳 ───
  console.log(bold('6. 訂單 / 結帳模組'));

  r = await req('GET', '/api/orders', TOKEN);
  check('GET /api/orders', r.status, 200);
  const orderTotal = r.data?.total ?? (Array.isArray(r.data?.orders) ? r.data.orders.length : 0);
  console.log(blue(`  訂單總數：${orderTotal}`));

  r = await req('POST', '/api/orders', TOKEN, {
    items: [{ productId: PROD_ID, quantity: 2 }],
    paymentMethod: 'CASH',
    discountAmount: 10,
  });
  check('POST /api/orders (現金結帳)', r.status, 201);
  if (r.data?.orderNumber) console.log(blue(`  訂單編號：${r.data.orderNumber}，合計：$${r.data.total}`));

  r = await req('POST', '/api/orders', TOKEN, {
    items: [{ productId: PROD_ID, quantity: 99999 }],
    paymentMethod: 'CASH',
  });
  check('POST /api/orders (庫存不足應拒絕)', r.status, 400);

  r = await req('POST', '/api/orders', TOKEN, { items: [], paymentMethod: 'CASH' });
  check('POST /api/orders (空購物車應拒絕)', r.status, 400);

  // ─── 7. 報表模組 ───
  console.log(bold('7. 報表模組'));

  r = await req('GET', '/api/reports/sales/summary', TOKEN);
  check('GET /api/reports/sales/summary', r.status, 200);
  if (r.data?.today) console.log(blue(`  今日營業額：$${r.data.today.revenue}，訂單：${r.data.today.orders} 筆`));

  r = await req('GET', '/api/reports/sales/daily?days=7', TOKEN);
  check('GET /api/reports/sales/daily', r.status, 200);
  if (Array.isArray(r.data)) console.log(blue(`  每日資料：${r.data.length} 天`));

  r = await req('GET', '/api/reports/products/top?limit=5', TOKEN);
  check('GET /api/reports/products/top', r.status, 200);
  if (Array.isArray(r.data) && r.data[0]) console.log(blue(`  熱銷第一：${r.data[0].product?.name}，銷售量：${r.data[0].totalQuantity}`));

  r = await req('GET', '/api/reports/payment-methods', TOKEN);
  check('GET /api/reports/payment-methods', r.status, 200);
  if (Array.isArray(r.data)) r.data.forEach(p => console.log(blue(`  ${p.paymentMethod}: ${p._count} 筆`)));

  // ─── 結果統計 ───
  const TOTAL = PASS + FAIL;
  console.log('\n===========================================');
  console.log(`結果：\x1b[32m通過 ${PASS}\x1b[0m / \x1b[31m失敗 ${FAIL}\x1b[0m / 共 ${TOTAL} 項`);
  if (FAIL === 0) {
    console.log('\x1b[32m✓ 所有測試通過！系統運作正常。\x1b[0m');
  } else {
    console.log(`\x1b[31m✗ 有 ${FAIL} 項測試失敗，請檢查上方 [FAIL] 項目。\x1b[0m`);
    process.exit(1);
  }
  console.log('===========================================\n');
}

run().catch(e => { console.error('測試腳本錯誤:', e.message); process.exit(1); });
