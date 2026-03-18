// controllers/saleController.js
import Sale from "../models/Sale.js";
import Customer from "../models/Customer.js";

// ── GET all sales — full filter support ───────────────────────────────────
export const getAllSales = async (req, res) => {
  try {
    const {
      customerId,
      saleType,
      saleSource,
      paymentMode,
      dateFrom,
      dateTo,
      search,
      limit,
    } = req.query;

    const filter = {};
    if (customerId) filter.customerId = customerId;
    if (saleType) filter.saleType = saleType;
    if (saleSource) filter.saleSource = saleSource;
    if (paymentMode) filter.paymentMode = paymentMode;

    if (dateFrom || dateTo) {
      filter.invoiceDate = {};
      if (dateFrom) filter.invoiceDate.$gte = dateFrom;
      if (dateTo) filter.invoiceDate.$lte = dateTo;
    }

    if (search) {
      const r = new RegExp(search, "i");
      filter.$or = [
        { invoiceNo: r },
        { customerName: r },
        { customerPhone: r },
      ];
    }

    const sales = await Sale.find(filter)
      .sort({ invoiceDate: -1, createdAt: -1 })
      .limit(Number(limit) || 1000);

    res.json({ success: true, data: sales, count: sales.length });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ── GET summary stats ─────────────────────────────────────────────────────
export const getSaleSummary = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const dateFilter = {};
    if (dateFrom || dateTo) {
      dateFilter.invoiceDate = {};
      if (dateFrom) dateFilter.invoiceDate.$gte = dateFrom;
      if (dateTo) dateFilter.invoiceDate.$lte = dateTo;
    }

    const agg = (extra) =>
      Sale.aggregate([
        { $match: { ...dateFilter, saleType: "sale", ...extra } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            total: { $sum: "$netTotal" },
            paid: { $sum: "$paidAmount" },
            balance: { $sum: "$balance" },
          },
        },
      ]);

    const [all, debit, credit, cash, returns] = await Promise.all([
      agg({}),
      agg({ saleSource: "debit" }),
      agg({ saleSource: "credit" }),
      agg({ saleSource: "cash" }),
      Sale.aggregate([
        { $match: { ...dateFilter, saleType: "return" } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            total: { $sum: "$netTotal" },
          },
        },
      ]),
    ]);

    const g = (a) => a[0] || { count: 0, total: 0, paid: 0, balance: 0 };
    res.json({
      success: true,
      data: {
        all: g(all),
        debit: g(debit),
        credit: g(credit),
        cash: g(cash),
        returns: g(returns),
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ── GET single sale ───────────────────────────────────────────────────────
export const getSaleById = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id).populate(
      "customerId",
      "name phone code",
    );
    if (!sale)
      return res
        .status(404)
        .json({ success: false, message: "Sale not found" });
    res.json({ success: true, data: sale });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ── GET next invoice number ───────────────────────────────────────────────
export const getNextInvoice = async (req, res) => {
  try {
    const last = await Sale.findOne({}, {}, { sort: { createdAt: -1 } });
    let num = 1;
    if (last?.invoiceNo) {
      const n = parseInt(last.invoiceNo.replace("INV-", ""));
      if (!isNaN(n)) num = n + 1;
    }
    res.json({
      success: true,
      data: { invoiceNo: `INV-${String(num).padStart(5, "0")}` },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ── POST create sale ──────────────────────────────────────────────────────
export const createSale = async (req, res) => {
  try {
    const last = await Sale.findOne({}, {}, { sort: { createdAt: -1 } });
    let num = 1;
    if (last?.invoiceNo) {
      const n = parseInt(last.invoiceNo.replace("INV-", ""));
      if (!isNaN(n)) num = n + 1;
    }
    const invoiceNo = `INV-${String(num).padStart(5, "0")}`;
    const sale = await Sale.create({ ...req.body, invoiceNo });

    if (sale.customerId && sale.balance > 0) {
      await Customer.findByIdAndUpdate(sale.customerId, {
        $inc: { currentBalance: sale.balance },
      });
    }
    res.status(201).json({ success: true, data: sale });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

// ── PUT update sale ───────────────────────────────────────────────────────
export const updateSale = async (req, res) => {
  try {
    const sale = await Sale.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!sale)
      return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: sale });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

// ── DELETE sale ───────────────────────────────────────────────────────────
export const deleteSale = async (req, res) => {
  try {
    const sale = await Sale.findByIdAndDelete(req.params.id);
    if (!sale)
      return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, message: "Deleted" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};
