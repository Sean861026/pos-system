import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Badge, Typography, Space } from 'antd';
import {
  ShoppingCartOutlined,
  AppstoreOutlined,
  InboxOutlined,
  BarChartOutlined,
  UserOutlined,
  LogoutOutlined,
  WarningOutlined,
  FileTextOutlined,
  TagsOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const menuItems = [
    { key: '/pos',        icon: <ShoppingCartOutlined />, label: 'POS 收銀' },
    { key: '/orders',     icon: <FileTextOutlined />,     label: '訂單管理' },
    { key: '/products',   icon: <AppstoreOutlined />,     label: '商品管理' },
    { key: '/categories', icon: <TagsOutlined />,         label: '分類管理' },
    { key: '/inventory',  icon: <InboxOutlined />,        label: '庫存管理' },
    { key: '/reports',    icon: <BarChartOutlined />,     label: '報表統計' },
    ...(user?.role === 'ADMIN'
      ? [{ key: '/users', icon: <TeamOutlined />, label: '使用者管理' }]
      : []),
  ];

  const userMenu = {
    items: [
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: '登出',
        onClick: () => { logout(); navigate('/login'); },
      },
    ],
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={200} theme="dark" breakpoint="lg" collapsedWidth={80}>
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
            POS 系統
          </Text>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>

      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,21,41,0.08)' }}>
          <Space>
            <Badge count={0} dot>
              <WarningOutlined style={{ fontSize: 18, color: '#faad14' }} />
            </Badge>
            <Text type="secondary" style={{ fontSize: 12 }}>低庫存警示</Text>
          </Space>

          <Dropdown menu={userMenu} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
              <Text>{user?.name}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>({user?.role})</Text>
            </Space>
          </Dropdown>
        </Header>

        <Content style={{ margin: '16px', overflow: 'auto' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
