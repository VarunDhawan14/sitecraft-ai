import { Router } from "express";
import { sendContactMessage } from "../controllers/contactController.js";

const contactRouter = Router();

contactRouter.post("/", sendContactMessage);

export default contactRouter;
