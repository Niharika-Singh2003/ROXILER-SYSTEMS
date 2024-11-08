const Transaction = require('../models/Transaction');
const axios = require('axios');

exports.initializeDatabase = async (req, res) => {
  try {
    const response = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
    await Transaction.deleteMany({});
    await Transaction.insertMany(response.data);
    res.json({ message: 'Database initialized' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.listTransactions = async (req, res) => {
  const { search, page = 1, perPage = 10 } = req.query;
  const query = search
    ? { $or: [{ title: new RegExp(search, 'i') }, { description: new RegExp(search, 'i') }, { price: new RegExp(search, 'i') }] }
    : {};

  try {
    const transactions = await Transaction.find(query)
      .skip((page - 1) * perPage)
      .limit(parseInt(perPage));
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getStatistics = async (req, res) => {
  const { month } = req.query;
  const start = new Date(`2021-${month}-01`);
  const end = new Date(start);
  end.setMonth(start.getMonth() + 1);

  try {
    const totalSaleAmount = await Transaction.aggregate([
      { $match: { dateOfSale: { $gte: start, $lt: end }, isSold: true } },
      { $group: { _id: null, total: { $sum: "$price" } } }
    ]);

    const soldCount = await Transaction.countDocuments({ dateOfSale: { $gte: start, $lt: end }, isSold: true });
    const notSoldCount = await Transaction.countDocuments({ dateOfSale: { $gte: start, $lt: end }, isSold: false });

    res.json({
      totalSaleAmount: totalSaleAmount[0]?.total || 0,
      totalSoldItems: soldCount,
      totalNotSoldItems: notSoldCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getBarChart = async (req, res) => {
  const { month } = req.query;
  const start = new Date(`2021-${month}-01`);
  const end = new Date(start);
  end.setMonth(start.getMonth() + 1);

  const priceRanges = [
    { label: "0-100", min: 0, max: 100 },
    { label: "101-200", min: 101, max: 200 },
    // Continue for other ranges up to 901-above
  ];

  try {
    const data = await Promise.all(priceRanges.map(async (range) => {
      const count = await Transaction.countDocuments({
        dateOfSale: { $gte: start, $lt: end },
        price: { $gte: range.min, $lte: range.max }
      });
      return { range: range.label, count };
    }));

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPieChart = async (req, res) => {
  const { month } = req.query;
  const start = new Date(`2021-${month}-01`);
  const end = new Date(start);
  end.setMonth(start.getMonth() + 1);

  try {
    const data = await Transaction.aggregate([
      { $match: { dateOfSale: { $gte: start, $lt: end } } },
      { $group: { _id: "$category", count: { $sum: 1 } } }
    ]);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
