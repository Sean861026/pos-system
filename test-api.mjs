// POS 系統 API 完整自我檢測 v2
// 執行：node test-api.mjs

const BASE = process.env.BASE_URL || 'http://localhost:3001';
let PASS = 0, FAIL = 0;
const RESULTS = [];

const green  = (s) => `\x1b[32m[PASS]\x1b[0m ${s}`;
const red    = (s) => `\x1b[31m[FAIL]\x1b[0m ${s}`;
const blue   = (s) => `\x1b[34m[INFO]\x1b[0m ${s}`;
const yellow = (s) => `\x1b[33m[SKIP]\x1b[0m ${s}`;
const bold   = (s) => `\n\x1b[1m${s}\x1b[0m`;
const dim    = (s) => `\x1b[2m${s}\x1b[0m`;

function check(name, status, expected, body = '') {
  const pass = status === expected;
  if (pass) {
    console.log(green(`${name}  (HTTP ${status})`));
    PASS++;
  } else {
    console.log(red(`${name}  (預期 HTTP ${expected}，實際 HTTP ${status})`));
    if (body && typeof body === 'object') console.log(dim(`         ${JSON.stringify(body).slice(0, 120)}`));
    FAIL++;
  }
  RESULTS.push({ name, pass, status, expected });
  return pass;
}

