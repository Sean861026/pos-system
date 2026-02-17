import { Modal, Button, Divider, Typography, Space, Table } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Order } from '../../types';

const { Title, Text } = Typography;

const PAYMENT_LABELS: Record<string, string> = {
  CASH: '現金',
  CREDIT_CARD: '信用卡',
  DEBIT_CARD: '金融卡',
  LINE_PAY: 'LINE Pay',
  OTHER: '其他',
};

interface Props {
  order: Order | null;
  open: boolean;
  onClose: () => void;
}

export default function ReceiptModal({ order, open, onClose }: Props) {
  if (!order) return null;

  const handlePrint = () => {
    const printContent = document.getElementById('receipt-content');
    if (!printContent) return;

    const win = window.open('', '_blank', 'width=380,height=600');
    if (!win) return;

    win.document.write(`
      <html>
        <head>
          <title>收據 ${order.orderNumber}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Courier New', monospace; font-size: 13px; padding: 16px; width: 320px; }
            h2 { text-align: center; margin-bottom: 4px; }
            .center { text-align: center; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 2px 4px; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .total { font-size: 16px; font-weight: bold; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const columns = [
    { title: '商品', dataIndex: ['product', 'name'], key: 'name' },
    { title: '數量', dataIndex: 'quantity', key: 'qty', width: 50 },
    { title: '單價', dataIndex: 'unitPrice', key: 'price', width: 70, render: (v: number) => `$${Number(v).toFixed(0)}` },
    { title: '小計', dataIndex: 'subtotal', key: 'sub', width: 70, render: (v: number) => `$${Number(v).toFixed(0)}` },
  ];

  return (
    <Modal
      title="電子收據"
      open={open}
      onCancel={onClose}
      footer={
        <Space>
          <Button onClick={onClose}>關閉</Button>
          <Button type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>列印收據</Button>
        </Space>
      }
      width={480}
    >
      <div id="receipt-content" style={{ fontFamily: 'monospace', padding: '8px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <Title level={4} style={{ margin: 0 }}>POS 銷售系統</Title>
          <Text type="secondary" style={{ fontSize: 12 }}>收據</Text>
        </div>

        <Divider dashed style={{ margin: '8px 0' }} />

        <div style={{ fontSize: 12, marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text type="secondary">訂單編號</Text>
            <Text strong>{order.orderNumber}</Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text type="secondary">日期時間</Text>
            <Text>{dayjs(order.createdAt).format('YYYY/MM/DD HH:mm')}</Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text type="secondary">收銀員</Text>
            <Text>{order.cashier?.name}</Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text type="secondary">付款方式</Text>
            <Text>{PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}</Text>
          </div>
        </div>

        <Divider dashed style={{ margin: '8px 0' }} />

        <Table
          dataSource={order.items}
          columns={columns}
          rowKey="id"
          pagination={false}
          size="small"
          style={{ marginBottom: 8 }}
        />

        <Divider dashed style={{ margin: '8px 0' }} />

        <div style={{ fontSize: 13 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text>小計</Text>
            <Text>${Number(order.subtotal).toFixed(0)}</Text>
          </div>
          {Number(order.discountAmount) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text type="danger">折扣</Text>
              <Text type="danger">-${Number(order.discountAmount).toFixed(0)}</Text>
            </div>
          )}
          <Divider style={{ margin: '6px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4} style={{ margin: 0 }}>合計</Title>
            <Title level={3} style={{ margin: 0, color: '#1890ff' }}>${Number(order.total).toFixed(0)}</Title>
          </div>
        </div>

        <Divider dashed style={{ margin: '8px 0' }} />
        <div style={{ textAlign: 'center', fontSize: 11, color: '#8c8c8c' }}>
          感謝您的光顧，歡迎再次光臨！
        </div>
      </div>
    </Modal>
  );
}
