import React from 'react';
import { Handle, Position } from 'react-flow-renderer';

const nodeIcons = {
  Customer: '/icons/user.png',
  'Counter-Party': '/icons/user.png',
  Business: '/icons/business.png',
  Transfer: '/icons/transfer.png',
  BillPay: '/icons/transfer.png',
  PhoneNumber: '/icons/phone.png',
  Address: '/icons/house.png',
  GiftCard:'/icons/giftCard.png',
};

const BaseNode = ({ type, data, isConnectable }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      position: 'relative',
    }}
  >
    <Handle type="target" position={Position.Top} isConnectable={isConnectable} style={{ background: '#555' }} />
    <img 
      src={process.env.PUBLIC_URL + nodeIcons[type]} 
      alt={type} 
      
      style={{ width: '30px', height: '30px' }} 
    />
    <div style={{ 
      fontSize: '12px', 
      marginTop: '5px', 
      textAlign: 'center',
      maxWidth: '80px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    }}>
      {data.displayName}
    </div>
    {(type === 'Customer') && (
      <div style={{
        position: 'absolute',
        top: '-3px',
        right: '-3px',
        background: '#06F27B',
        color: 'white',
        borderRadius: '50%',
        width: '9px',
        height: '9px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: '12px',
      }}>
        {data.connections}
      </div>
    )}
    <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} style={{ background: '#555' }} />
  </div>
);

const nodeTypes = {
  Customer: (props) => <BaseNode {...props} type="Customer" />,
  'Counter-Party': (props) => <BaseNode {...props} type="Counter-Party" />,
  Business: (props) => <BaseNode {...props} type="Business" />,
  Transfer: (props) => <BaseNode {...props} type="Transfer" />,
  BillPay: (props) => <BaseNode {...props} type="BillPay" />,
  GiftCard: (props) => <BaseNode {...props} type="GiftCard" />,
  PhoneNumber: (props) => <BaseNode {...props} type="PhoneNumber" />,
  Address: (props) => <BaseNode {...props} type="Address" />,
};

export default nodeTypes;