import { useState, useEffect } from 'react';
import { Modal, Result, Button, Typography, Tag } from 'antd';
import { LockOutlined, TeamOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import type { UserRole } from '../types';

const { Text } = Typography;

// 角色等級（數字越大權限越高）
const ROLE_LEVEL: Record<UserRole, number> = {
  CASHIER: 1,
  MANAGER: 2,
  ADMIN:   3,
};

const ROLE_LABEL: Record<UserRole, string> = {
  CASHIER: '收銀員',
  MANAGER: '經理',
  ADMIN:   '系統管理員',
};

const ROLE_COLOR: Record<UserRole, string> = {
  CASHIER: 'blue',
  MANAGER: 'orange',
  ADMIN:   'red',
};

// 找到比目前角色高一層、且能使用此功能的最近角色
function getNearestRole(currentRole: UserRole, requiredRole: UserRole): UserRole {
  const currentLevel = ROLE_LEVEL[currentRole];
  const roles = Object.entries(ROLE_LEVEL) as [UserRole, number][];

  // 找所有比 current 高、且 >= required 的角色，取最低的那個
  const candidates = roles
    .filter(([, level]) => level > currentLevel && level >= ROLE_LEVEL[requiredRole])
    .sort((a, b) => a[1] - b[1]);

  return candidates[0]?.[0] ?? requiredRole;
}

interface Props {
  requiredRole: UserRole;
  children: React.ReactNode;
}

export default function PermissionGuard({ requiredRole, children }: Props) {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [showDialog, setShowDialog] = useState(false);

  const userRole = user?.role as UserRole | undefined;
  const hasPermission = userRole && ROLE_LEVEL[userRole] >= ROLE_LEVEL[requiredRole];

  useEffect(() => {
    if (!hasPermission) {
      setShowDialog(true);
    }
  }, [hasPermission]);

  if (hasPermission) {
    return <>{children}</>;
  }

  const nearestRole = userRole ? getNearestRole(userRole, requiredRole) : requiredRole;

  return (
    <>
      {/* 顯示模糊底層頁面 */}
      <div style={{ filter: 'blur(4px)', pointerEvents: 'none', userSelect: 'none', opacity: 0.4 }}>
        {children}
      </div>

      <Modal
        open={showDialog}
        footer={null}
        closable={false}
        centered
        width={400}
        maskClosable={false}
      >
        <Result
          icon={<LockOutlined style={{ color: '#faad14' }} />}
          title="權限不足"
          subTitle={
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <Text type="secondary">此功能需要</Text>
              {' '}
              <Tag color={ROLE_COLOR[requiredRole]}>{ROLE_LABEL[requiredRole]}</Tag>
              {' '}
              <Text type="secondary">以上的權限</Text>
              <br /><br />
              <div style={{ background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 8, padding: '12px 16px' }}>
                <TeamOutlined style={{ color: '#faad14', marginRight: 6 }} />
                <Text>請聯繫最近可協助您的</Text>
                {' '}
                <Tag color={ROLE_COLOR[nearestRole]} style={{ fontSize: 14 }}>
                  {ROLE_LABEL[nearestRole]}
                </Tag>
                <Text>進行操作</Text>
              </div>
            </div>
          }
          extra={
            <Button
              type="primary"
              onClick={() => { setShowDialog(false); navigate(-1); }}
            >
              返回上一頁
            </Button>
          }
        />
      </Modal>
    </>
  );
}
