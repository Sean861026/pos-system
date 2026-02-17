import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Space, Tag, Popconfirm, message, Card, Row, Col, Typography, ColorPicker } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, AppstoreOutlined } from '@ant-design/icons';
import type { Category } from '../types';
import { categoryApi } from '../api';

const { Title, Text } = Typography;

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const res = await categoryApi.getAll();
      setCategories(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openModal = (cat?: Category) => {
    setEditingCat(cat || null);
    form.setFieldsValue(cat
      ? { name: cat.name, color: cat.color, sortOrder: cat.sortOrder }
      : { color: '#1890ff', sortOrder: categories.length + 1 }
    );
    setModalOpen(true);
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    // ColorPicker 回傳的是物件，需轉成 hex string
    if (values.color && typeof values.color === 'object') {
      const c = values.color as { toHexString?: () => string };
      values.color = c.toHexString ? c.toHexString() : '#1890ff';
    }
    try {
      if (editingCat) {
        await categoryApi.update(editingCat.id, values as Parameters<typeof categoryApi.update>[1]);
        message.success('分類已更新');
      } else {
        await categoryApi.create(values as Parameters<typeof categoryApi.create>[0]);
        message.success('分類已新增');
      }
      setModalOpen(false);
      form.resetFields();
      load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      message.error(e.response?.data?.message || '操作失敗');
    }
  };

  const handleDelete = async (id: string) => {
    await categoryApi.delete(id);
    message.success('分類已停用');
    load();
  };

  const columns = [
    {
      title: '排序',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 70,
      sorter: (a: Category, b: Category) => a.sortOrder - b.sortOrder,
    },
    {
      title: '分類名稱',
      key: 'name',
      render: (_: unknown, cat: Category) => (
        <Space>
          <div style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: cat.color }} />
          <Text strong>{cat.name}</Text>
        </Space>
      ),
    },
    {
      title: '顏色',
      dataIndex: 'color',
      key: 'color',
      render: (c: string) => <Tag color={c}>{c}</Tag>,
    },
    {
      title: '商品數',
      key: 'count',
      render: (_: unknown, cat: Category) => (
        <Tag icon={<AppstoreOutlined />}>{cat._count?.products ?? 0} 件</Tag>
      ),
    },
    {
      title: '狀態',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? '啟用' : '停用'}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, cat: Category) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => openModal(cat)}>編輯</Button>
          <Popconfirm
            title="確定停用此分類？相關商品不受影響。"
            onConfirm={() => handleDelete(cat.id)}
            okText="確定"
            cancelText="取消"
          >
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
          <Col><Title level={4} style={{ margin: 0 }}>分類管理</Title></Col>
          <Col>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
              新增分類
            </Button>
          </Col>
        </Row>

        <Table
          dataSource={categories}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </Card>

      <Modal
        title={editingCat ? '編輯分類' : '新增分類'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="儲存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="分類名稱" rules={[{ required: true }]}>
            <Input placeholder="例：飲料、食品、日用品" />
          </Form.Item>
          <Form.Item name="color" label="顯示顏色">
            <ColorPicker format="hex" />
          </Form.Item>
          <Form.Item name="sortOrder" label="排列順序">
            <Input type="number" min={0} placeholder="數字越小越靠前" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
