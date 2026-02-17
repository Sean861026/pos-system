# POS 銷售系統

一套基於 Web 的現代化銷售點 (Point of Sale) 系統，支援商品管理、庫存追蹤、收銀結帳、銷售報表與角色權限管理。

## 技術棧

| 層級 | 技術 |
|------|------|
| 前端 | React 18 + TypeScript + Ant Design + Zustand + Recharts |
| 後端 | Node.js + Express + TypeScript + Prisma ORM |
| 資料庫 | PostgreSQL 16 |
| 容器化 | Docker + Docker Compose |

## 功能模組

- **POS 收銀** — 商品快速選取、購物車、折扣設定、多種付款方式、電子收據列印
- **訂單管理** — 訂單歷史查詢、日期範圍篩選、退款處理、收據重印
- **商品管理** — 新增／編輯／停用商品，支援分類、SKU、條碼、成本管理
- **分類管理** — 商品分類 CRUD、自訂顏色標籤、查看各分類商品數量
- **庫存管理** — 即時庫存查詢、手動調整、低庫存警示、完整異動記錄
- **報表統計** — 今日／本月營業額、銷售趨勢圖、熱銷商品排行、付款方式分佈
- **使用者管理** — 員工帳號 CRUD、角色指派、帳號啟用／停用

## 角色與權限

### 角色層級

系統共有三種角色，等級由低至高：

```
CASHIER（收銀員）  <  MANAGER（經理）  <  ADMIN（系統管理員）
```

### 各角色可使用的功能

| 功能頁面 | CASHIER | MANAGER | ADMIN |
|----------|:-------:|:-------:|:-----:|
| POS 收銀 | ✅ | ✅ | ✅ |
| 訂單管理 | ✅ | ✅ | ✅ |
| 庫存管理 | ✅ | ✅ | ✅ |
| 商品管理 | ❌ | ✅ | ✅ |
| 分類管理 | ❌ | ✅ | ✅ |
| 報表統計 | ❌ | ✅ | ✅ |
| 使用者管理 | ❌ | ❌ | ✅ |

### 後端 API 權限對照

| 操作 | 所需角色 |
|------|---------|
| 登入／查詢當前使用者 | 公開 / 登入 |
| 查詢商品、庫存、訂單 | 任何登入者 |
| 結帳（建立訂單） | 任何登入者 |
| 新增／編輯商品、分類 | MANAGER 以上 |
| 調整庫存 | MANAGER 以上 |
| 訂單退款 | MANAGER 以上 |
| 查詢報表 | MANAGER 以上 |
| 使用者管理（CRUD） | ADMIN |

### 權限不足的處理方式

當使用者嘗試進入無權限的頁面時，系統**不會強制跳轉**，而是：

1. 頁面內容以**模糊效果**顯示於背景（不可互動）
2. 彈出說明對話框，告知所需的最低角色
3. 提示「請聯繫最近可協助您的 **[角色名稱]**」
   - 例：CASHIER 嘗試進入商品管理 → 提示聯繫 **經理**
   - 例：CASHIER 嘗試進入使用者管理 → 提示聯繫 **經理**（最近一層）
4. 點擊「返回上一頁」即可離開

## 快速啟動

### 前置需求

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### 一鍵啟動

```bash
git clone https://github.com/Sean861026/pos-system.git
cd pos-system
docker-compose up -d --build
```

等待約 1-2 分鐘，容器全部啟動後開啟瀏覽器：

| 服務 | 網址 |
|------|------|
| POS 前端介面 | http://localhost:3000 |
| 後端 API | http://localhost:3001/api/health |
| pgAdmin 資料庫管理 | http://localhost:5050 |

### 預設帳號

| 角色 | 帳號 | 密碼 |
|------|------|------|
| 系統管理員（ADMIN） | admin@pos.com | admin123 |
| 經理（MANAGER） | manager@pos.com | manager123 |
| 收銀員（CASHIER） | cashier@pos.com | cashier123 |

> 所有預設帳號於容器首次啟動時由 `prisma/seed.ts` 自動建立。

### pgAdmin 連線設定

登入 pgAdmin（http://localhost:5050，帳號：`admin@pos.com` / 密碼：`admin`）後新增連線：

