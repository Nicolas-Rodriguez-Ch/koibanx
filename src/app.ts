import { PORT } from '../constants/secrets';
import configExpress from './config/express';
import connectDB from './database/db';
import express, { Express } from 'express';
import routes from './routes';

const app: Express = express();

const port = PORT;

configExpress(app);

routes(app);

app.listen(port, () => {
  connectDB();
  console.log(`Server is running on port ${port}`);
});
