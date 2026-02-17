import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Select, Space, Tag, Popconfirm, message, Card, Row, Col, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { Product, Category } from '../types';
import { productApi, categoryApi } from '../api';

const { Title } = Typography;

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form] = Form.useForm();

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([productApi.getAll(), categoryApi.getAll()]);
      setProducts(prodRes.data);
      setCategories(catRes.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const openModal = (product?: Product) => {
    setEditingProduct(product || null);
    form.setFieldsValue(product ? {
      ...product,
      price: Number(product.price),
      cost: Number(product.cost),
    } : { isActive: true, cost: 0 });
    setModalOpen(true);
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      if (editingProduct) {
        await productApi.update(editingProduct.id, values);
        message.success('商品已更新');
      } else {
        await productApi.create(values as Parameters<typeof productApi.create>[0]);
        message.success('商品已新增');
      }
      setModalOpen(false);
      form.resetFields();
      loadData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || '操作失敗');
    }
  };

  const handleDelete = async (id: string) => {
    await productApi.delete(id);
    message.success('商品已停用');
    loadData();
  };

  const columns = [
    { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 100 },
    { title: '商品名稱', dataIndex: 'name', key: 'name' },
    {
      title: '分類',
      key: 'category',
      render: (_: unknown, record: Product) => (
        <Tag color={record.category.color}>{record.category.name}</Tag>
      ),
    },
    {
      title: '售價',
      dataIndex: 'price',
      key: 'price',
      render: (v: number) => `$${Number(v).toFixed(0)}`,
    },
    {
      title: '庫存',
      key: 'stock',
      render: (_: unknown, record: Product) => {
        const qty = record.inventory?.quantity ?? 0;
        const min = record.inventory?.minQuantity ?? 5;
        return <Tag color={qty === 0 ? 'red' : qty <= min ? 'orange' : 'green'}>{qty}</Tag>;
      },
    },
    {
      title: '狀態',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? '上架' : '下架'}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: Product) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => openModal(record)}>編輯</Button>
          <Popconfirm title="確定停用此商品？" onConfirm={() => handleDelete(record.id)} okText="確定" cancelText="取消">
            <Button icon={<DeleteOutlined />} size="small" danger>停用</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col><Title level={4} style={{ margin: 0 }}>商品管理</Title></Col>
          <Col>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
              新增商品
            </Button>
          </Col>
        </Row>

        <Table
          dataSource={products}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 15 }}
        />
      </Card>

      <Modal
        title={editingProduct ? '編輯商品' : '新增商品'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="儲存"
        cancelText="取消"
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="商品名稱" rules={[{ required: true }]}>
                <Input placeholder="例：礦泉水 600ml" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="sku" label="SKU" rules={[{ required: true }]}>
                <Input placeholder="例：DRK001" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="price" label="售價" rules={[{ required: true }]}>
                <InputNumber prefix="$" min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="cost" label="成本">
                <InputNumber prefix="$" min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="categoryId" label="商品分類" rules={[{ required: true }]}>
                <Select
                  placeholder="選擇分類"
                  options={categories.map((c) => ({ value: c.id, label: c.name }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="barcode" label="條碼">
                <Input placeholder="EAN-13 條碼" />
              </Form.Item>
            </Col>
          </Row>
          {!editingProduct && (
            <Form.Item name="initialStock" label="初始庫存">
              <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
            </Form.Item>
          )}
          <Form.Item name="description" label="商品描述">
            <Input.TextArea rows={2} />
          </Form.Item>
          {editingProduct && (
            <Form.Item name="isActive" label="狀態">
              <Select options={[{ value: true, label: '上架' }, { value: false, label: '下架' }]} />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
