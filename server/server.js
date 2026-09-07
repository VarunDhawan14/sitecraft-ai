import express from "express";
import "dotenv/config";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectToDatabase } from "./config/db.js";
import authRouter from "./routes/authRoutes.js";
import projectRouter from "./routes/projectRoutes.js";
import contactRouter from "./routes/contactRoutes.js";

const app = express();

await connectToDatabase();

// Middleware
app.use(
  cors({
    origin: process.env.ORIGINS || "http://localhost:5173",
    credentials: true,
  }),
);

app.use(cookieParser());
app.use(express.json());

// Routes
app.get("/", (req, res) => {
  res.send("Server is Live");
});

app.use("/api/auth", authRouter);
app.use("/api/projects", projectRouter);
app.use("/api/contact", contactRouter);

// Centralized error handler
app.use((err, _req, res, _next) => {
  console.log(`[Error] ${err.message}`);

  res.status(500).json({
    error: err.message,
  });
});

const port = process.env.PORT || 3000;

if (process.env.NODE_ENV !== "production") {
  app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
  });
}

export default app;
