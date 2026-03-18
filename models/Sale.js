// models/Sale.js
import mongoose from "mongoose";

const saleItemSchema = new mongoose.Schema({
  productId: { type: String, default: "" },
  code: { type: String, default: "" },
  description: { type: String, required: true },
  measurement: { type: String, default: "" },
  rack: { type: String, default: "" },
  qty: { type: Number, required: true, default: 1 },
  rate: { type: Number, default: 0 },
  disc: { type: Number, default: 0 },
  amount: { type: Number, default: 0 },
});

const saleSchema = new mongoose.Schema(
  {
    invoiceNo: { type: String, required: true, unique: true },
    invoiceDate: { type: String, required: true },
    saleType: { type: String, default: "sale", enum: ["sale", "return"] },
    saleSource: {
      type: String,
      default: "cash",
      enum: ["debit", "credit", "cash"],
    }, // debit=DebitSalePage, credit=CreditSalePage, cash=Counter
    saleSource: {
      type: String,
      default: "cash",
      enum: ["cash", "credit", "debit"],
    }, // cash=counter, credit=credit sale, debit=debit/purchase
    paymentMode: {
      type: String,
      default: "Cash",
      enum: ["Cash", "Credit", "Bank", "Cheque", "Partial"],
    },

    // Customer
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },
    customerName: { type: String, default: "COUNTER SALE" },
    customerPhone: { type: String, default: "" },

    // Items
    items: [saleItemSchema],

    // Amounts
    subTotal: { type: Number, default: 0 },
    extraDisc: { type: Number, default: 0 }, // extra discount amount
    discAmount: { type: Number, default: 0 },
    netTotal: { type: Number, default: 0 },
    prevBalance: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },

    sendSms: { type: Boolean, default: false },
    remarks: { type: String, default: "" },
    status: { type: String, default: "Active", enum: ["Active", "Cancelled"] },
  },
  { timestamps: true },
);

export default mongoose.model("Sale", saleSchema);
