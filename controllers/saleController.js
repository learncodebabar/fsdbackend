// controllers/saleController.js
import Sale from "../models/Sale.js";
import { recalcBalance } from "./customerController.js";

// ── Response helpers ──────────────────────────────────────────────────────────
const ok = (res, data, msg = "Success") =>
  res.json({ success: true, message: msg, data });
const err = (res, msg, status = 500) =>
  res.status(status).json({ success: false, message: msg, data: null });

// ── GET ALL ───────────────────────────────────────────────────────────────────
export const getAll = async (req, res) => {
  try {
    const { from, to, customerId, search, saleType = "sale" } = req.query;
    const filter = { saleType };
    if (customerId) filter.customerId = customerId;
    if (from || to) {
      filter.invoiceDate = {};
      if (from) filter.invoiceDate.$gte = from;
      if (to) filter.invoiceDate.$lte = to;
    }
    if (search) {
      filter.$or = [
        { invoiceNo: { $regex: search, $options: "i" } },
        { customerName: { $regex: search, $options: "i" } },
      ];
    }
    const sales = await Sale.find(filter)
      .sort({ invoiceDate: -1, createdAt: -1 })
      .populate("customerId", "name code phone")
      .lean();
    console.log(`✅ GET sales (${saleType}) — found ${sales.length}`);
    ok(res, sales);
  } catch (e) {
    console.error("❌ GET sales error:", e.message);
    err(res, e.message);
  }
};

// ── NEXT INVOICE NUMBER ───────────────────────────────────────────────────────
export const getNextInvoiceNo = async (req, res) => {
  try {
    const saleType = req.query.saleType || "sale";
    const prefix = saleType === "return" ? "RTN" : "INV";
    const count = await Sale.countDocuments({ saleType });
    const next = `${prefix}-${String(count + 1).padStart(5, "0")}`;
    console.log("✅ Next invoice:", next);
    ok(res, { invoiceNo: next });
  } catch (e) {
    console.error("❌ Next invoice error:", e.message);
    err(res, e.message);
  }
};

// ── GET ONE ───────────────────────────────────────────────────────────────────
export const getOne = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate("customerId", "name code phone")
      .lean();
    if (!sale) {
      console.warn("⚠️ Sale not found:", req.params.id);
      return err(res, "Sale not found", 404);
    }
    console.log("✅ GET sale:", sale.invoiceNo);
    ok(res, sale);
  } catch (e) {
    console.error("❌ GET one sale error:", e.message);
    err(res, e.message);
  }
};

// ── CREATE ────────────────────────────────────────────────────────────────────
export const create = async (req, res) => {
  try {
    console.log("📥 CREATE sale payload:", JSON.stringify(req.body, null, 2));
    const sale = new Sale(req.body);
    await sale.save();
    if (sale.customerId) await recalcBalance(sale.customerId);
    console.log("✅ Sale created:", sale.invoiceNo);
    ok(res, sale, "Sale saved");
  } catch (e) {
    console.error("❌ CREATE sale error:", e.message);
    err(res, e.message);
  }
};

// ── UPDATE ────────────────────────────────────────────────────────────────────
export const update = async (req, res) => {
  try {
    console.log("📝 UPDATE sale id:", req.params.id);
    const sale = await Sale.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true },
    );
    if (!sale) {
      console.warn("⚠️ Sale not found for update:", req.params.id);
      return err(res, "Sale not found", 404);
    }
    if (sale.customerId) await recalcBalance(sale.customerId);
    console.log("✅ Sale updated:", sale.invoiceNo);
    ok(res, sale, "Sale updated");
  } catch (e) {
    console.error("❌ UPDATE sale error:", e.message);
    err(res, e.message);
  }
};

// ── DELETE ────────────────────────────────────────────────────────────────────
export const remove = async (req, res) => {
  try {
    console.log("🗑 DELETE sale id:", req.params.id);
    const sale = await Sale.findByIdAndDelete(req.params.id);
    if (!sale) {
      console.warn("⚠️ Sale not found for delete:", req.params.id);
      return err(res, "Sale not found", 404);
    }
    if (sale.customerId) await recalcBalance(sale.customerId);
    console.log("✅ Sale deleted:", sale.invoiceNo);
    ok(res, sale, "Sale deleted");
  } catch (e) {
    console.error("❌ DELETE sale error:", e.message);
    err(res, e.message);
  }
};

// ── CREATE RETURN ─────────────────────────────────────────────────────────────
export const createReturn = async (req, res) => {
  try {
    console.log("↩️ CREATE return for sale:", req.body.originalSaleId);
    const orig = await Sale.findById(req.body.originalSaleId);
    if (!orig) {
      console.warn("⚠️ Original sale not found");
      return err(res, "Original sale not found", 404);
    }
    const { items, remarks, invoiceDate } = req.body;
    const subTotal = items.reduce((s, i) => s + (i.amount || 0), 0);
    const returnSale = new Sale({
      saleType: "return",
      originalSaleId: orig._id,
      invoiceDate: invoiceDate || new Date().toISOString().split("T")[0],
      customerId: orig.customerId,
      customerName: orig.customerName,
      customerPhone: orig.customerPhone,
      items,
      subTotal,
      extraDisc: 0,
      discAmount: 0,
      netTotal: subTotal,
      paidAmount: 0,
      balance: 0,
      paymentMode: orig.paymentMode,
      remarks,
    });
    await returnSale.save();
    if (returnSale.customerId) await recalcBalance(returnSale.customerId);
    console.log("✅ Return created:", returnSale.invoiceNo);
    ok(res, returnSale, "Return saved");
  } catch (e) {
    console.error("❌ CREATE return error:", e.message);
    err(res, e.message);
  }
};

// ── STATS ─────────────────────────────────────────────────────────────────────
export const getStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const [todaySales, totalSales] = await Promise.all([
      Sale.find({ saleType: "sale", invoiceDate: today }).lean(),
      Sale.find({ saleType: "sale" }).lean(),
    ]);
    const stats = {
      todayCount: todaySales.length,
      todayTotal: todaySales.reduce((s, x) => s + x.netTotal, 0),
      totalCount: totalSales.length,
      totalAmount: totalSales.reduce((s, x) => s + x.netTotal, 0),
    };
    console.log("✅ Stats:", stats);
    ok(res, stats);
  } catch (e) {
    console.error("❌ GET stats error:", e.message);
    err(res, e.message);
  }
};
