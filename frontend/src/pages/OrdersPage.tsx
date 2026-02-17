import { useState, useEffect, useCallback } from 'react';
import { Table, Tag, Button, Space, Card, Row, Col, Typography, DatePicker, Select, Popconfirm, message, Statistic, Drawer } from 'antd';
import { FileTextOutlined, RollbackOutlined, PrinterOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Order, OrderStatus } from '../types';
import { orderApi } from '../api';
import ReceiptModal from '../components/Receipt/ReceiptModal';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string }> = {
  PENDING:   { label: '待處理', color: 'default' },
  COMPLETED: { label: '完成',   color: 'green' },
  REFUNDED:  { label: '已退款', color: 'orange' },
  CANCELLED: { label: '已取消', color: 'red' },
};

const PAYMENT_LABELS: Record<string, string> = {
  CASH: '現金', CREDIT_CARD: '信用卡', DEBIT_CARD: '金融卡', LINE_PAY: 'LINE Pay', OTHER: '其他',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [detailDrawer, setDetailDrawer] = useState<{ open: boolean; order: Order | null }>({ open: false, order: null });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await orderApi.getAll({
        page,
        limit: 15,
        status: statusFilter || undefined,
        startDate: dateRange?.[0],
        endDate: dateRange?.[1],
      });
      setOrders(res.data.orders);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, dateRange]);

  useEffect(() => { load(); }, [load]);

  const handleRefund = async (id: string) => {
    try {
      await orderApi.refund(id);
      message.success('退款成功，庫存已還原');
      load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      message.error(e.response?.data?.message || '退款失敗');
    }
  };

  const completedOrders = orders.filter((o) => o.status === 'COMPLETED').length;
  const totalRevenue = orders
    .filter((o) => o.status === 'COMPLETED')
    .reduce((sum, o) => sum + Number(o.total), 0);

  const columns = [
    { title: '訂單編號', dataIndex: 'orderNumber', key: 'orderNumber', width: 180 },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (s: OrderStatus) => <Tag color={STATUS_CONFIG[s]?.color}>{STATUS_CONFIG[s]?.label}</Tag>,
    },
    {
      title: '付款方式',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      width: 100,
      render: (v: string) => PAYMENT_LABELS[v] || v,
    },
    {
      title: '商品',
      key: 'items',
      render: (_: unknown, o: Order) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {o.items?.map((i) => `${i.product?.name} x${i.quantity}`).join('、') || '-'}
        </Text>
      ),
    },
    {
      title: '合計',
      dataIndex: 'total',
      key: 'total',
      width: 90,
      render: (v: number) => <Text strong style={{ color: '#1890ff' }}>${Number(v).toFixed(0)}</Text>,
    },
    { title: '收銀員', key: 'cashier', width: 90, render: (_: unknown, o: Order) => o.cashier?.name },
    {
      title: '時間',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      render: (v: string) => dayjs(v).format('MM/DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_: unknown, o: Order) => (
        <Space size="small">
          <Button
            icon={<FileTextOutlined />}
            size="small"
            onClick={() => setDetailDrawer({ open: true, order: o })}
          >
            詳情
          </Button>
          <Button
            icon={<PrinterOutlined />}
            size="small"
            onClick={() => setReceiptOrder(o)}
          >
            收據
          </Button>
          {o.status === 'COMPLETED' && (
            <Popconfirm
              title="確定退款？庫存將自動還原。"
              onConfirm={() => handleRefund(o.id)}
              okText="確定退款"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button icon={<RollbackOutlined />} size="small" danger>退款</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* 本頁統計 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="本頁訂單數" value={total} suffix="筆" />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="本頁完成筆數" value={completedOrders} suffix="筆" valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="本頁營業額" value={totalRevenue} prefix="$" precision={0} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
      </Row>

      <Card>
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }} gutter={[8, 8]}>
          <Col><Title level={4} style={{ margin: 0 }}>訂單管理</Title></Col>
          <Col>
            <Space wrap>
              <RangePicker
                onChange={(_, s) => { setDateRange(s[0] && s[1] ? [s[0], s[1]] : null); setPage(1); }}
                placeholder={['開始日期', '結束日期']}
              />
              <Select
                allowClear
                placeholder="篩選狀態"
                style={{ width: 120 }}
                onChange={(v) => { setStatusFilter(v || ''); setPage(1); }}
                options={Object.entries(STATUS_CONFIG).map(([v, c]) => ({ value: v, label: c.label }))}
              />
            </Space>
          </Col>
        </Row>

        <Table
          dataSource={orders}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: 15,
            total,
            onChange: setPage,
            showTotal: (t) => `共 ${t} 筆`,
          }}
        />
      </Card>

      {/* 訂單詳情 Drawer */}
      <Drawer
        title={`訂單詳情：${detailDrawer.order?.orderNumber}`}
        open={detailDrawer.open}
        onClose={() => setDetailDrawer({ open: false, order: null })}
        width={480}
        extra={
          <Button icon={<PrinterOutlined />} onClick={() => setReceiptOrder(detailDrawer.order)}>
            列印收據
          </Button>
        }
      >
        {detailDrawer.order && (
          <>
            <Row gutter={[0, 8]} style={{ marginBottom: 16 }}>
              {[
                ['訂單狀態', <Tag color={STATUS_CONFIG[detailDrawer.order.status]?.color}>{STATUS_CONFIG[detailDrawer.order.status]?.label}</Tag>],
                ['付款方式', PAYMENT_LABELS[detailDrawer.order.paymentMethod]],
                ['收銀員', detailDrawer.order.cashier?.name],
                ['日期時間', dayjs(detailDrawer.order.createdAt).format('YYYY/MM/DD HH:mm:ss')],
              ].map(([label, value]) => (
                <Col span={24} key={String(label)}>
                  <Space>
                    <Text type="secondary">{label}：</Text>
                    <Text>{value as React.ReactNode}</Text>
                  </Space>
                </Col>
              ))}
            </Row>
            <Table
              dataSource={detailDrawer.order.items}
              rowKey="id"
              pagination={false}
              size="small"
              columns={[
                { title: '商品', render: (_: unknown, i) => i.product?.name },
                { title: '單價', dataIndex: 'unitPrice', render: (v: number) => `$${Number(v).toFixed(0)}` },
                { title: '數量', dataIndex: 'quantity' },
                { title: '小計', dataIndex: 'subtotal', render: (v: number) => `$${Number(v).toFixed(0)}` },
              ]}
            />
            <div style={{ marginTop: 12, textAlign: 'right' }}>
              {Number(detailDrawer.order.discountAmount) > 0 && (
                <div><Text type="danger">折扣：-${Number(detailDrawer.order.discountAmount).toFixed(0)}</Text></div>
              )}
              <Title level={4}>合計：${Number(detailDrawer.order.total).toFixed(0)}</Title>
            </div>
          </>
        )}
      </Drawer>

      {/* 電子收據 Modal */}
      <ReceiptModal
        order={receiptOrder}
        open={!!receiptOrder}
        onClose={() => setReceiptOrder(null)}
      />
    </div>
  );
}
