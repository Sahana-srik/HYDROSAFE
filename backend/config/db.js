const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.warn('[MongoDB Warning] MONGO_URI is missing in environment configuration (.env). MongoDB features will require valid credentials.');
    return;
  }

  try {
    const conn = await mongoose.connect(mongoUri);
    console.log(`[MongoDB] Successfully connected to host: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[MongoDB Error] Connection failed: ${error.message}`);
  }
};

module.exports = connectDB;

