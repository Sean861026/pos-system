#!/bin/sh
# POS 系統 API 完整自我檢測

BASE_URL="http://localhost:3001"
PASS=0
FAIL=0

green() { printf "\033[32m[PASS]\033[0m %s\n" "$1"; }
red()   { printf "\033[31m[FAIL]\033[0m %s\n" "$1"; }
blue()  { printf "\033[34m[----]\033[0m %s\n" "$1"; }
bold()  { printf "\n\033[1m%s\033[0m\n" "$1"; }

check() {
  NAME=$1
  STATUS=$2
  EXPECTED=$3
  BODY=$4

  if [ "$STATUS" = "$EXPECTED" ]; then
    green "$NAME (HTTP $STATUS)"
    PASS=$((PASS+1))
  else
    red "$NAME (預期 HTTP $EXPECTED，實際 HTTP $STATUS)"
    [ -n "$BODY" ] && printf "       錯誤：%s\n" "$BODY"
    FAIL=$((FAIL+1))
  fi
}

bold "=== POS 系統 API 自我檢測 ==="
printf "目標：%s\n" "$BASE_URL"
printf "時間：%s\n" "$(date)"

# ─────────────────────────────
bold "1. 基礎健康檢查"
# ─────────────────────────────
RES=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/health")
STATUS=$(echo "$RES" | tail -1)
BODY=$(echo "$RES" | head -1)
check "健康檢查 GET /api/health" "$STATUS" "200" "$BODY"

# ─────────────────────────────
bold "2. 認證模組"
# ─────────────────────────────

# 正確登入
RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pos.com","password":"admin123"}')
STATUS=$(echo "$RES" | tail -1)
BODY=$(echo "$RES" | head -1)
check "登入成功 POST /api/auth/login" "$STATUS" "200" "$BODY"

TOKEN=$(echo "$BODY" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# 錯誤密碼
RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pos.com","password":"wrongpassword"}')
STATUS=$(echo "$RES" | tail -1)
check "錯誤密碼拒絕 POST /api/auth/login" "$STATUS" "401"

# 無 Token 存取
RES=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/products")
STATUS=$(echo "$RES" | tail -1)
check "無 Token 拒絕存取 GET /api/products" "$STATUS" "401"

# 取得當前使用者
RES=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/auth/me" \
  -H "Authorization: Bearer $TOKEN")
STATUS=$(echo "$RES" | tail -1)
check "取得使用者資訊 GET /api/auth/me" "$STATUS" "200"

# ─────────────────────────────
bold "3. 商品分類模組"
# ─────────────────────────────

RES=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/categories" \
  -H "Authorization: Bearer $TOKEN")
STATUS=$(echo "$RES" | tail -1)
BODY=$(echo "$RES" | head -1)
check "取得分類列表 GET /api/categories" "$STATUS" "200"
CAT_COUNT=$(echo "$BODY" | grep -o '"id"' | wc -l | tr -d ' ')
blue "  分類數量：$CAT_COUNT 筆"

# 新增分類
RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/categories" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"測試分類_自動","color":"#eb2f96"}')
STATUS=$(echo "$RES" | tail -1)
BODY=$(echo "$RES" | head -1)
check "新增分類 POST /api/categories" "$STATUS" "201"
CAT_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

# ─────────────────────────────
bold "4. 商品模組"
# ─────────────────────────────

RES=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/products" \
  -H "Authorization: Bearer $TOKEN")
STATUS=$(echo "$RES" | tail -1)
BODY=$(echo "$RES" | head -1)
check "取得商品列表 GET /api/products" "$STATUS" "200"
PROD_COUNT=$(echo "$BODY" | grep -o '"id"' | wc -l | tr -d ' ')
blue "  商品數量：$PROD_COUNT 筆"

# 新增商品
RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/products" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"測試商品\",\"sku\":\"TEST001\",\"price\":99,\"cost\":50,\"categoryId\":\"$CAT_ID\",\"initialStock\":10}")
STATUS=$(echo "$RES" | tail -1)
BODY=$(echo "$RES" | head -1)
check "新增商品 POST /api/products" "$STATUS" "201"
PROD_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

# 取得單一商品
RES=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/products/$PROD_ID" \
  -H "Authorization: Bearer $TOKEN")
