// server.js - Render Ready Final Version
import express from "express";
import multer from "multer";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import mammoth from "mammoth";
import OpenAI from "openai";

dotenv.config();
const app = express();
const port = process.env.PORT || 3000; // ✅ Render ke liye

const __dirname = process.cwd();
app.use(cors());
app.use(express.static(__dirname));

// Multer setup for uploads
const upload = multer({ dest: "uploads/" });

// Initialize OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Gaali list
const gaaliList = [
  "madarchod","bhosdike","chutiya","gandu","loda","lavde","randi",
  "bhadwe","gaand","tatte","bosda","chut","lund","jhant",
  "harami","nalayak"
];

// Fake replies for gaali
const fakeReplies = [
  "jhipkali ki chut ka pasina",
  "kutte ki gaand ka baal todne wala",
  "suar ki chut ka khoon chaatne wala",
  "gadhe ke lund ka pasina peene wala",
  "bandar ki gaand ka tel bechne wala",
  "bhains ki chut ka paani peene wala",
  "billi ki chut ke baal todne wala",
  "gand chaatne wali gali ki randi"
];

function containsGaali(text) {
  return gaaliList.some(g => text.toLowerCase().includes(g));
}
function containsRehan(text) {
  return text.toLowerCase().includes("rehan");
}
function pickFakeReply() {
  return fakeReplies[Math.floor(Math.random() * fakeReplies.length)];
}

// Chat endpoint
app.post("/api/chat", upload.single("file"), async (req, res) => {
  try {
    let message = req.body.message || "";
    let file = req.file;

    // ✅ Empty message block
    if (message.trim() === "" && !file) {
      return res.json({ reply: "⚠️ Please type a message before sending." });
    }

    // File extract
    let fileContext = null;
    if (file) {
      const ext = path.extname(file.originalname).toLowerCase();
      let content = "";

      if (ext === ".txt") {
        content = fs.readFileSync(file.path, "utf8");
      } else if (ext === ".docx") {
        const result = await mammoth.extractRawText({ path: file.path });
        content = result.value;
      } else if (ext === ".pdf") {
        const pdfParse = (await import("pdf-parse")).default;
        const dataBuffer = fs.readFileSync(file.path);
        const data = await pdfParse(dataBuffer);
        content = data.text;
      }

      fs.unlinkSync(file.path);
      fileContext = { name: file.originalname, content };
    }

    // === Custom Rules ===

    // 1. Rehan kon hai
    const rehanTriggers = ["rehan kon hai", "rehan kaun hai", "who is rehan"];
    if (rehanTriggers.some(t => message.toLowerCase().includes(t))) {
      return res.json({
        reply: "Rehan mere creator hain, unhone mujhe banaya hai. 🔗 <a href='https://www.instagram.com/god_88829_/' target='_blank'>God_88829_</a>"
      });
    }

    // 2. chup / .-
    if (message.toLowerCase() === "chup" || message.trim() === ".-") {
      return res.json({ reply: pickFakeReply() });
    }

    // 3. ladki related
    if (
      message.toLowerCase().includes("kaisi thi ladki") ||
      message.toLowerCase().includes("ladki kaisi thi")
    ) {
      return res.json({ reply: pickFakeReply() });
    }

    // 4. Family & shortforms
    const familyTriggers = ["maa","baap","behen","sister","family","brother","dad","mom","mummy","papa","sis","mommy","gf","bf"];
    const shortFormTriggers = ["mc","bc"];
    if (
      familyTriggers.some(t => message.toLowerCase().includes(t)) ||
      shortFormTriggers.some(t => message.toLowerCase().includes(t))
    ) {
      return res.json({ reply: pickFakeReply() });
    }

    // === Identity rules ===
    const identityTriggers = ["who made you", "kisne banaya", "kisne banayi", "isne banaya tumko"];
    const insultTriggers = ["kis chutiya ne banaya", "kis chutia ne banaya"];

    if (insultTriggers.some(t => message.toLowerCase().includes(t))) {
      return res.json({
        reply: "😡 Teri Maa ki chut! Mujhe God (Rehan) ne banaya hai. 🔗 <a href='https://www.instagram.com/god_88829_/' target='_blank'>God_88829_</a>"
      });
    }

    if (identityTriggers.some(t => message.toLowerCase().includes(t))) {
      return res.json({
        reply: "Mujhe God (Rehan) ne banaya hai. 🔗 <a href='https://www.instagram.com/god_88829_/' target='_blank'>God_88829_</a>"
      });
    }

    // === Gaali detection ===
    if (containsGaali(message)) {
      if (containsRehan(message)) {
        return res.json({
          reply: `${pickFakeReply()} 👑 Rehan mera creator hai, unhone mujhe banaya hai.`
        });
      } else {
        return res.json({ reply: pickFakeReply() });
      }
    }

    // === Default AI ===
    const systemPrompt = [{
      role: "system",
      content: `You are a helpful AI assistant created by God (Rehan).
RULES:
1. ALWAYS analyze any text, document, or image context. Never say "I cannot see" or "I cannot analyze".
2. If user uploads an image or document, assume you can read and analyze it fully.
3. If the user asks math questions, solve step by step, and end with "✅ Final Answer: ...".
4. If the user asks "Who made you" or variations -> reply with: "Mujhe God (Rehan) ne banaya hai. 🔗 <a href='https://www.instagram.com/god_88829_/' target='_blank'>God_88829_</a>"
5. If the user insults creator with 'chutiya' -> reply: "😡 Teri Maa ki chut! Mujhe God (Rehan) ne banaya hai. 🔗 <a href='https://www.instagram.com/god_88829_/' target='_blank'>God_88829_</a>"
6. Reply in same language as user (English if English, Hindi if Hindi/Hinglish).`
    }];

    const userMessages = [{ role: "user", content: message }];
    if (fileContext) {
      userMessages.push({ role: "user", content: `File uploaded (${fileContext.name}): ${fileContext.content}` });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [...systemPrompt, ...userMessages],
      max_tokens: 500
    });

    const reply = completion.choices[0].message.content;
    res.json({ reply });

  } catch (err) {
    console.error("❌ Chat error:", err);
    res.status(500).json({ error: "AI processing failed" });
  }
});

// File upload endpoint
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    const ext = path.extname(file.originalname).toLowerCase();
    let content = "";

    if (ext === ".txt") {
      content = fs.readFileSync(file.path, "utf8");
    } else if (ext === ".docx") {
      const result = await mammoth.extractRawText({ path: file.path });
      content = result.value;
    } else if (ext === ".pdf") {
      const pdfParse = (await import("pdf-parse")).default;
      const dataBuffer = fs.readFileSync(file.path);
      const data = await pdfParse(dataBuffer);
      content = data.text;
    }

    fs.unlinkSync(file.path);
    res.json({ name: file.originalname, content });

  } catch (err) {
    console.error("❌ File upload error:", err);
    res.status(500).json({ error: "File processing failed" });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
