const Order = require('../models/orderModel');

const loadSales = async (req, res) => {
  try {
    res.render("./admin/sales-report.hbs", { layout: './admin/admin-layout' });
  } catch (error) {
    console.log(error.message);
  }
};

const calculateDateRange = (type, customRange) => {
  const now = new Date();
  let startDate, endDate;

  switch (type) {
    case 'daily':
      startDate = new Date(now.setHours(0, 0, 0, 0));
      endDate = new Date(now.setHours(23, 59, 59, 999));
      break;
    case 'weekly':
      // Set startDate to the beginning of the week (Sunday)
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      startDate.setDate(now.getDate() - now.getDay()); // Go back to Sunday of the current week
      // Set endDate to the end of the week (Saturday)
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'monthly':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    case 'yearly':
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;
    case 'custom':
      startDate = new Date(customRange.startDate);
      endDate = new Date(customRange.endDate);
      endDate.setHours(23, 59, 59, 999);
      break;
    default:
      throw new Error('Invalid report type');
  }

  return { startDate, endDate };
};



const salesReport = async (req, res) => {
  try {
    const { type } = req.params; // Ensure 'type' is retrieved from req.params
    const customRange = req.body;

    // Validate the report type
    if (!['daily', 'weekly', 'monthly', 'yearly'].includes(type)) {
      return res.status(400).json({ error: 'Invalid report type' });
    }

    const { startDate, endDate } = calculateDateRange(type, customRange);

    const salesData = await Order.getSalesReport(startDate, endDate, type); // Pass 'type' to getSalesReport

    if (!salesData || salesData.length === 0) {
      return res.json({
        type,
        totalSales: 0,
        totalDiscount: 0,
        orderCount: 0,
        orders: []
      });
    }

    const report = salesData[0];

    res.json({
      type,
      totalSales: report.totalSales || 0,
      totalDiscount: report.totalDiscount || 0,
      orderCount: report.orderCount || 0,
      orders: report.orders || []
    });
  } catch (error) {
    console.error('Error fetching sales report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const customSales = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    // Ensure correct date format and parsing
    const start = new Date(startDate);
    const end = new Date(endDate);

    const orders = await Order.find({
      createdAt: { $gte: start, $lte: end }
    }).populate('items.product');

    let totalSales = 0;
    orders.forEach(order => {
      totalSales += order.totalPrice;
    });

    res.json({ orders, totalSales, type: 'custom' });
  } catch (error) {
    console.error('Error fetching custom sales report:', error);
    res.status(500).send('Internal Server Error');
  }
};

const salesOrder = async (req, res) => {
  try {
    const { timePeriod } = req.query;

    if (!timePeriod) {
      return res.status(400).json({ error: 'Time period is required' });
    }

    const { startDate, endDate } = calculateDateRange(timePeriod);

    const salesData = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalSales: { $sum: "$totalPrice" },
          totalOrders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const formattedData = salesData.reduce((acc, curr) => {
      acc[curr._id] = {
        totalSales: curr.totalSales,
        totalOrders: curr.totalOrders
      };
      return acc;
    }, {});

    res.json(formattedData);
  } catch (error) {
    console.error('Error fetching sales and orders data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const pieChart = async (req, res) => {
  try {
    const categoryWiseSale = await Order.aggregate([
      {
        $match: {
          status: { $ne: "Cancelled" },
        },
      },
      {
        $unwind: "$items",
      },
      {
        $lookup: {
          from: "products", // the foreign collection name
          localField: "items.product", // the foreign collection id in our local collection
          foreignField: "_id", // foreign collection id
          as: "productInfo", // new field added
        },
      },
      {
        $unwind: "$productInfo",
      },
      {
        $lookup: {
          from: "categories", // assuming you have a categories collection
          localField: "productInfo.category", // the category field in the productInfo
          foreignField: "_id", // foreign collection id in categories collection
          as: "categoryInfo", // new field added
        },
      },
      {
        $unwind: "$categoryInfo",
      },
      {
        $group: {
          _id: "$categoryInfo.name", // group by category name instead of id
          purchaseCount: { $sum: "$items.quantity" },
        },
      },
    ]);

    res.json({ categoryWiseSale });
  } catch (error) {
    console.error("Error generating pie chart data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

//barChart
const barChart = async (req, res) => {
  const { timeFrame } = req.query;

  try {
    let aggregationPipeline = [];

    // Match based on status
    aggregationPipeline.push({
      $match: {
        status: { $in: ["Pending", "Delivered", "Confirmed"] },
      },
    });

    // Group by different time frames
    switch (timeFrame) {
      case "daily":
        aggregationPipeline.push({
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            totalOrders: { $sum: 1 },
          },
        });
        break;

      case "weekly":
        aggregationPipeline.push({
          $group: {
            _id: { $dateToString: { format: "%Y-%U", date: "$createdAt" } },
            totalOrders: { $sum: 1 },
          },
        });
        break;

      case "monthly":
        aggregationPipeline.push({
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            totalOrders: { $sum: 1 },
          },
        });
        break;

      case "yearly":
        aggregationPipeline.push({
          $group: {
            _id: { $dateToString: { format: "%Y", date: "$createdAt" } },
            totalOrders: { $sum: 1 },
          },
        });
        break;

      default:
        res.status(400).json({ error: "Invalid time frame" });
        return;
    }

    // Project and sort
    aggregationPipeline.push(
      {
        $project: {
          _id: 0,
          timeFrame: "$_id",
          totalOrders: 1,
        },
      },
      {
        $sort: { timeFrame: 1 },
      }
    );

    const result = await Order.aggregate(aggregationPipeline);

    const salesData = {
      labels: result.map((entry) => entry.timeFrame),
      datasets: [
        {
          label: `${timeFrame.charAt(0).toUpperCase() + timeFrame.slice(1)
            } Sales`,
          backgroundColor: "rgba(75,192,192,0.2)",
          borderColor: "rgba(75,192,192,1)",
          borderWidth: 1,
          data: result.map((entry) => entry.totalOrders),
        },
      ],
    };

    res.json(salesData);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};




module.exports = {
  loadSales,
  salesReport,
  customSales,
  salesOrder,
  pieChart,
  barChart
}