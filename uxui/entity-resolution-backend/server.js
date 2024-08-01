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
  const [location, timestamp, type, ...rest] = transaction.split('_');
  const baseInfo = { location, timestamp, type };

  switch (type) {
    case 'send':
    case 'receive':
      return {
        ...baseInfo,
        targetId: rest[0],
        amount: parseFloat(rest[1])
      };
    case 'billPay':
      return {
        ...baseInfo,
        businessId: rest[0],
        amount: parseFloat(rest[1])
      };
    case 'buyGiftCard':
      return {
        ...baseInfo,
        amount: parseFloat(rest[0])
      };
    default:
      return baseInfo;
  }
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

const generateGraphData = (entities, transactions) => {
    const nodes = new Map();
    const edges = new Map();
  
    const addNode = (id, type, data) => {
      if (!nodes.has(id) && type !== 'Type') {  // Exclude 'Type' nodes
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
      if (entity.info.PhoneNumber) {
        const phoneNodeId = `${entity.id}-phone`;
        addNode(phoneNodeId, 'PhoneNumber', {
          label: 'Phone Number',
          displayName: entity.info.PhoneNumber
        });
        addEdge(entity.id, phoneNodeId);
      }
      if (entity.info.Address) {
        const addressNodeId = `${entity.id}-address`;
        addNode(addressNodeId, 'Address', {
          label: 'Address',
          displayName: entity.info.Address
        });
        addEdge(entity.id, addressNodeId);
      }
    }
  });

  transactions.forEach(transaction => {
    const { type, entityId, targetId, businessId, amount } = transaction;
    if (type === 'send' || type === 'receive') {
      const transactionNodeId = `${entityId}-${type}-${targetId}`;
      addNode(transactionNodeId, 'Transfer', {
        label: 'Transfer',
        info: transaction,
        displayName: `Money Transfer`
      });
      addEdge(entityId, transactionNodeId, 'transaction');
      addEdge(transactionNodeId, targetId, 'transaction');
      addEdge(entityId, targetId);
    } else if (type === 'billPay') {
      const transactionNodeId = `${entityId}-billPay-${businessId}`;
      addNode(transactionNodeId, 'BillPay', {
        label: 'Bill Pay',
        info: transaction,
        displayName: `$${amount}`
      });
      addEdge(entityId, transactionNodeId, 'transaction');
      addEdge(transactionNodeId, businessId, 'transaction');
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
    const groupData = await readGroupData(`${groupId}.csv`);
    
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
      const transaction = {
        ...entry.transaction,
        entityId: entry.id
      };
      transactions.push(transaction);
      entities[entry.id].transactions.push(transaction);
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
    res.status(500).json({ error: 'Failed to generate group data' });
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