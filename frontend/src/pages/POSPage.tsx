import { useState, useEffect } from 'react';
import { Row, Col, Input, Tabs, Card, Button, Typography, Divider, InputNumber, Select, Modal, message, Empty, Tag, Badge, Space } from 'antd';
import { SearchOutlined, ShoppingCartOutlined, DeleteOutlined, CheckCircleOutlined, PrinterOutlined } from '@ant-design/icons';
import type { Product, Category, PaymentMethod, Order } from '../types';
import { productApi, categoryApi, orderApi } from '../api';
import { useCartStore } from '../store/cartStore';
import ReceiptModal from '../components/Receipt/ReceiptModal';

const { Text, Title } = Typography;

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'CASH', label: '現金' },
  { value: 'CREDIT_CARD', label: '信用卡' },
  { value: 'DEBIT_CARD', label: '金融卡' },
  { value: 'LINE_PAY', label: 'LINE Pay' },
  { value: 'OTHER', label: '其他' },
];

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [successModal, setSuccessModal] = useState<{ visible: boolean; orderNumber: string; total: number }>({ visible: false, orderNumber: '', total: 0 });
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);

  const { items, addItem, removeItem, updateQuantity, setDiscount, discount, clearCart, subtotal, total } = useCartStore();

  useEffect(() => {
    Promise.all([productApi.getAll(), categoryApi.getAll()]).then(([prodRes, catRes]) => {
      setProducts(prodRes.data);
      setCategories(catRes.data);
    });
  }, []);

  const filteredProducts = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode?.includes(search) ?? false);
    const matchCategory = activeCategory === 'all' || p.categoryId === activeCategory;
    return matchSearch && matchCategory;
  });

  const handleCheckout = async () => {
    if (items.length === 0) {
      message.warning('購物車是空的');
      return;
    }
    setCheckoutLoading(true);
    try {
      const res = await orderApi.checkout(items, paymentMethod, discount);
      const order = res.data;
      setSuccessModal({ visible: true, orderNumber: order.orderNumber, total: order.total });
      setReceiptOrder(order);
      clearCart();
      // 重新載入商品以更新庫存
      const prodRes = await productApi.getAll();
      setProducts(prodRes.data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || '結帳失敗，請重試');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const categoryTabs = [
    { key: 'all', label: '全部' },
    ...categories.map((c) => ({ key: c.id, label: c.name })),
  ];

  return (
    <Row gutter={16} style={{ height: 'calc(100vh - 100px)' }}>
      {/* 左側：商品選擇區 */}
      <Col span={15} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="搜尋商品名稱、SKU 或條碼..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="large"
          style={{ marginBottom: 12 }}
          allowClear
        />

        <Tabs
          items={categoryTabs}
          activeKey={activeCategory}
          onChange={setActiveCategory}
          style={{ marginBottom: 8 }}
        />

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredProducts.length === 0 ? (
            <Empty description="沒有符合的商品" />
          ) : (
            <Row gutter={[8, 8]}>
              {filteredProducts.map((product) => {
                const stock = product.inventory?.quantity ?? 0;
                const isOutOfStock = stock === 0;
                return (
                  <Col span={6} key={product.id}>
                    <Card
                      className={`pos-product-card ${isOutOfStock ? 'out-of-stock' : ''}`}
                      size="small"
                      onClick={() => !isOutOfStock && addItem(product)}
                      style={{ textAlign: 'center', borderRadius: 8 }}
                      styles={{ body: { padding: 12 } }}
                    >
                      <div style={{ fontSize: 28, marginBottom: 4 }}>🛍️</div>
                      <Text strong style={{ fontSize: 13, display: 'block' }}>{product.name}</Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>{product.sku}</Text>
                      <Divider style={{ margin: '6px 0' }} />
                      <Text style={{ color: '#1890ff', fontSize: 16, fontWeight: 'bold' }}>
                        ${product.price}
                      </Text>
                      <div>
                        <Tag color={isOutOfStock ? 'red' : stock <= (product.inventory?.minQuantity ?? 5) ? 'orange' : 'green'} style={{ fontSize: 10, marginTop: 2 }}>
                          庫存 {stock}
                        </Tag>
                      </div>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )}
        </div>
      </Col>

      {/* 右側：購物車 */}
      <Col span={9} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Card
          title={
            <span>
              <ShoppingCartOutlined /> 購物車
              <Badge count={items.length} style={{ marginLeft: 8 }} />
            </span>
          }
          extra={items.length > 0 && <Button size="small" danger onClick={clearCart}>清空</Button>}
          style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          styles={{ body: { flex: 1, overflowY: 'auto', padding: '8px 12px' } }}
        >
          {items.length === 0 ? (
            <Empty description="尚未加入商品" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            items.map((item) => (
              <div key={item.product.id} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Text strong style={{ fontSize: 13, flex: 1 }}>{item.product.name}</Text>
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => removeItem(item.product.id)}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <InputNumber
                    min={1}
                    max={item.product.inventory?.quantity}
                    value={item.quantity}
                    onChange={(val) => updateQuantity(item.product.id, val || 1)}
                    size="small"
                    style={{ width: 80 }}
                  />
                  <Text style={{ color: '#1890ff', fontWeight: 'bold' }}>
                    ${(item.product.price * item.quantity).toFixed(0)}
                  </Text>
                </div>
              </div>
            ))
          )}
        </Card>

        {/* 結帳區 */}
        <Card style={{ marginTop: 8 }} styles={{ body: { padding: '12px 16px' } }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text>小計</Text>
            <Text>${subtotal().toFixed(0)}</Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text>折扣</Text>
            <InputNumber
              prefix="$"
              min={0}
              max={subtotal()}
              value={discount}
              onChange={(val) => setDiscount(val || 0)}
              size="small"
              style={{ width: 100 }}
            />
          </div>
          <Divider style={{ margin: '8px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <Title level={4} style={{ margin: 0 }}>合計</Title>
            <Title level={4} style={{ margin: 0, color: '#1890ff' }}>${total().toFixed(0)}</Title>
          </div>

          <Select
            value={paymentMethod}
            onChange={setPaymentMethod}
            style={{ width: '100%', marginBottom: 8 }}
            options={PAYMENT_OPTIONS}
            placeholder="選擇付款方式"
          />

          <Button
            type="primary"
            size="large"
            block
            icon={<CheckCircleOutlined />}
            onClick={handleCheckout}
            loading={checkoutLoading}
            disabled={items.length === 0}
          >
            確認結帳
          </Button>
        </Card>
      </Col>

      {/* 結帳成功彈窗 */}
      <Modal
        open={successModal.visible}
        footer={null}
        onCancel={() => setSuccessModal({ ...successModal, visible: false })}
        centered
        width={360}
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a' }} />
          <Title level={3} style={{ marginTop: 16 }}>結帳成功！</Title>
          <Text type="secondary">訂單編號：{successModal.orderNumber}</Text>
          <div style={{ marginTop: 8 }}>
            <Title level={2} style={{ color: '#1890ff' }}>${successModal.total}</Title>
          </div>
          <Space style={{ marginTop: 8 }}>
            <Button size="large" icon={<PrinterOutlined />} onClick={() => setSuccessModal({ ...successModal, visible: false })}>
              列印收據
            </Button>
            <Button type="primary" size="large" onClick={() => { setSuccessModal({ ...successModal, visible: false }); setReceiptOrder(null); }}>
              繼續銷售
            </Button>
          </Space>
        </div>
      </Modal>

      <ReceiptModal
        order={receiptOrder}
        open={!!receiptOrder && !successModal.visible}
        onClose={() => setReceiptOrder(null)}
      />
    </Row>
  );
}
