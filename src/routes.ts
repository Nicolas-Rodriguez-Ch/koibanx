import { Application } from 'express';
import healthCheck from './api/healthCheck';

const routes = (app: Application): void => {
  app.use('/api/healthcheck', healthCheck);
};

export default routes;
