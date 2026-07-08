const express = require("express");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const path = require("path");
const fs = require("fs");
ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();


app.set('view engine', 'ejs');

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

if (!fs.existsSync("output")) {
  fs.mkdirSync("output");
}

const upload = multer({
  dest: "uploads/"
});

app.get("/", (req, res) => {
  res.render('index')
});

app.post("/convert", upload.single("file"), (req, res) => {

  if (!req.file) {
    return res.status(400).json({
      error: "No file uploaded"
    });
  }

  const input = req.file.path;

  const fileName = `${Date.now()}.mp3`;

  const output = path.join(__dirname, "output", fileName);

  ffmpeg(input)
    .audioBitrate(192)
    .toFormat("mp3")
    .on("end", () => {

      fs.unlinkSync(input);

      res.json({
        success: true,
        file: fileName,
        download: `/download/${fileName}`
      });

    })
    .on("error", (err) => {

      console.error(err);

      if (fs.existsSync(input)) {
        fs.unlinkSync(input);
      }

      res.status(500).json({
        error: err.message
      });

    })
    .save(output);

});

app.get("/download/:file", (req, res) => {
  const fileName = req.params.file;
  const filePath = path.join(__dirname, "output", fileName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File not found");
  }

  res.download(filePath, fileName, (err) => {

    if (err) {
      console.log("Download error:", err);
      return;
    }

    // Delete file after download finishes
    fs.unlink(filePath, (deleteErr) => {
      if (deleteErr) {
        console.log("Delete error:", deleteErr);
      } else {
        console.log("Deleted:", fileName);
      }
    });

  });
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});