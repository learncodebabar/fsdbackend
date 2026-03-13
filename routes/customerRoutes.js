import express from "express";
import {
  getAll,
  getOne,
  create,
  update,
  remove,
  getSaleHistory,
} from "../controllers/customerController.js";

const router = express.Router();

router.get("/", getAll);
router.get("/:id", getOne);
router.post("/", create);
router.put("/:id", update);
router.delete("/:id", remove);
router.get("/:id/sales", getSaleHistory);

export default router;
