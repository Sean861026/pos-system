import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, InputNumber, Input, Space, Tag, Card, Row, Col, Typography, Alert, Drawer } from 'antd';
import { EditOutlined, HistoryOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { InventoryMovement } from '../types';
import { inventoryApi } from '../api';

const { Title, Text } = Typography;

interface InventoryRow {
  id: string;
  quantity: number;
  minQuantity: number;
  isLowStock: boolean;
  product: {
    id: string;
    name: string;
    sku: string;
    category: { name: string; color: string };
  };
}

const MOVEMENT_TYPE_MAP: Record<string, { label: string; color: string }> = {
  IN: { label: '進貨', color: 'green' },
  OUT: { label: '出貨', color: 'red' },
  ADJUSTMENT: { label: '調整', color: 'blue' },
  RETURN: { label: '退貨', color: 'orange' },
};

export default function InventoryPage() {
  const [inventories, setInventories] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [adjustModal, setAdjustModal] = useState<{ open: boolean; productId: string; name: string }>({ open: false, productId: '', name: '' });
  const [historyDrawer, setHistoryDrawer] = useState<{ open: boolean; productId: string; name: string }>({ open: false, productId: '', name: '' });
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [form] = Form.useForm();

  const loadInventory = async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.getAll();
      setInventories(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadInventory(); }, []);

  const openHistory = async (productId: string, name: string) => {
    setHistoryDrawer({ open: true, productId, name });
    const res = await inventoryApi.getMovements(productId);
    setMovements(res.data);
  };

  const handleAdjust = async (values: { quantity: number; note?: string }) => {
    await inventoryApi.adjust(adjustModal.productId, values.quantity, values.note);
    setAdjustModal({ open: false, productId: '', name: '' });
    form.resetFields();
    loadInventory();
  };

  const lowStockCount = inventories.filter((i) => i.isLowStock).length;

  const columns = [
    { title: 'SKU', dataIndex: ['product', 'sku'], key: 'sku', width: 100 },
    { title: '商品名稱', dataIndex: ['product', 'name'], key: 'name' },
    {
      title: '分類',
      key: 'category',
      render: (_: unknown, record: InventoryRow) => (
        <Tag color={record.product.category.color}>{record.product.category.name}</Tag>
      ),
    },
    {
      title: '庫存數量',
      key: 'quantity',
      render: (_: unknown, record: InventoryRow) => (
        <Space>
          <Text strong style={{ fontSize: 16 }}>{record.quantity}</Text>
          {record.isLowStock && <Tag color="red">低庫存</Tag>}
        </Space>
      ),
    },
    {
      title: '警戒線',
      dataIndex: 'minQuantity',
      key: 'minQuantity',
      render: (v: number) => `≤ ${v}`,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: InventoryRow) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => setAdjustModal({ open: true, productId: record.product.id, name: record.product.name })}
          >
            調整
          </Button>
          <Button
            icon={<HistoryOutlined />}
            size="small"
            onClick={() => openHistory(record.product.id, record.product.name)}
          >
            記錄
          </Button>
        </Space>
      ),
    },
  ];

  const movementColumns = [
    {
      title: '類型',
      dataIndex: 'type',
      key: 'type',
      render: (v: string) => (
        <Tag color={MOVEMENT_TYPE_MAP[v]?.color}>{MOVEMENT_TYPE_MAP[v]?.label || v}</Tag>
      ),
    },
    {
      title: '數量',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (v: number, record: InventoryMovement) => (
        <Text style={{ color: record.type === 'OUT' ? '#f5222d' : '#52c41a' }}>
          {record.type === 'OUT' ? '-' : '+'}{v}
        </Text>
      ),
    },
    { title: '備註', dataIndex: 'note', key: 'note' },
    {
      title: '時間',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v: string) => dayjs(v).format('YYYY/MM/DD HH:mm'),
    },
  ];

  return (
    <div>
      {lowStockCount > 0 && (
        <Alert
          message={`有 ${lowStockCount} 個商品庫存不足，請注意補貨！`}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Card>
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col><Title level={4} style={{ margin: 0 }}>庫存管理</Title></Col>
        </Row>

        <Table
          dataSource={inventories}
          columns={columns}
          rowKey="id"
          loading={loading}
          rowClassName={(record) => record.isLowStock ? 'ant-table-row-low-stock' : ''}
          pagination={{ pageSize: 15 }}
        />
      </Card>

      {/* 庫存調整 Modal */}
      <Modal
        title={`調整庫存：${adjustModal.name}`}
        open={adjustModal.open}
        onCancel={() => { setAdjustModal({ open: false, productId: '', name: '' }); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="確認調整"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" onFinish={handleAdjust}>
          <Form.Item
            name="quantity"
            label="調整數量（正數增加，負數減少）"
            rules={[{ required: true, message: '請輸入調整數量' }]}
          >
            <InputNumber style={{ width: '100%' }} placeholder="例：+10 或 -5" />
          </Form.Item>
          <Form.Item name="note" label="備註">
            <Input placeholder="調整原因" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 庫存異動記錄 Drawer */}
      <Drawer
        title={`庫存記錄：${historyDrawer.name}`}
        open={historyDrawer.open}
        onClose={() => setHistoryDrawer({ open: false, productId: '', name: '' })}
        width={500}
      >
        <Table
          dataSource={movements}
          columns={movementColumns}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Drawer>
    </div>
  );
}
