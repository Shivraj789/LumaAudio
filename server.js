const express =require("express");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const path = require("path");
const fs = require("fs");

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();

app.set("view engine", "ejs");

const uploadDir = path.join("/tmp", "uploads");
const outputDir = path.join("/tmp", "output");

// Create folders safely
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}


// Multer upload
const upload = multer({
    dest: uploadDir
});


// Home page
app.get("/", (req, res) => {
    res.render("index");
});


// Convert video to mp3
app.post("/convert", upload.single("file"), (req, res) => {

    if (!req.file) {
        return res.status(400).send("No file uploaded");
    }


    const input = req.file.path;

    const fileName = `${Date.now()}.mp3`;

    const output = path.join(
        outputDir,
        fileName
    );


    ffmpeg(input)
        .audioCodec("libmp3lame")
        .audioBitrate(192)
        .format("mp3")

        .on("end", () => {

            // remove uploaded video
            if (fs.existsSync(input)) {
                fs.unlinkSync(input);
            }


            // direct download
            res.download(
                output,
                fileName,
                (err) => {

                    if (err) {
                        console.log(
                            "Download error:",
                            err
                        );
                    }


                    // delete mp3 after download
                    if (fs.existsSync(output)) {

                        fs.unlink(
                            output,
                            () => {
                                console.log(
                                    "Deleted:",
                                    fileName
                                );
                            }
                        );

                    }

                }
            );

        })


        .on("error", (err) => {

            console.log(
                "FFmpeg error:",
                err
            );


            if (fs.existsSync(input)) {
                fs.unlinkSync(input);
            }


            res.status(500).send(
                "Conversion failed"
            );

        })


        .save(output);

});



// Error handler
app.use((err, req, res, next) => {

    console.log(err);

    res.status(500).send(
        "Server error"
    );

});



// Start server
module.exports = app