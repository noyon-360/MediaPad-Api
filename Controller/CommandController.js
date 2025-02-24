// const NoteModel = require("../Models/Note");
// const aiAgent = require("../AI/aiAgent");

// const command = async (req, res) => {
//   const { command } = req.body;
//   if (!command) {
//     return res.status(400).json({ error: "Command is required." });
//   }
//   const response = await aiAgent(command, req);
//   res.json({ response });
// };

// module.exports = {
//   command,
// };


const aiAgent = require("../AI/aiAgent");

// In-memory storage for user states (for demonstration purposes)
// In a real application, use a database or session management system.
const userStates = {};

const command = async (req, res) => {
  const { command, userResponse } = req.body;

  if (!command) {
    return res.status(400).json({ error: "Command is required." });
  }

//   userId == req.user.id

//   if (!userId) {
//     return res.status(400).json({ error: "User ID is required." });
//   }

  try {
    // Check if the user is in a confirmation state
    const userState = userStates[req.user.id];

    let response;
    if (userState && userState.isWaitingForConfirmation) {
      // If the user is in a confirmation state, pass their response to aiAgent
      response = await aiAgent(userState.lastCommand, req, userResponse);

      // Clear the confirmation state after processing
      delete userStates[req.user.id];
    } else {
      // If not in a confirmation state, process the command normally
      response = await aiAgent(command, req);

      // If the response indicates a confirmation is needed, store the state
      if (response.response.includes("Are you sure")) {
        userStates[req.user.id] = {
          isWaitingForConfirmation: true,
          lastCommand: command,
        };
      }
    }

    // Send the response back to the user
    res.json({ response: response.response });
  } catch (error) {
    console.error("Error in command handler:", error);
    res.status(500).json({ error: "An error occurred while processing the command." });
  }
};

module.exports = {
  command,
};