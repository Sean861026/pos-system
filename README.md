# POS 銷售系統

一套基於 Web 的現代化銷售點 (Point of Sale) 系統，支援商品管理、庫存追蹤、收銀結帳與銷售報表。

## 技術棧

| 層級 | 技術 |
|------|------|
| 前端 | React 18 + TypeScript + Ant Design + Zustand + Recharts |
| 後端 | Node.js + Express + TypeScript + Prisma ORM |
| 資料庫 | PostgreSQL 16 |
| 容器化 | Docker + Docker Compose |

## 功能模組

- **POS 收銀** — 商品快速選取、購物車、折扣設定、多種付款方式、結帳成功彈窗
- **商品管理** — 新增／編輯／停用商品，支援分類、SKU、條碼、成本管理
- **庫存管理** — 即時庫存查詢、手動調整、低庫存警示、完整異動記錄
- **報表統計** — 今日／本月營業額、銷售趨勢圖、熱銷商品排行、付款方式分佈

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
| 系統管理員 | admin@pos.com | admin123 |

### pgAdmin 連線設定

登入 pgAdmin（http://localhost:5050，帳號：`admin@pos.com` / 密碼：`admin`）後新增連線：

- Host: `postgres`
- Port: `5432`
- Database: `posdb`
- Username: `posuser`
- Password: `pospassword`

## API 端點

| 方法 | 路徑 | 說明 | 權限 |
|------|------|------|------|
| POST | /api/auth/login | 登入 | 公開 |
| GET | /api/auth/me | 取得當前使用者 | 登入 |
| GET | /api/products | 商品列表 | 登入 |
| POST | /api/products | 新增商品 | 管理員/經理 |
| PUT | /api/products/:id | 更新商品 | 管理員/經理 |
| GET | /api/categories | 分類列表 | 登入 |
| POST | /api/orders | 建立訂單（結帳） | 登入 |
| GET | /api/orders | 訂單列表 | 登入 |
| GET | /api/inventory | 庫存列表 | 登入 |
| POST | /api/inventory/:id/adjust | 調整庫存 | 管理員/經理 |
| GET | /api/reports/sales/summary | 銷售概況 | 管理員/經理 |
| GET | /api/reports/products/top | 熱銷商品 | 管理員/經理 |

## 自動化測試

```bash
MSYS_NO_PATHCONV=1 docker run --rm \
  --network pos-system_default \
  -v "$(pwd)/test-api.mjs:/test-api.mjs" \
  -e BASE_URL=http://pos_backend:3001 \
  node:20-slim node /test-api.mjs
```

共 23 項 API 測試，覆蓋認證、商品、庫存、訂單、報表所有模組。

## 專案結構

```
pos-system/
├── docker-compose.yml
├── test-api.mjs              # API 自動化測試
├── backend/
│   ├── Dockerfile
│   ├── prisma/
│   │   ├── schema.prisma     # 資料庫模型
│   │   └── seed.ts           # 初始資料
│   └── src/
│       ├── app.ts
│       ├── middleware/auth.ts
│       └── routes/           # products / orders / inventory / reports
└── frontend/
    ├── Dockerfile
    └── src/
        ├── api/              # axios 封裝
        ├── store/            # Zustand 狀態管理
        ├── types/            # TypeScript 型別
        └── pages/            # POS / Products / Inventory / Reports
```

## 未來規劃

- 金流串接（綠界 ECPay / 藍新 / Stripe）
- 使用者管理（新增員工帳號、角色權限）
- 電子收據列印
- 多分店支援
