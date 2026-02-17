import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, Space, Tag, Popconfirm, message, Card, Row, Col, Typography } from 'antd';
import { PlusOutlined, EditOutlined, StopOutlined, UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { User, UserRole } from '../types';
import { userApi } from '../api';
import { useAuthStore } from '../store/authStore';

const { Title } = Typography;

const ROLE_CONFIG: Record<UserRole, { label: string; color: string }> = {
  ADMIN:   { label: '系統管理員', color: 'red' },
  MANAGER: { label: '經理',       color: 'orange' },
  CASHIER: { label: '收銀員',     color: 'blue' },
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm();
  const currentUser = useAuthStore((s) => s.user);

  const load = async () => {
    setLoading(true);
    try {
      const res = await userApi.getAll();
      setUsers(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openModal = (user?: User) => {
    setEditingUser(user || null);
    form.setFieldsValue(user
      ? { name: user.name, email: user.email, role: user.role, isActive: user.isActive }
      : { role: 'CASHIER', isActive: true }
    );
    setModalOpen(true);
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      if (editingUser) {
        // 編輯時若密碼為空則不送
        if (!values.password) delete values.password;
        await userApi.update(editingUser.id, values);
        message.success('使用者已更新');
      } else {
        await userApi.create(values as Parameters<typeof userApi.create>[0]);
        message.success('使用者已新增');
      }
      setModalOpen(false);
      form.resetFields();
      load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      message.error(e.response?.data?.message || '操作失敗');
    }
  };

  const handleDisable = async (id: string) => {
    await userApi.delete(id);
    message.success('使用者已停用');
    load();
  };

  const columns = [
    {
      title: '使用者',
      key: 'user',
      render: (_: unknown, u: User) => (
        <Space>
          <UserOutlined style={{ fontSize: 20, color: '#1890ff' }} />
          <span>
            <div style={{ fontWeight: 600 }}>{u.name}</div>
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>{u.email}</div>
          </span>
        </Space>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (r: UserRole) => <Tag color={ROLE_CONFIG[r]?.color}>{ROLE_CONFIG[r]?.label}</Tag>,
    },
    {
      title: '狀態',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? '啟用' : '停用'}</Tag>,
    },
    {
      title: '建立時間',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v: string) => dayjs(v).format('YYYY/MM/DD'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, u: User) => {
        const isSelf = u.id === currentUser?.id;
        return (
          <Space>
            <Button icon={<EditOutlined />} size="small" onClick={() => openModal(u)}>編輯</Button>
            <Popconfirm
              title="確定停用此帳號？"
              onConfirm={() => handleDisable(u.id)}
              okText="確定"
              cancelText="取消"
              disabled={isSelf}
            >
              <Button icon={<StopOutlined />} size="small" danger disabled={isSelf}>停用</Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <Card>
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col><Title level={4} style={{ margin: 0 }}>使用者管理</Title></Col>
          <Col>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
              新增帳號
            </Button>
          </Col>
        </Row>

        <Table
          dataSource={users}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 15 }}
        />
      </Card>

      <Modal
        title={editingUser ? '編輯帳號' : '新增帳號'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="儲存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
            <Input placeholder="員工姓名" />
          </Form.Item>
          <Form.Item name="email" label="電子郵件" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="email@example.com" />
          </Form.Item>
          <Form.Item
            name="password"
            label={editingUser ? '新密碼（留空表示不修改）' : '密碼'}
            rules={editingUser ? [] : [{ required: true, min: 6, message: '密碼至少 6 個字元' }]}
          >
            <Input.Password placeholder={editingUser ? '留空不修改' : '至少 6 個字元'} />
          </Form.Item>
          <Form.Item name="role" label="角色" rules={[{ required: true }]}>
            <Select
              options={Object.entries(ROLE_CONFIG).map(([v, c]) => ({ value: v, label: c.label }))}
            />
          </Form.Item>
          {editingUser && (
            <Form.Item name="isActive" label="帳號狀態">
              <Select options={[{ value: true, label: '啟用' }, { value: false, label: '停用' }]} />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
