import { PrismaClient, UserRole, MovementType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('開始建立種子資料...');

  // 建立管理員帳號
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@pos.com' },
    update: {},
    create: {
      name: '系統管理員',
      email: 'admin@pos.com',
      password: adminPassword,
      role: UserRole.ADMIN,
    },
  });
  console.log('已建立管理員帳號:', admin.email);

  // 建立商品分類
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: '飲料' },
      update: {},
      create: { name: '飲料', color: '#1890ff', sortOrder: 1 },
    }),
    prisma.category.upsert({
      where: { name: '食品' },
      update: {},
      create: { name: '食品', color: '#52c41a', sortOrder: 2 },
    }),
    prisma.category.upsert({
      where: { name: '零食' },
      update: {},
      create: { name: '零食', color: '#faad14', sortOrder: 3 },
    }),
    prisma.category.upsert({
      where: { name: '日用品' },
      update: {},
      create: { name: '日用品', color: '#f5222d', sortOrder: 4 },
    }),
  ]);
  console.log('已建立', categories.length, '個商品分類');

  // 建立示範商品
  const sampleProducts = [
    { name: '礦泉水 600ml', sku: 'DRK001', price: 20, cost: 10, categoryIndex: 0, stock: 100 },
    { name: '綠茶 500ml', sku: 'DRK002', price: 25, cost: 12, categoryIndex: 0, stock: 80 },
    { name: '黑咖啡 250ml', sku: 'DRK003', price: 35, cost: 15, categoryIndex: 0, stock: 60 },
    { name: '御飯糰 鮭魚', sku: 'FD001', price: 40, cost: 20, categoryIndex: 1, stock: 30 },
    { name: '三明治', sku: 'FD002', price: 55, cost: 25, categoryIndex: 1, stock: 25 },
    { name: '泡麵', sku: 'SN001', price: 30, cost: 12, categoryIndex: 2, stock: 50 },
    { name: '洋芋片', sku: 'SN002', price: 45, cost: 18, categoryIndex: 2, stock: 40 },
    { name: '濕紙巾', sku: 'DLY001', price: 35, cost: 15, categoryIndex: 3, stock: 20 },
  ];

  for (const p of sampleProducts) {
    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        name: p.name,
        sku: p.sku,
        price: p.price,
        cost: p.cost,
        categoryId: categories[p.categoryIndex].id,
      },
    });

    await prisma.inventory.upsert({
      where: { productId: product.id },
      update: {},
      create: {
        productId: product.id,
        quantity: p.stock,
        minQuantity: 5,
        movements: {
          create: {
            type: MovementType.IN,
            quantity: p.stock,
            note: '初始庫存',
          },
        },
      },
    });
  }
  console.log('已建立', sampleProducts.length, '個示範商品');

  console.log('種子資料建立完成！');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
