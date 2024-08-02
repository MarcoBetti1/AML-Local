const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const DATA_DIR = '/Users/m0b0yxy/Desktop/V1.2/data/core/entity_storage';

  const parseTransaction = (transaction) => {
    // If it's already an object, return it as is
    if (typeof transaction === 'object' && transaction !== null) {
      return transaction;
    }
  
    // If it's a string, parse it
    if (typeof transaction === 'string') {
      const parts = transaction.split('_');
      if (parts.length < 3) {
        console.error('Invalid transaction format:', transaction);
        return null;
      }
  
      const [location, timestamp, type, ...rest] = parts;
      const baseInfo = { location, timestamp, type };
  
      switch (type) {
        case 'send':
        case 'receive':
          if (rest.length >= 2) {
            return {
              ...baseInfo,
              targetId: rest[0],
              amount: parseFloat(rest[1])
            };
          }
          break;
        case 'billPay':
          if (rest.length >= 2) {
            return {
              ...baseInfo,
              businessId: rest[0],
              amount: parseFloat(rest[1])
            };
          }
          break;
        case 'buyGiftCard':
          if (rest.length >= 1) {
            return {
              ...baseInfo,
              amount: parseFloat(rest[0])
            };
          }
          break;
      }
    }
  
    console.error('Invalid transaction format:', transaction);
    return null;
  };
  

const parseTemplateInfo = (templateInfo) => {
  const [keys, values] = templateInfo.split(':');
  return keys.split('_').reduce((acc, key, index) => {
    acc[key] = values.split('_')[index];
    return acc;
  }, {});
};

const readGroupData = async (filename) => {
  const filePath = path.join(DATA_DIR, filename);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    return lines.map(line => {
      const [type, id, transaction, templateInfo, link] = line.split(',');
      return {
        type,
        id,
        transaction: parseTransaction(transaction),
        info: parseTemplateInfo(templateInfo),
        link: link || null
      };
    });
  } catch (error) {
    console.error(`Error reading file ${filename}:`, error);
    throw new Error(`Failed to read group data from ${filename}`);
  }
};

const filterByTimeframe = (data, startDate, endDate) => {
if (!startDate && !endDate) return data;

const parseDate = (dateString) => {
    const [datePart, timePart] = dateString.split('-');
    const [month, day, year] = datePart.split('/');
    const [hours, minutes] = timePart.split(':');
    return new Date(2000 + parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
};

const start = startDate ? new Date(startDate) : null;
const end = endDate ? new Date(endDate) : null;

return data.filter(entry => {
    const transactionDate = parseDate(entry.transaction.timestamp);
    if (!transactionDate) return true; // Keep entries with invalid dates

    if (start && end) {
    return transactionDate >= start && transactionDate <= end;
    } else if (start) {
    return transactionDate >= start;
    } else if (end) {
    return transactionDate <= end;
    }
    return true;
});
};

const generateGraphData = (entities, transactions) => {
    const nodes = new Map();
    const edges = new Map();
  
    const addNode = (id, type, data) => {
      if (!nodes.has(id) && type !== 'Type') {
        nodes.set(id, { id, type, data });
      }
    };
  
    const addEdge = (source, target, type = 'direct') => {
      const edgeId = `e${source}-${target}`;
      if (!edges.has(edgeId) && !edges.has(`e${target}-${source}`)) {
        edges.set(edgeId, { id: edgeId, source, target, type });
      }
    };
  
    entities.forEach(entity => {
      addNode(entity.id, entity.type, {
        label: entity.type,
        info: entity.info,
        displayName: entity.info.FirstName || entity.id
      });
  
      if (entity.type === 'Customer') {
        entity.transactions.forEach(transaction => {
          const { type, targetId, businessId, amount } = transaction;
          switch (type) {
            case 'send':
            case 'receive':
              const transferNodeId = `${entity.id}-${type}-${targetId}`;
              addNode(transferNodeId, 'Transfer', {
                label: 'Transfer',
                info: transaction,
                displayName: `Money Transfer`
              });
              addEdge(entity.id, transferNodeId, 'transaction');
              addEdge(targetId, transferNodeId, 'transaction');
              addEdge(entity.id, targetId, 'direct');
              break;
            case 'billPay':
              const billPayNodeId = `${entity.id}-billPay-${businessId}`;
              addNode(billPayNodeId, 'BillPay', {
                label: 'Bill Pay',
                info: transaction,
                displayName: `$${amount}`
              });
              addEdge(entity.id, billPayNodeId, 'transaction');
              addEdge(businessId, billPayNodeId, 'transaction');
              addNode(businessId, 'Business', {
                label: 'Business',
                info: { id: businessId },
                displayName: `Business ${businessId}`
              });

              break;
            case 'buyGiftCard':
              const giftCardNodeId = `${entity.id}-buyGiftCard-${transaction.timestamp}`;
              addNode(giftCardNodeId, 'GiftCard', {
                label: 'Gift Card',
                info: transaction,
                displayName: `Gift Card $${amount}`
              });
              addEdge(entity.id, giftCardNodeId, 'transaction');
              break;
          }
        });
      }
    });
  
    return {
      nodes: Array.from(nodes.values()),
      edges: Array.from(edges.values())
    };
  };
  

  app.get('/api/groups/:id/data', async (req, res) => {
    try {
      const groupId = req.params.id;
      const { startDate, endDate } = req.query;
      let groupData = await readGroupData(`${groupId}.csv`);
      
      // Apply timeframe filter
      groupData = filterByTimeframe(groupData, startDate, endDate);
  
      const entities = {};
      const transactions = [];
  
      groupData.forEach(entry => {
        // Process entity
        if (!entities[entry.id]) {
          entities[entry.id] = {
            id: entry.id,
            type: entry.type,
            info: entry.info,
            transactions: []
          };
        }
        
        // Process transaction
        if (entry.transaction) {
          const parsedTransaction = parseTransaction(entry.transaction);
          if (parsedTransaction) {
            if (entry.type === 'Customer') {
              transactions.push({
                ...parsedTransaction,
                entityId: entry.id
              });
              entities[entry.id].transactions.push(parsedTransaction);
            }
          }
        }
      });
  
      const entitiesArray = Object.values(entities);
      const graphData = generateGraphData(entitiesArray, transactions);
  
      res.json({
        entities: entitiesArray,
        transactions: transactions,
        graphData: graphData,
        groupStats: {
          entityCount: entitiesArray.length,
          transactionCount: transactions.length
        }
      });
    } catch (error) {
      console.error('Error generating group data:', error);
      res.status(500).json({ error: 'Failed to generate group data', details: error.message });
    }
  });

app.get('/api/groups', (req, res) => {
  fs.readdir(DATA_DIR, (err, files) => {
    if (err) {
      console.error('Error reading directory:', err);
      res.status(500).json({ error: 'Failed to fetch groups' });
    } else {
      const groups = files.filter(file => file.endsWith('.csv')).map(file => file.replace('.csv', ''));
      res.json(groups);
    }
  });
});

app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});