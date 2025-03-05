import { DB_URI } from '../../constants/secrets';
import mongoose from 'mongoose';

const connectDB = () => {
  mongoose
    .connect(DB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    })
    .then(() => {
      console.log('Mongoose connected to database');
    })
    .catch((err) => {
      console.error('Failed to connect to database:', err);
    });

  mongoose.connection.on('error', (err) => {
    console.error('Mongoose connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.log('Mongoose disconnected from database');
  });

  process.on('SIGINT', async () => {
    await mongoose.disconnect();
    process.exit(0);
  });
};

export default connectDB;
