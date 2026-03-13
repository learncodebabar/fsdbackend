// routes/saleRoutes.js — ESM
import express from "express";
import {
  getAll,
  getOne,
  create,
  update,
  remove,
  createReturn,
  getNextInvoiceNo,
  getStats,
} from "../controllers/saleController.js";

const router = express.Router();

router.get("/next-invoice", getNextInvoiceNo);
router.get("/stats", getStats);
router.get("/", getAll);
router.get("/:id", getOne);
router.post("/", create);
router.post("/return", createReturn);
router.put("/:id", update);
router.delete("/:id", remove);

export default router;