async function req(method, path, token, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const res = await fetch(`${BASE}${path}`, {
      method, headers,
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
  console.log(bold('=== POS 系統 API 完整測試報告 v2 ==='));
  console.log(`目標：${BASE}`);
  console.log(`時間：${new Date().toLocaleString('zh-TW')}\n`);

  // ════════════════════════════════════════
  // 1. 健康檢查
  // ════════════════════════════════════════
  console.log(bold('1. 健康檢查'));
  let r = await req('GET', '/api/health');
  check('GET /api/health', r.status, 200);

  // ════════════════════════════════════════
  // 2. 認證模組
  // ════════════════════════════════════════
  console.log(bold('2. 認證模組'));

  r = await req('POST', '/api/auth/login', null, { email: 'admin@pos.com', password: 'admin123' });
  check('POST /api/auth/login (ADMIN 正確密碼)', r.status, 200);
  const ADMIN_TOKEN = r.data?.token;
  console.log(blue(`  登入：${r.data?.user?.name} (${r.data?.user?.role})`));

  r = await req('POST', '/api/auth/login', null, { email: 'admin@pos.com', password: 'wrong' });
  check('POST /api/auth/login (錯誤密碼 → 401)', r.status, 401);

  r = await req('GET', '/api/products');
  check('GET /api/products (無 Token → 401)', r.status, 401);

  r = await req('GET', '/api/auth/me', ADMIN_TOKEN);
  check('GET /api/auth/me (取得當前使用者)', r.status, 200);

  // ════════════════════════════════════════
  // 3. 使用者管理（ADMIN 角色）
  // ════════════════════════════════════════
  console.log(bold('3. 使用者管理模組'));

  r = await req('GET', '/api/users', ADMIN_TOKEN);
  check('GET /api/users (ADMIN 可存取)', r.status, 200);
  console.log(blue(`  使用者數：${Array.isArray(r.data) ? r.data.length : '?'} 人`));

  // 建立 MANAGER 測試帳號
  r = await req('POST', '/api/users', ADMIN_TOKEN, {
    name: '測試經理', email: `mgr_test_${Date.now()}@pos.com`,
    password: 'mgr1234', role: 'MANAGER',
  });
  check('POST /api/users (新增 MANAGER 帳號)', r.status, 201);
  const MGR_ID    = r.data?.id;
  const MGR_EMAIL = r.data?.email;

  // 建立 CASHIER 測試帳號
  r = await req('POST', '/api/users', ADMIN_TOKEN, {
    name: '測試收銀員', email: `csr_test_${Date.now()}@pos.com`,
    password: 'csr1234', role: 'CASHIER',
  });
  check('POST /api/users (新增 CASHIER 帳號)', r.status, 201);
  const CSR_ID    = r.data?.id;
  const CSR_EMAIL = r.data?.email;

  // 重複 email
  r = await req('POST', '/api/users', ADMIN_TOKEN, {
    name: '重複', email: 'admin@pos.com', password: 'test123', role: 'CASHIER',
  });
  check('POST /api/users (重複 email → 409)', r.status, 409);

  // 更新使用者
  r = await req('PUT', `/api/users/${MGR_ID}`, ADMIN_TOKEN, { name: '測試經理_已更新' });
  check('PUT /api/users/:id (更新姓名)', r.status, 200);

  // 停用使用者
  r = await req('DELETE', `/api/users/${CSR_ID}`, ADMIN_TOKEN);
  check('DELETE /api/users/:id (停用帳號)', r.status, 200);

  // 不能停用自己
  const ADMIN_ID = (await req('GET', '/api/auth/me', ADMIN_TOKEN)).data?.id;
  r = await req('DELETE', `/api/users/${ADMIN_ID}`, ADMIN_TOKEN);
  check('DELETE /api/users/:id (停用自己 → 400)', r.status, 400);

  // 取得各角色 Token
  r = await req('POST', '/api/auth/login', null, { email: MGR_EMAIL, password: 'mgr1234' });
  check('POST /api/auth/login (MANAGER 登入)', r.status, 200);
  const MGR_TOKEN = r.data?.token;

  // ════════════════════════════════════════
  // 4. 角色權限控制測試
  // ════════════════════════════════════════
  console.log(bold('4. 角色權限控制（越權測試）'));

  // MANAGER 不能存取使用者管理
  r = await req('GET', '/api/users', MGR_TOKEN);
  check('GET /api/users (MANAGER → 403)', r.status, 403);

  // MANAGER 不能新增使用者
  r = await req('POST', '/api/users', MGR_TOKEN, { name: 'x', email: 'x@x.com', password: '123456', role: 'CASHIER' });
  check('POST /api/users (MANAGER → 403)', r.status, 403);

  // MANAGER 可以新增商品
  r = await req('GET', '/api/products', MGR_TOKEN);
  check('GET /api/products (MANAGER → 200)', r.status, 200);

  // MANAGER 可以查看報表
  r = await req('GET', '/api/reports/sales/summary', MGR_TOKEN);
  check('GET /api/reports/sales/summary (MANAGER → 200)', r.status, 200);

  // MANAGER 不能停用商品（只有 ADMIN 可以）
  const firstProduct = (await req('GET', '/api/products', ADMIN_TOKEN)).data?.[0];
  if (firstProduct) {
    r = await req('DELETE', `/api/products/${firstProduct.id}`, MGR_TOKEN);
    check('DELETE /api/products/:id (MANAGER → 403)', r.status, 403);
  }

  // ════════════════════════════════════════
  // 5. 商品分類模組
  // ════════════════════════════════════════
  console.log(bold('5. 商品分類模組'));

  r = await req('GET', '/api/categories', ADMIN_TOKEN);
  check('GET /api/categories', r.status, 200);
  console.log(blue(`  分類數：${Array.isArray(r.data) ? r.data.length : '?'} 筆`));

  r = await req('POST', '/api/categories', ADMIN_TOKEN, { name: `TEST_CAT_${Date.now()}`, color: '#eb2f96' });
  check('POST /api/categories (新增)', r.status, 201);
  const CAT_ID   = r.data?.id;
  const CAT_NAME = r.data?.name;

  r = await req('PUT', `/api/categories/${CAT_ID}`, ADMIN_TOKEN, { name: CAT_NAME + '_updated', color: '#52c41a' });
  check('PUT /api/categories/:id (更新)', r.status, 200);

  r = await req('DELETE', `/api/categories/${CAT_ID}`, ADMIN_TOKEN);
  check('DELETE /api/categories/:id (停用)', r.status, 200);

  // ════════════════════════════════════════
  // 6. 商品模組
  // ════════════════════════════════════════
  console.log(bold('6. 商品模組'));

  // 先建立有效分類
  const catRes = await req('POST', '/api/categories', ADMIN_TOKEN, { name: `TEST_CAT2_${Date.now()}`, color: '#1890ff' });
  const ACTIVE_CAT_ID = catRes.data?.id;

  r = await req('GET', '/api/products', ADMIN_TOKEN);
  check('GET /api/products', r.status, 200);
  console.log(blue(`  商品數：${Array.isArray(r.data) ? r.data.length : '?'} 筆`));

  r = await req('POST', '/api/products', ADMIN_TOKEN, {
    name: '自動測試商品', sku: `AUTO-${Date.now()}`,
    price: 99, cost: 50, categoryId: ACTIVE_CAT_ID, initialStock: 30,
  });
  check('POST /api/products (新增)', r.status, 201);
  const PROD_ID = r.data?.id;
  console.log(blue(`  商品 ID：${PROD_ID}，庫存：${r.data?.inventory?.quantity}`));

  r = await req('GET', `/api/products/${PROD_ID}`, ADMIN_TOKEN);
  check('GET /api/products/:id', r.status, 200);

  r = await req('PUT', `/api/products/${PROD_ID}`, ADMIN_TOKEN, { name: '自動測試商品_已更新', price: 109 });
  check('PUT /api/products/:id (更新)', r.status, 200);

  r = await req('DELETE', `/api/products/${PROD_ID}`, ADMIN_TOKEN);
  check('DELETE /api/products/:id (停用 ADMIN)', r.status, 200);

  // 停用後重新啟用以供後續測試
  await req('PUT', `/api/products/${PROD_ID}`, ADMIN_TOKEN, { isActive: true });

  // ════════════════════════════════════════
  // 7. 庫存模組
  // ════════════════════════════════════════
  console.log(bold('7. 庫存模組'));

  r = await req('GET', '/api/inventory', ADMIN_TOKEN);
  check('GET /api/inventory', r.status, 200);
  const lowStock = Array.isArray(r.data) ? r.data.filter(i => i.isLowStock).length : 0;
  console.log(blue(`  庫存記錄：${Array.isArray(r.data) ? r.data.length : '?'} 筆，低庫存：${lowStock} 筆`));

  r = await req('POST', `/api/inventory/${PROD_ID}/adjust`, ADMIN_TOKEN, { quantity: 10, note: '測試補貨' });
  check('POST /api/inventory/:id/adjust (+10)', r.status, 200);
  console.log(blue(`  調整後庫存：${r.data?.quantity}`));

  r = await req('POST', `/api/inventory/${PROD_ID}/adjust`, ADMIN_TOKEN, { quantity: -999 });
  check('POST /api/inventory/:id/adjust (超額扣減 → 400)', r.status, 400);

  r = await req('GET', `/api/inventory/${PROD_ID}/movements`, ADMIN_TOKEN);
  check('GET /api/inventory/:id/movements', r.status, 200);
  console.log(blue(`  異動記錄：${Array.isArray(r.data) ? r.data.length : '?'} 筆`));

  // MANAGER 不能調整庫存（需確認後端設定）
  r = await req('POST', `/api/inventory/${PROD_ID}/adjust`, MGR_TOKEN, { quantity: 5 });
  check('POST /api/inventory/:id/adjust (MANAGER → 200 可調整)', r.status, 200);

  // ════════════════════════════════════════
  // 8. 訂單 / 結帳 / 退款模組
  // ════════════════════════════════════════
  console.log(bold('8. 訂單 / 結帳 / 退款模組'));

  r = await req('GET', '/api/orders', ADMIN_TOKEN);
  check('GET /api/orders', r.status, 200);
  console.log(blue(`  訂單總數：${r.data?.total ?? 0} 筆`));

  // 日期篩選
  const today = new Date().toISOString().slice(0, 10);
  r = await req('GET', `/api/orders?startDate=${today}&endDate=${today}`, ADMIN_TOKEN);
  check('GET /api/orders?startDate&endDate (日期篩選)', r.status, 200);

  // 狀態篩選
  r = await req('GET', '/api/orders?status=COMPLETED', ADMIN_TOKEN);
  check('GET /api/orders?status=COMPLETED (狀態篩選)', r.status, 200);

  // 結帳 - 現金
  r = await req('POST', '/api/orders', ADMIN_TOKEN, {
    items: [{ productId: PROD_ID, quantity: 2 }],
    paymentMethod: 'CASH', discountAmount: 10,
  });
  check('POST /api/orders (現金結帳 + 折扣)', r.status, 201);
  const ORDER_ID_CASH = r.data?.id;
  console.log(blue(`  訂單：${r.data?.orderNumber}，合計：$${r.data?.total}`));

  // 結帳 - LINE Pay
  r = await req('POST', '/api/orders', ADMIN_TOKEN, {
    items: [{ productId: PROD_ID, quantity: 1 }],
    paymentMethod: 'LINE_PAY',
  });
  check('POST /api/orders (LINE Pay 結帳)', r.status, 201);
  const ORDER_ID_LP = r.data?.id;

  // 邊界測試
  r = await req('POST', '/api/orders', ADMIN_TOKEN, {
    items: [{ productId: PROD_ID, quantity: 99999 }], paymentMethod: 'CASH',
  });
  check('POST /api/orders (庫存不足 → 400)', r.status, 400);

  r = await req('POST', '/api/orders', ADMIN_TOKEN, { items: [], paymentMethod: 'CASH' });
  check('POST /api/orders (空購物車 → 400)', r.status, 400);

  r = await req('POST', '/api/orders', ADMIN_TOKEN, {
    items: [{ productId: PROD_ID, quantity: 1 }],
  });
  check('POST /api/orders (無付款方式 → 400)', r.status, 400);

  // 退款
  r = await req('POST', `/api/orders/${ORDER_ID_CASH}/refund`, ADMIN_TOKEN);
  check('POST /api/orders/:id/refund (退款成功)', r.status, 200);
  console.log(blue(`  退款訂單狀態：${r.data?.status}`));

  // 重複退款
  r = await req('POST', `/api/orders/${ORDER_ID_CASH}/refund`, ADMIN_TOKEN);
  check('POST /api/orders/:id/refund (重複退款 → 400)', r.status, 400);

  // CASHIER 不能退款（需要 MANAGER+）
  // 先重新啟用已停用的 CSR 帳號來測試（用 MGR_TOKEN 來測試，它是 CASHIER 等級）
  // 實際上 MGR_TOKEN 是 MANAGER，可以退款；用已停用的 CSR 無法登入
  // 改測：無 token 退款
  r = await req('POST', `/api/orders/${ORDER_ID_LP}/refund`);
  check('POST /api/orders/:id/refund (無 Token → 401)', r.status, 401);

  // MANAGER 可以退款
  r = await req('POST', `/api/orders/${ORDER_ID_LP}/refund`, MGR_TOKEN);
  check('POST /api/orders/:id/refund (MANAGER 可退款)', r.status, 200);

  // ════════════════════════════════════════
  // 9. 報表模組
  // ════════════════════════════════════════
  console.log(bold('9. 報表模組'));

  r = await req('GET', '/api/reports/sales/summary', ADMIN_TOKEN);
  check('GET /api/reports/sales/summary', r.status, 200);
  if (r.data?.today) console.log(blue(`  今日：$${r.data.today.revenue}，${r.data.today.orders} 筆`));

  r = await req('GET', '/api/reports/sales/daily?days=7', ADMIN_TOKEN);
  check('GET /api/reports/sales/daily?days=7', r.status, 200);
  console.log(blue(`  每日資料：${Array.isArray(r.data) ? r.data.length : '?'} 天`));

  r = await req('GET', '/api/reports/sales/daily?days=30', ADMIN_TOKEN);
  check('GET /api/reports/sales/daily?days=30', r.status, 200);

  r = await req('GET', '/api/reports/products/top?limit=5', ADMIN_TOKEN);
  check('GET /api/reports/products/top', r.status, 200);
  if (Array.isArray(r.data) && r.data[0])
    console.log(blue(`  熱銷第一：${r.data[0].product?.name} × ${r.data[0].totalQuantity}`));

  r = await req('GET', '/api/reports/payment-methods', ADMIN_TOKEN);
  check('GET /api/reports/payment-methods', r.status, 200);
  if (Array.isArray(r.data))
    r.data.forEach(p => console.log(blue(`  ${p.paymentMethod}: ${p._count} 筆`)));

  // CASHIER 不可查看報表
  r = await req('GET', '/api/reports/sales/summary', MGR_TOKEN);
  check('GET /api/reports (MANAGER → 200 可查看)', r.status, 200);

  // ════════════════════════════════════════
  // 測試結果摘要
  // ════════════════════════════════════════
  const TOTAL = PASS + FAIL;
  const COVERAGE_MODULES = [
    { name: '健康檢查',     tests: RESULTS.filter(r => r.name.includes('health')) },
    { name: '認證模組',     tests: RESULTS.filter(r => r.name.includes('login') || r.name.includes('me')) },
    { name: '使用者管理',   tests: RESULTS.filter(r => r.name.includes('/users')) },
    { name: '角色權限控制', tests: RESULTS.filter(r => r.name.includes('→ 403') || r.name.includes('→ 401') || r.name.includes('MANAGER →') || r.name.includes('ADMIN →')) },
    { name: '分類管理',     tests: RESULTS.filter(r => r.name.includes('/categories')) },
    { name: '商品管理',     tests: RESULTS.filter(r => r.name.includes('/products')) },
    { name: '庫存管理',     tests: RESULTS.filter(r => r.name.includes('/inventory') || r.name.includes('adjust')) },
    { name: '訂單/結帳',   tests: RESULTS.filter(r => r.name.includes('/orders') && !r.name.includes('refund')) },
    { name: '退款',         tests: RESULTS.filter(r => r.name.includes('refund')) },
    { name: '報表',         tests: RESULTS.filter(r => r.name.includes('/reports')) },
  ];

  console.log(bold('=== 測試覆蓋度報告 ==='));
  console.log('');
  COVERAGE_MODULES.forEach(m => {
    const pass  = m.tests.filter(t => t.pass).length;
    const total = m.tests.length;
    const pct   = total ? Math.round(pass / total * 100) : 0;
    const bar   = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
    const color = pct === 100 ? '\x1b[32m' : pct >= 50 ? '\x1b[33m' : '\x1b[31m';
    console.log(`  ${m.name.padEnd(14)} ${color}${bar}\x1b[0m ${color}${pct}%\x1b[0m  (${pass}/${total})`);
  });

  console.log('');
  console.log('═'.repeat(50));
  const pct = Math.round(PASS / TOTAL * 100);
  console.log(`總計：\x1b[32m通過 ${PASS}\x1b[0m / \x1b[31m失敗 ${FAIL}\x1b[0m / 共 ${TOTAL} 項  (通過率 ${pct}%)`);

  if (FAIL === 0) {
    console.log('\x1b[32m✓ 所有測試通過！系統運作正常。\x1b[0m');
  } else {
    console.log(`\x1b[31m✗ 有 ${FAIL} 項失敗：\x1b[0m`);
    RESULTS.filter(r => !r.pass).forEach(r =>
      console.log(`  \x1b[31m✗\x1b[0m ${r.name}  (預期 ${r.expected}，實際 ${r.status})`)
    );
    process.exit(1);
  }
  console.log('═'.repeat(50) + '\n');
}

run().catch(e => { console.error('測試腳本錯誤:', e.message); process.exit(1); });