- Host: `postgres`
- Port: `5432`
- Database: `posdb`
- Username: `posuser`
- Password: `pospassword`

## API 端點

| 方法 | 路徑 | 說明 | 所需角色 |
|------|------|------|---------|
| POST | /api/auth/login | 登入 | 公開 |
| GET | /api/auth/me | 取得當前使用者 | 登入 |
| GET | /api/products | 商品列表 | 登入 |
| POST | /api/products | 新增商品 | MANAGER+ |
| PUT | /api/products/:id | 更新商品 | MANAGER+ |
| GET | /api/categories | 分類列表 | 登入 |
| POST | /api/categories | 新增分類 | MANAGER+ |
| PUT | /api/categories/:id | 更新分類 | MANAGER+ |
| DELETE | /api/categories/:id | 刪除分類 | MANAGER+ |
| POST | /api/orders | 建立訂單（結帳） | 登入 |
| GET | /api/orders | 訂單列表 | 登入 |
| GET | /api/orders/:id | 訂單詳情 | 登入 |
| POST | /api/orders/:id/refund | 訂單退款 | MANAGER+ |
| GET | /api/inventory | 庫存列表 | 登入 |
| POST | /api/inventory/:id/adjust | 調整庫存 | MANAGER+ |
| GET | /api/reports/sales/summary | 銷售概況 | MANAGER+ |
| GET | /api/reports/products/top | 熱銷商品 | MANAGER+ |
| GET | /api/users | 使用者列表 | ADMIN |
| POST | /api/users | 新增使用者 | ADMIN |
| PUT | /api/users/:id | 更新使用者 | ADMIN |
| DELETE | /api/users/:id | 停用使用者 | ADMIN |

## 自動化測試

```bash
# Windows Git Bash
MSYS_NO_PATHCONV=1 docker run --rm \
  --network pos-system_default \
  -v "$(pwd)/test-api.mjs:/test-api.mjs" \
  -e BASE_URL=http://pos_backend:3001 \
  node:20-slim node /test-api.mjs

# Windows PowerShell
docker run --rm `
  --network pos-system_default `
  -v "${PWD}/test-api.mjs:/test-api.mjs" `
  -e BASE_URL=http://pos_backend:3001 `
  node:20-slim node /test-api.mjs
```

測試涵蓋 9 大模組、50+ 個測試案例：

| 模組 | 說明 |
|------|------|
| Health Check | 後端服務健康狀態 |
| 認證（Auth） | 登入、Token 驗證、錯誤憑證拒絕 |
| 使用者管理 | ADMIN CRUD、角色指派 |
| 角色權限控管 | 低權限帳號存取受保護資源（預期 403） |
| 分類管理 | CRUD 完整流程 |
| 商品管理 | 新增、更新、SKU 查詢 |
| 庫存管理 | 列表查詢、數量調整 |
| 訂單 / 結帳 / 退款 | 結帳流程、退款、重複退款拒絕、狀態篩選 |
| 報表 | 銷售概況、熱銷商品排行 |

## 專案結構

```
pos-system/
├── docker-compose.yml
├── test-api.mjs              # API 自動化測試（v2）
├── backend/
│   ├── Dockerfile
│   ├── prisma/
│   │   ├── schema.prisma     # 資料庫模型
│   │   └── seed.ts           # 初始資料（三組預設帳號）
│   └── src/
│       ├── app.ts
│       ├── middleware/auth.ts # JWT 驗證 + 角色檢查
│       └── routes/           # auth / products / categories / orders / inventory / reports / users
└── frontend/
    ├── Dockerfile
    └── src/
        ├── api/              # axios 封裝
        ├── components/
        │   ├── Layout/       # MainLayout（側邊欄依角色動態顯示選單）
        │   ├── PermissionGuard.tsx  # 權限守衛（模糊頁面 + 對話框）
        │   └── Receipt/      # 電子收據列印
        ├── store/            # Zustand 狀態（auth / cart）
        ├── types/            # TypeScript 型別
        └── pages/            # POS / Orders / Products / Categories / Inventory / Reports / Users
```

## 未來規劃

- 金流串接（綠界 ECPay / 藍新 / Stripe）
- 多分店支援
- 班別管理與交班報表
