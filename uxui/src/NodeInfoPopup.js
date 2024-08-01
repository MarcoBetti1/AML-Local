import React from 'react';

const NodeInfoPopup = ({ node, onClose }) => {
  if (!node) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 1000,
    }}>
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '10px',
        maxWidth: '400px',
        maxHeight: '80%',
        overflow: 'auto',
      }}>
        <h2>{node.data.displayName}</h2>
        <p>Type: {node.type}</p>
        {node.data.info && Object.entries(node.data.info).map(([key, value]) => (
          <p key={key}>{key}: {value}</p>
        ))}
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default NodeInfoPopup;