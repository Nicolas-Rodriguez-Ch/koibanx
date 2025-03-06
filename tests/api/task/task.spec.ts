import mongoose from 'mongoose';
import request from 'supertest';
import express, { NextFunction, Request, Response } from 'express';
import { Task, TaskStatus } from '../../../src/database/models/taskModel';
import { ProcessedData } from '../../../src/database/models/processDataModel';
import taskRoutes from '../../../src/api/task';
import { queueProcessingTask } from '../../../src/services/excelProcessingService';
import { Readable } from 'stream';

jest.mock('../../../src/api/middleware/fileUploadService', () => ({
  upload: {
    single: jest
      .fn()
      .mockImplementation(
        () => (req: Request, res: Response, next: NextFunction) => {
          const buffer = Buffer.from('test');
          req.file = {
            fieldname: 'file',
            originalname: 'test-file.xlsx',
            encoding: '7bit',
            mimetype:
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            size: 1024,
            destination: '/tmp',
            filename: 'test-file.xlsx',
            path: '/tmp/test-file.xlsx',
            buffer: buffer,
            stream: Readable.from(buffer),
          } as any;
          next();
        }
      ),
  },
}));

jest.mock('../../../src/services/excelProcessingService', () => ({
  queueProcessingTask: jest.fn(),
}));