STATUS=$(echo "$RES" | tail -1)
check "取得單一商品 GET /api/products/:id" "$STATUS" "200"

# ─────────────────────────────
bold "5. 庫存模組"
# ─────────────────────────────

RES=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/inventory" \
  -H "Authorization: Bearer $TOKEN")
STATUS=$(echo "$RES" | tail -1)
BODY=$(echo "$RES" | head -1)
check "取得庫存列表 GET /api/inventory" "$STATUS" "200"
INV_COUNT=$(echo "$BODY" | grep -o '"id"' | wc -l | tr -d ' ')
blue "  庫存記錄數：$INV_COUNT 筆"

# 調整庫存
RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/inventory/$PROD_ID/adjust" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"quantity":5,"note":"自動測試補貨"}')
STATUS=$(echo "$RES" | tail -1)
check "調整庫存 POST /api/inventory/:id/adjust" "$STATUS" "200"

# 庫存異動記錄
RES=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/inventory/$PROD_ID/movements" \
  -H "Authorization: Bearer $TOKEN")
STATUS=$(echo "$RES" | tail -1)
check "庫存異動記錄 GET /api/inventory/:id/movements" "$STATUS" "200"

# ─────────────────────────────
bold "6. 訂單 / 結帳模組"
# ─────────────────────────────

RES=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/orders" \
  -H "Authorization: Bearer $TOKEN")
STATUS=$(echo "$RES" | tail -1)
check "取得訂單列表 GET /api/orders" "$STATUS" "200"

# 建立訂單（結帳）
RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"items\":[{\"productId\":\"$PROD_ID\",\"quantity\":2}],\"paymentMethod\":\"CASH\",\"discountAmount\":0}")
STATUS=$(echo "$RES" | tail -1)
BODY=$(echo "$RES" | head -1)
check "建立訂單結帳 POST /api/orders" "$STATUS" "201"
ORDER_NUM=$(echo "$BODY" | grep -o '"orderNumber":"[^"]*"' | cut -d'"' -f4)
ORDER_TOTAL=$(echo "$BODY" | grep -o '"total":"[^"]*"' | cut -d'"' -f4)
blue "  訂單編號：$ORDER_NUM，金額：\$$ORDER_TOTAL"

# 庫存不足測試
RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"items\":[{\"productId\":\"$PROD_ID\",\"quantity\":99999}],\"paymentMethod\":\"CASH\"}")
STATUS=$(echo "$RES" | tail -1)
check "庫存不足拒絕 POST /api/orders" "$STATUS" "400"

# ─────────────────────────────
bold "7. 報表模組"
# ─────────────────────────────

RES=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/reports/sales/summary" \
  -H "Authorization: Bearer $TOKEN")
STATUS=$(echo "$RES" | tail -1)
BODY=$(echo "$RES" | head -1)
check "銷售概況 GET /api/reports/sales/summary" "$STATUS" "200"

RES=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/reports/sales/daily?days=7" \
  -H "Authorization: Bearer $TOKEN")
STATUS=$(echo "$RES" | tail -1)
check "每日銷售 GET /api/reports/sales/daily" "$STATUS" "200"

RES=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/reports/products/top" \
  -H "Authorization: Bearer $TOKEN")
STATUS=$(echo "$RES" | tail -1)
check "熱銷商品 GET /api/reports/products/top" "$STATUS" "200"

RES=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/reports/payment-methods" \
  -H "Authorization: Bearer $TOKEN")
STATUS=$(echo "$RES" | tail -1)
check "付款方式統計 GET /api/reports/payment-methods" "$STATUS" "200"

# ─────────────────────────────
bold "=== 測試結果 ==="
# ─────────────────────────────
TOTAL=$((PASS+FAIL))
printf "\033[32m通過：%d\033[0m / \033[31m失敗：%d\033[0m / 共 %d 項\n" "$PASS" "$FAIL" "$TOTAL"

if [ "$FAIL" = "0" ]; then
  printf "\n\033[32m✓ 所有測試通過！系統運作正常。\033[0m\n\n"
  exit 0
else
  printf "\n\033[31m✗ 有 %d 項測試失敗，請檢查上方 [FAIL] 項目。\033[0m\n\n" "$FAIL"
  exit 1
fi
