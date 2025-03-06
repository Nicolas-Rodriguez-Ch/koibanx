import { Application } from 'express';
import healthCheck from './api/healthCheck';
import task from './api/task';

const routes = (app: Application): void => {
  app.use('/api/healthcheck', healthCheck);
  app.use('/api/tasks', task);
};

export default routes;
