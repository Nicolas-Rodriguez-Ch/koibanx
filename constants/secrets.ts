import dotenv from 'dotenv';
dotenv.config();

export const PORT = process.env.PORT || 8000;
export const DB_URI = process.env.DATABASE_URI || '';
export const READ_API_KEY = process.env.READ_API_KEY || '';
export const ADMIN_API_KEY = process.env.ADMIN_API_KEY || '';
