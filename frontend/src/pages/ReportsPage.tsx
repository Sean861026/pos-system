import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Select, Typography, Spin } from 'antd';
import { ShoppingCartOutlined, DollarOutlined, RiseOutlined } from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { reportApi } from '../api';
import type { DailySalesData, TopProduct } from '../types';

const { Title } = Typography;

const COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1'];

const PAYMENT_LABELS: Record<string, string> = {
  CASH: '現金',
  CREDIT_CARD: '信用卡',
  DEBIT_CARD: '金融卡',
  LINE_PAY: 'LINE Pay',
  OTHER: '其他',
};

interface Summary {
  today: { revenue: number; orders: number };
  month: { revenue: number; orders: number };
  total: { orders: number };
}

interface PaymentStat {
  paymentMethod: string;
  _sum: { total: number };
  _count: number;
}

export default function ReportsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [dailySales, setDailySales] = useState<DailySalesData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [paymentStats, setPaymentStats] = useState<PaymentStat[]>([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [summaryRes, dailyRes, topRes, paymentRes] = await Promise.all([
        reportApi.getSummary(),
        reportApi.getDailySales(days),
        reportApi.getTopProducts({ limit: 10 }),
        reportApi.getPaymentMethods(),
      ]);
      setSummary(summaryRes.data);
      setDailySales(dailyRes.data);
      setTopProducts(topRes.data);
      setPaymentStats(paymentRes.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [days]);

  const topProductColumns = [
    { title: '排名', key: 'rank', render: (_: unknown, __: unknown, index: number) => index + 1, width: 60 },
    { title: '商品名稱', key: 'name', render: (_: unknown, record: TopProduct) => record.product?.name || '-' },
    { title: 'SKU', key: 'sku', render: (_: unknown, record: TopProduct) => record.product?.sku || '-' },
    {
      title: '銷售量',
      dataIndex: 'totalQuantity',
      key: 'totalQuantity',
      render: (v: number) => <Tag color="blue">{v} 件</Tag>,
    },
    {
      title: '銷售額',
      dataIndex: 'totalRevenue',
      key: 'totalRevenue',
      render: (v: number) => `$${Number(v).toFixed(0)}`,
    },
  ];

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;
  }

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>報表統計</Title>

      {/* 概況卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="今日營業額"
              value={summary?.today.revenue || 0}
              prefix={<DollarOutlined />}
              suffix="元"
              precision={0}
              valueStyle={{ color: '#1890ff' }}
            />
            <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
              {summary?.today.orders || 0} 筆訂單
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="本月營業額"
              value={summary?.month.revenue || 0}
              prefix={<RiseOutlined />}
              suffix="元"
              precision={0}
              valueStyle={{ color: '#52c41a' }}
            />
            <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
              {summary?.month.orders || 0} 筆訂單
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="今日客單價"
              value={summary?.today.orders ? Math.round((summary.today.revenue || 0) / summary.today.orders) : 0}
              prefix="$"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="累計訂單數"
              value={summary?.total.orders || 0}
              prefix={<ShoppingCartOutlined />}
              suffix="筆"
            />
          </Card>
        </Col>
      </Row>

      {/* 銷售趨勢圖 */}
      <Card
        title="銷售趨勢"
        extra={
          <Select
            value={days}
            onChange={setDays}
            options={[
              { value: 7, label: '近 7 天' },
              { value: 30, label: '近 30 天' },
              { value: 90, label: '近 90 天' },
            ]}
            style={{ width: 110 }}
          />
        }
        style={{ marginBottom: 16 }}
      >
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={dailySales}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value: number) => [`$${value}`, '營業額']} />
            <Line type="monotone" dataKey="revenue" stroke="#1890ff" strokeWidth={2} dot={false} name="營業額" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Row gutter={16}>
        {/* 熱銷商品 */}
        <Col span={14}>
          <Card title="熱銷商品 Top 10">
            <Table
              dataSource={topProducts}
              columns={topProductColumns}
              rowKey={(_, index) => String(index)}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>

        {/* 付款方式圓餅圖 */}
        <Col span={10}>
          <Card title="付款方式分佈">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={paymentStats.map((p) => ({
                    name: PAYMENT_LABELS[p.paymentMethod] || p.paymentMethod,
                    value: p._count,
                  }))}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {paymentStats.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
