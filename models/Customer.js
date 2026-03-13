// models/Customer.js
import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, sparse: true, default: "" },
    name: { type: String, required: true, trim: true },
    nameUrdu: { type: String, default: "" },
    type: {
      type: String,
      enum: ["walkin", "credit", "wholesale"],
      default: "walkin",
    },
    contactPerson: { type: String, default: "" },
    phone: { type: String, default: "" },
    phone2: { type: String, default: "" },
    otherPhone: { type: String, default: "" },
    cell: { type: String, default: "" },
    email: { type: String, default: "" },
    address: { type: String, default: "" },
    area: { type: String, default: "" },
    city: { type: String, default: "" },
    openingBalance: { type: Number, default: 0 },
    openingBalanceType: {
      type: String,
      enum: ["Debit", "Credit"],
      default: "Debit",
    },
    openingBalanceDate: { type: String, default: "" },
    currentBalance: { type: Number, default: 0 },
    creditLimit: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

// Auto-generate code — NO async, NO next(), use return promise pattern
customerSchema.pre("save", async function () {
  if (!this.code || this.code.trim() === "") {
    const count = await mongoose.model("Customer").countDocuments();
    this.code = `C${String(count + 1).padStart(4, "0")}`;
    console.log("🔑 Auto-generated code:", this.code);
  }
});

const Customer = mongoose.model("Customer", customerSchema);
export default Customer;
