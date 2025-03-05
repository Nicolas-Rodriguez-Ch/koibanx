import dotenv from 'dotenv';
dotenv.config();

export const PORT = process.env.PORT || 8000;
export const DB_URI = process.env.DATABASE_URI || '';
