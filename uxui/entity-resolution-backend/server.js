const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const port = 3001;
const csv = require('csv-parser');
const { Readable } = require('stream');
app.use(cors());
app.use(express.json());

const DATA_DIR = '/Users/m0b0yxy/Desktop/V1.2/data/core/entity_storage';
const HISTORY_DIR='/Users/m0b0yxy/Desktop/V1.2/data/core/entity_data_storage'

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
      if (!dateString) return null;
      const [datePart, timePart] = dateString.split('-');
      const [month, day, year] = datePart.split('/');
      const [hours, minutes] = timePart.split(':');
      return new Date(2000 + parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
    };
  
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
  
    return data.map(entry => {
      if (!entry.transaction || entry.type === 'Type') {
        return entry; // Keep entries without transactions or 'Type' entries as is
      }
      console.log(entry.transaction.timestamp)
      const transactionDate = parseDate(entry.transaction.timestamp);
      if (!transactionDate) return entry; // Keep entries with invalid dates
  
      if (
        (start && transactionDate < start) ||
        (end && transactionDate > end)
      ) {
        // If the transaction is outside the date range, remove the transaction but keep the entity
        return {
          ...entry,
          transaction: null
        };
      }
  
      return entry; // Keep the entry as is if it's within the date range
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
              addEdge(transferNodeId,targetId, 'transaction');
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
  fs.readdir(HISTORY_DIR, (err, files) => {
    if (err) {
      console.error('Error reading directory:', err);
      res.status(500).json({ error: 'Failed to fetch groups' });
    } else {
      const groups = files.filter(file => file.endsWith('.csv')).map(file => file.replace('.csv', ''));
      res.json(groups);
    }
  });
});

app.get('/api/search', async (req, res) => {
    const searchTerm = req.query.term.toLowerCase();
    const results = [];
  
    try {
      const files = await fs.readdir(HISTORY_DIR);
      const csvFiles = files.filter(file => file.endsWith('.csv'));
  
      for (const file of csvFiles) {
        const groupName = file.replace('.csv', '');
        const filePath = path.join(HISTORY_DIR, file);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        
        const rows = await new Promise((resolve, reject) => {
          const results = [];
          Readable.from(fileContent)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', (error) => reject(error));
        });
  
        for (const row of rows) {
          for (const [key, value] of Object.entries(row)) {
            if (value.toLowerCase().includes(searchTerm)) {
              results.push({
                group: groupName,
                displayValue: value
              });
              break; // Stop after finding the first match in this row
            }
          }
        }
      }
  
      // Sort results by relevance
      results.sort((a, b) => {
        const aValue = a.displayValue.toLowerCase();
        const bValue = b.displayValue.toLowerCase();
        if (aValue === searchTerm) return -1;
        if (bValue === searchTerm) return 1;
        if (aValue.startsWith(searchTerm) && !bValue.startsWith(searchTerm)) return -1;
        if (bValue.startsWith(searchTerm) && !aValue.startsWith(searchTerm)) return 1;
        return 0;
      });
  
      res.json(results);
    } catch (error) {
      console.error('Error performing search:', error);
      res.status(500).json({ error: 'Failed to perform search' });
    }
  });
  app.get('/api/group-info/:id', async (req, res) => {
    const groupId = req.params.id;
    const filePath = path.join(HISTORY_DIR, `${groupId}.csv`);
  
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const rows = await new Promise((resolve, reject) => {
        const results = [];
        Readable.from(fileContent)
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', () => resolve(results))
          .on('error', (error) => reject(error));
      });
      console.log(rows)
      if (rows.length >= 1) {
        console.log("Success")
        // Get the first non-header row
        const firstDataRow = rows[0];
        const values = Object.values(firstDataRow);
        const firstValue = values[0].trim();
        const secondValue = values[1].trim();
        // Concatenate the first two values
        const displayValue = `${firstValue} ${secondValue}`;
        res.json({ groupId, displayValue });
      } else {
        // If there's no data, return the group ID as the display value
        res.json({ groupId, displayValue: groupId });
      }
    } catch (error) {
      console.error(`Error reading file for group ${groupId}:`, error);
      res.status(500).json({ error: `Failed to fetch group info for ${groupId}` });
    }
  });
  
app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});