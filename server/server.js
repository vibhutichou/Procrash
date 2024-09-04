import express from "express";
import dotenv from "dotenv";
import connectDB  from "./db/config.js";
import authRoute from "./auth/route.js";
import controllerRoute from "./controller/route.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser"
import Tesseract from "tesseract.js/src/index.js";

import { requireAuth } from "./middleware/auth.js";

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));


dotenv.config();
connectDB();


app.get("/", requireAuth, (req, res) => {
  res.status(200).json({ message: "Welcome to the homepage" });
});


app.post('/ocr', async (req, res) => {
  try {
    const imageData = req.body.imageData;
    const buffer = Buffer.from(imageData.replace(/^data:image\/\w+;base64,/, ''), 'base64');  // Parse base64 data
    // Perform OCR using Tesseract.js
    const { data: { text } } = await Tesseract.recognize(buffer, 'eng');
    res.json({ text });
  } catch (error) {
    console.error('Error performing OCR:', error);
    res.status(500).json({ error: 'Error performing OCR' });
  }
});

const server = app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});

app.use("/api/v1", authRoute);
app.use("/api/v1", controllerRoute);

process.on("unhandledRejection", err => {
  console.log(`An error occurred: ${err.message}`)
  server.close(() => process.exit(1))
});
