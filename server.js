const express = require("express");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const path = require("path");
const fs = require("fs");

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.set("view engine", "ejs");

["uploads", "output"].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
});

const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 50 * 1024 * 1024 // 50 MB
  }
});

app.get("/", (req, res) => {
  res.render("index");
});

app.post("/convert", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const input = req.file.path;
  const fileName = `${Date.now()}.mp3`;
  const output = path.join(__dirname, "output", fileName);

  ffmpeg(input)
    .audioBitrate(192)
    .format("mp3")
    .on("end", () => {
      fs.unlink(input, () => {});

      res.json({
        success: true,
        download: `/download/${fileName}`
      });
    })
    .on("error", (err) => {
      console.error(err);

      fs.unlink(input, () => {});

      res.status(500).json({
        error: err.message
      });
    })
    .save(output);
});

app.get("/download/:file", (req, res) => {
  const filePath = path.join(__dirname, "output", req.params.file);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File not found");
  }

  res.download(filePath, req.params.file, () => {
    fs.unlink(filePath, () => {});
  });
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }

  res.status(500).json({
    success: false,
    error: err.message
  });
});

module.exports = app;