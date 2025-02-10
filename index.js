const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');


const authRoute = require('./Routes/AuthRoutes');

const notes = require('./Routes/NoteRoutes');

require('dotenv').config();
require('./Models/DB');

app.use(bodyParser.json());
// app.use(cors());
app.use(cors({ origin: "*" }));

// Auth Routes
app.use('/auth', authRoute);

// Notes Route
app.use('/', notes);

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});