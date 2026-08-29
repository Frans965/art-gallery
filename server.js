require('dotenv').config();

const express = require('express');
const path = require('path');
const connectDB = require('./src/config/db');
const artRoutes = require('./src/routes/artRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

connectDB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/artworks', artRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
