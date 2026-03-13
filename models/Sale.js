// models/Sale.js
import mongoose from "mongoose";

const saleItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    code: { type: String, default: "" },
    description: { type: String, default: "" },
    measurement: { type: String, default: "" },
    rack: { type: String, default: "" },
    qty: { type: Number, default: 1 },
    rate: { type: Number, default: 0 },
    disc: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
  },
  { _id: false },
);

const saleSchema = new mongoose.Schema(
  {
    invoiceNo: { type: String, unique: true },
    invoiceDate: { type: String, required: true },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },
    customerName: { type: String, default: "COUNTER SALE" },
    customerPhone: { type: String, default: "" },
    items: [saleItemSchema],
    subTotal: { type: Number, default: 0 },
    extraDisc: { type: Number, default: 0 },
    discAmount: { type: Number, default: 0 },
    netTotal: { type: Number, default: 0 },
    prevBalance: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    paymentMode: {
      type: String,
      enum: ["Cash", "Credit", "Bank", "Cheque"],
      default: "Cash",
    },
    saleType: { type: String, enum: ["sale", "return"], default: "sale" },
    originalSaleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sale",
      default: null,
    },
    remarks: { type: String, default: "" },
    printType: { type: String, default: "Thermal" },
    sendSms: { type: Boolean, default: false },
  },
  { timestamps: true },
);

 
saleSchema.pre("save", async function () {
  if (!this.invoiceNo) {
    const prefix = this.saleType === "return" ? "RTN" : "INV";
    const count = await mongoose
      .model("Sale")
      .countDocuments({ saleType: this.saleType });
    this.invoiceNo = `${prefix}-${String(count + 1).padStart(5, "0")}`;
    console.log("🔑 Auto-generated invoiceNo:", this.invoiceNo);
  }
});

const Sale = mongoose.model("Sale", saleSchema);
export default Sale;
