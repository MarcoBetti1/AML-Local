import React, { useState, useEffect } from 'react';

const Dropdown = ({ label, isOpen, toggleOpen, children }) => (
  <div className={`dropdown ${isOpen ? 'open' : ''}`}>
    <h3 onClick={toggleOpen}>
      <span>{label}</span>
    </h3>
    {isOpen && children}
  </div>
);

const TransactionItem = ({ transaction }) => {
  const [isOpen, setIsOpen] = useState(false);

  const formatDateTime = (timestamp) => {
    const date = new Date(parseInt(timestamp));
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  const renderTransactionDetails = () => {
    const { type, location, timestamp, amount, targetId, businessId } = transaction;
    const [date, time] = formatDateTime(timestamp).split(' ');

    switch (type) {
      case 'send':
      case 'receive':
        return (
          <>
            <p>Money transfer</p>
            <p>Transaction Date: {date}</p>
            <p>Time of Transaction: {time}</p>
            <p>Payment Amount: ${amount}</p>
            <p>Sender: {type === 'send' ? 'This entity' : targetId}</p>
            <p>Receiver: {type === 'receive' ? 'This entity' : targetId}</p>
            <p>Location: {location}</p>
          </>
        );
      case 'billPay':
        return (
          <>
            <p>Bill-Pay</p>
            <p>Transaction Date: {date}</p>
            <p>Time of Transaction: {time}</p>
            <p>Payment Amount: ${amount}</p>
            <p>Sender: This entity</p>
            <p>Business: {businessId}</p>
            <p>Location: {location}</p>
          </>
        );
      case 'buyGiftCard':
        return (
          <>
            <p>Gift Card Purchase</p>
            <p>Transaction Date: {date}</p>
            <p>Time of Transaction: {time}</p>
            <p>Payment Amount: ${amount}</p>
            <p>Location: {location}</p>
          </>
        );
      default:
        return <p>Unknown transaction type</p>;
    }
  };

  return (
    <div className="transaction-item">
      <h4 onClick={() => setIsOpen(!isOpen)}>{transaction.type} Transaction</h4>
      {isOpen && <div className="transaction-details">{renderTransactionDetails()}</div>}
    </div>
  );
};

function EntityDetails({ groupData }) {
  const [isTransactionInfoOpen, setIsTransactionInfoOpen] = useState(false);
  const [isEntityInfoOpen, setIsEntityInfoOpen] = useState(false);
  const [isAdditionalInfoOpen, setIsAdditionalInfoOpen] = useState(false);

  if (!groupData) {
    return <div>No group data available</div>;
  }

  const { entities, transactions, groupStats } = groupData;

  return (
    <div className="details-panel">
      <div className="details-header">
        <h2>Details</h2>
      </div>
      
      <Dropdown
        label="Transaction Info"
        isOpen={isTransactionInfoOpen}
        toggleOpen={() => setIsTransactionInfoOpen(!isTransactionInfoOpen)}
      >
        <div className="nested-content">
          {transactions.map((transaction, index) => (
            <TransactionItem key={index} transaction={transaction} />
          ))}
        </div>
      </Dropdown>

      <Dropdown
        label="Entity Info"
        isOpen={isEntityInfoOpen}
        toggleOpen={() => setIsEntityInfoOpen(!isEntityInfoOpen)}
      >
        <div className="nested-content">
          {Object.entries(entities.reduce((acc, entity) => {
            if (!acc[entity.type]) acc[entity.type] = [];
            acc[entity.type].push(entity);
            return acc;
          }, {})).map(([type, entitiesOfType]) => (
            <Dropdown
              key={type}
              label={`${type} (${entitiesOfType.length})`}
              isOpen={false}
              toggleOpen={() => {}}
            >
              <ul>
                {entitiesOfType.map((entity, index) => (
                  <li key={index}>{entity.info.FirstName || entity.id}</li>
                ))}
              </ul>
            </Dropdown>
          ))}
        </div>
      </Dropdown>

      <Dropdown
        label="Additional Information"
        isOpen={isAdditionalInfoOpen}
        toggleOpen={() => setIsAdditionalInfoOpen(!isAdditionalInfoOpen)}
      >
        <div className="nested-content">
          <div className="group-stats">
            <p>Entity Count: {groupStats.entityCount}</p>
            <p>Transaction Count: {groupStats.transactionCount}</p>
          </div>
        </div>
      </Dropdown>
    </div>
  );
}

export default EntityDetails;