describe('Task API Routes', () => {
  let app: express.Application;

  beforeAll(async () => {
    await mongoose.connect(
      process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/test-db'
    );

    app = express();
    app.use(express.json());
    app.use('/api/task', taskRoutes);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Task.deleteMany({});
    await ProcessedData.deleteMany({});
    jest.clearAllMocks();
  });

  describe('POST /upload', () => {
    it('should return 400 if no file is uploaded', async () => {
      jest.resetModules();

      jest.doMock(
        '../../../src/api/middleware/fileUploadService',
        () => ({
          upload: {
            single: jest
              .fn()
              .mockReturnValue(
                (req: Request, res: Response, next: NextFunction) => {
                  next();
                }
              ),
          },
        }),
        { virtual: true }
      );

      jest.resetModules();
      const freshTaskRoutes = require('../../../src/api/task').default;

      const testApp = express();
      testApp.use(express.json());
      testApp.use('/api/task', freshTaskRoutes);

      const response = await request(testApp)
        .post('/api/task/upload')
        .field('mappingFormat', 'default');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('No file uploaded');
    });

    it('should create a new task and queue processing', async () => {
      const response = await request(app)
        .post('/api/task/upload')
        .field('mappingFormat', 'default')
        .attach('file', Buffer.from('test'), 'test-file.xlsx');

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('taskId');
      expect(response.body.message).toContain('File uploaded successfully');

      const task = await Task.findById(response.body.taskId);
      expect(task).toBeTruthy();
      expect(task?.status).toBe(TaskStatus.PENDING);

      expect(queueProcessingTask).toHaveBeenCalledWith(expect.any(String));
    });

    it('should handle server errors during upload', async () => {
      const originalCreate = Task.create;
      Task.create = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/task/upload')
        .field('mappingFormat', 'default')
        .attach('file', Buffer.from('test'), 'test-file.xlsx');

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Error uploading file');

      Task.create = originalCreate;
    });
  });

  describe('GET /:taskId/status', () => {
    it('should return task status', async () => {
      const task = await Task.create({
        originalFileName: 'test-file.xlsx',
        mappingFormat: 'default',
        status: TaskStatus.PROCESSING,
        totalRows: 100,
        processedRows: 50,
        errors: [{ row: 1, col: 2 }],
      });

      const response = await request(app).get(`/api/task/${task._id}/status`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: TaskStatus.PROCESSING,
        totalRows: 100,
        processedRows: 50,
        errors: 1,
      });
    });

    it('should handle empty taskId parameter', async () => {
      const response = await request(app).get('/api/task/undefined/status');

      expect(response.status).toBe(500);
    });

    it('should return 404 if task is not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app).get(
        `/api/task/${nonExistentId}/status`
      );

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Task not found');
    });

    it('should handle server errors when getting status', async () => {
      const task = await Task.create({
        originalFileName: 'test-file.xlsx',
        mappingFormat: 'default',
        status: TaskStatus.PROCESSING,
      });

      const originalExec = mongoose.Query.prototype.exec;
      mongoose.Query.prototype.exec = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      const response = await request(app).get(`/api/task/${task._id}/status`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Error getting task status');

      mongoose.Query.prototype.exec = originalExec;
    });
  });

  describe('GET /:taskId/errors', () => {
    it('should return paginated errors', async () => {
      const errors = Array.from({ length: 25 }, (_, i) => ({
        row: i + 1,
        col: 2,
        message: `Error ${i + 1}`,
      }));

      const task = await Task.create({
        originalFileName: 'test-file.xlsx',
        mappingFormat: 'default',
        status: TaskStatus.DONE,
        errors,
      });

      const response = await request(app).get(
        `/api/task/${task._id}/errors?page=2&limit=10`
      );

      expect(response.status).toBe(200);
      expect(response.body.errors.length).toBe(10);
      expect(response.body.pagination).toEqual({
        total: 25,
        page: 2,
        limit: 10,
        pages: 3,
      });
    });

    it('should handle empty taskId parameter', async () => {
      const response = await request(app).get('/api/task/undefined/errors');

      expect(response.status).toBe(500);
    });

    it('should return 404 if task is not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app).get(
        `/api/task/${nonExistentId}/errors`
      );

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Task not found');
    });

    it('should handle server errors when getting errors', async () => {
      const task = await Task.create({
        originalFileName: 'test-file.xlsx',
        mappingFormat: 'default',
        status: TaskStatus.DONE,
      });

      const originalExec = mongoose.Query.prototype.exec;
      mongoose.Query.prototype.exec = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      const response = await request(app).get(`/api/task/${task._id}/errors`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Error getting task errors');

      mongoose.Query.prototype.exec = originalExec;
    });
  });

  describe('GET /:taskId/data', () => {
    it('should return paginated processed data', async () => {
      const task = await Task.create({
        originalFileName: 'test-file.xlsx',
        mappingFormat: 'default',
        status: TaskStatus.DONE,
      });

      const sampleData = Array.from({ length: 25 }, (_, i) => ({
        name: `Test ${i + 1}`,
        age: 30 + i,
        nums: [1, 2, 3],
      }));

      await ProcessedData.create({
        taskId: task._id,
        data: sampleData,
      });

      const response = await request(app).get(
        `/api/task/${task._id}/data?page=2&limit=10`
      );

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(10);
      expect(response.body.pagination).toEqual({
        total: 25,
        page: 2,
        limit: 10,
        pages: 3,
      });
    });

    it('should handle empty taskId parameter', async () => {
      const response = await request(app).get('/api/task/undefined/data');

      expect(response.status).toBe(500);
    });

    it('should return 404 if task is not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app).get(
        `/api/task/${nonExistentId}/data`
      );

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Task not found');
    });

    it('should return 400 if task is not complete', async () => {
      const task = await Task.create({
        originalFileName: 'test-file.xlsx',
        mappingFormat: 'default',
        status: TaskStatus.PROCESSING,
      });

      const response = await request(app).get(`/api/task/${task._id}/data`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain(
        'Task processing is not complete'
      );
    });

    it('should return 404 if processed data is not found', async () => {
      const task = await Task.create({
        originalFileName: 'test-file.xlsx',
        mappingFormat: 'default',
        status: TaskStatus.DONE,
      });

      const response = await request(app).get(`/api/task/${task._id}/data`);

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Processed data not found');
    });

    it('should handle server errors when getting data', async () => {
      const task = await Task.create({
        originalFileName: 'test-file.xlsx',
        mappingFormat: 'default',
        status: TaskStatus.DONE,
      });

      const originalExec = mongoose.Query.prototype.exec;
      mongoose.Query.prototype.exec = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      const response = await request(app).get(`/api/task/${task._id}/data`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Error getting processed data');

      mongoose.Query.prototype.exec = originalExec;
    });
  });
});
