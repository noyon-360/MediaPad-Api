const Note = require("../Models/Note");
const { interpretCommand } = require("./gemini");

const addNote = async (title, content, req) => {
  console.log('Adding note:', title, content);
  try {
    const note = new Note({ title, content, user: req.user.id });
    await note.save();
    return "Note added successfully.";
  } catch (err) {
    return "Error adding note: " + err.message;
  }
};

const deleteNote = async (title) => {
  try {
    const result = await Note.deleteOne({ title });
    if (result.deletedCount > 0) {
      return "Note deleted successfully.";
    } else {
      return "Note not found.";
    }
  } catch (err) {
    return "Error deleting note: " + err.message;
  }
};

const searchNote = async (title) => {
  try {
    const note = await Note.findOne({ title });
    if (note) {
      return note.content;
    } else {
      return "Note not found.";
    }
  } catch (err) {
    return "Error searching note: " + err.message;
  }
};

const updateNote = async (title, newContent) => {
  try {
    const result = await Note.updateOne({ title }, { content: newContent });
    if (result.modifiedCount > 0) {
      return "Note updated successfully.";
    } else {
      return "Note not found.";
    }
  } catch (err) {
    return "Error updating note: " + err.message;
  }
};

const aiAgent = async (command, req, userResponse = null) => {
  try {
    // Interpret the command
    const interpretation = await interpretCommand(command);

    // Log the interpretation for debugging
    console.log('Interpretation:', interpretation);

    // Check if interpretation is valid
    if (!interpretation) {
      return { response: 'Failed to interpret command.' };
    }

    // Extract action and parameters
    if (interpretation.startsWith('add')) {
      const titleMatch = interpretation.match(/title: "([^"]+)"/);
      const contentMatch = interpretation.match(/content: "([^"]+)"/);

      if (!titleMatch || !contentMatch) {
        return { response: 'Invalid format for adding a note. Please specify title and content.' };
      }

      const title = titleMatch[1];
      const content = contentMatch[1];

      // Check if user has confirmed
      if (userResponse === null) {
        return { response: `Are you sure you want to add a note with title: "${title}" and content: "${content}"? (yes/no)` };
      } else if (userResponse.toLowerCase() === 'yes') {
        // Call addNote with the mock req object
        const result = await addNote(title, content, req);
        return { response: result };
      } else {
        return { response: 'Note addition cancelled.' };
      }
    } else if (interpretation.startsWith('delete')) {
      const titleMatch = interpretation.match(/title: "([^"]+)"/);

      if (!titleMatch) {
        return { response: 'Invalid format for deleting a note. Please specify a title.' };
      }

      const title = titleMatch[1];

      // Check if user has confirmed
      if (userResponse === null) {
        return { response: `Are you sure you want to delete the note with title: "${title}"? (yes/no)` };
      } else if (userResponse.toLowerCase() === 'yes') {
        // Delete the note
        const result = await deleteNote(title);
        return { response: result };
      } else {
        return { response: 'Note deletion cancelled.' };
      }
    } else if (interpretation.startsWith('search')) {
      const titleMatch = interpretation.match(/title: "([^"]+)"/);

      if (!titleMatch) {
        return { response: 'Invalid format for searching a note. Please specify a title.' };
      }

      const title = titleMatch[1];

      // Search for the note
      const result = await searchNote(title);
      return { response: result };
    } else if (interpretation.startsWith('update')) {
      const titleMatch = interpretation.match(/title: "([^"]+)"/);
      const contentMatch = interpretation.match(/content: "([^"]+)"/);

      if (!titleMatch || !contentMatch) {
        return { response: 'Invalid format for updating a note. Please specify title and new content.' };
      }

      const title = titleMatch[1];
      const newContent = contentMatch[1];

      // Update the note
      const result = await updateNote(title, newContent);
      return { response: result };
    } else {
      return { response: 'Command not recognized.' };
    }
  } catch (error) {
    console.error('Error in aiAgent:', error);
    return { response: 'An error occurred while processing the command.' };
  }
};

module.exports = aiAgent;