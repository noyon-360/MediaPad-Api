const NoteModel = require("../Models/Note");
const { MongoClient, ObjectId } = require("mongodb");
const mongoose = require("mongoose");

let bucket; // Declare bucket variable

// Initialize GridFS after connection is open
mongoose.connection.once("open", () => {
  const db = mongoose.connection.db;
  bucket = new mongoose.mongo.GridFSBucket(db, {
    bucketName: "files",
  });
  console.log("GridFS bucket initialized");
});

// Get the Notes
const getNotes = async (req, res) => {
  try {
    const notes = await NoteModel.find({ user: req.user.id });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// Add the note
const addNote = async (req, res) => {
  const { title, content } = req.body;

  try {
    const note = new NoteModel({ title, content, user: req.user.id });
    // await note.save();

   // Check if files are uploaded
   if (req.files && req.files.length > 0) {
    // Initialize files array
    note.files = [];

    // Process each file
    for (const file of req.files) {
      const uploadStream = bucket.openUploadStream(file.originalname, {
        metadata: { noteId: note._id },
      });
      uploadStream.end(file.buffer, async () => {
        note.files.push({
          fileId: uploadStream.id,
          fileName: file.originalname,
          fileType: file.mimetype,
        });

        // Save the note after all files are processed
        if (req.files.indexOf(file) === req.files.length - 1) {
          await note.save();
          res.status(201).json(note);
        }
      });
    }
  } else {
    // If no files are uploaded, just save the note
    await note.save();
    res.status(201).json(note);
  }
  } catch (error) {
    res.status(500).json({ message: "Invalid note data" });
  }
};

// Edit a note
const editNote = async (req, res) => {
  const { title, content } = req.body;

  try {
    const note = await NoteModel.findOne({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!note) return res.status(404).json({ message: "Note not found" });

    note.title = title || note.title;
    note.content = content || note.content;

    await note.save();
    res.json(note);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Delete a note (updated)
const deleteNote = async (req, res) => {
  try {
    const note = await NoteModel.findOne({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!note) return res.status(404).json({ message: "Note not found" });

    // Check if bucket is initialized
    if (!bucket) {
      return res.status(500).json({ message: "GridFS bucket not ready" });
    }

    // Delete files from GridFS (corrected "file" → "files")
    note.files.forEach(async (file) => {
      await bucket.delete(new mongoose.Types.ObjectId(file.fileId)); // Use Mongoose ObjectId
    });

    await note.deleteOne();
    res.json({ message: "Note deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Upload a file (updated)
const uploadFile = async (req, res) => {
  const { noteId } = req.body;
  try {
    const note = await NoteModel.findOne({ _id: noteId, user: req.user.id });
    if (!note) return res.status(404).json({ message: "Note not found" });

    // Check if bucket is initialized
    if (!bucket) {
      return res.status(500).json({ message: "GridFS bucket not ready" });
    }

    const uploadStream = bucket.openUploadStream(req.file.originalname, {
      metadata: { noteId },
    });

    console.log(uploadStream.id);

    // uploadFile function (updated)
    uploadStream.end(req.file.buffer, async () => {
      // Initialize files array if undefined
      if (!note.files) note.files = [];

      note.files.push({
        fileId: uploadStream.id,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
      });

      await note.save();
      res.json(note);
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Get a file (updated)
const getFile = async (req, res) => {
  try {
    const fileId = new mongoose.Types.ObjectId(req.params.fileId);
    const downloadStream = bucket.openDownloadStream(fileId);

    // Set headers for file type and download
    downloadStream.on("file", (file) => {
      res.set("Content-Type", file.contentType);
      res.set("Content-Disposition", `inline; filename="${file.filename}"`);
    });

    downloadStream.pipe(res);
  } catch (error) {
    res.status(404).json({ message: "File not found" });
  }
};

module.exports = {
  getNotes,
  addNote,
  editNote,
  deleteNote,
  uploadFile,
  getFile,
};
