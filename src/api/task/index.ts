import { Request, Response, Router } from 'express';
import { upload } from '../../middleware/fileUploadService';
import { Task, TaskStatus } from '../../database/models/taskModel';
import { queueProcessingTask } from '../../services/excelProcessingService';
import { ProcessedData } from '../../database/models/processDataModel';
import {
  requireReadPermission,
  requireWritePermission,
} from '../../middleware/apiPermissionMiddleware';

const router = Router();

router.post(
  '/upload',
  requireWritePermission,
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ message: 'No file uploaded' });
        return;
      }
      const mappingFormat = req.body.mappingFormat || 'default';

      const task = await Task.create({
        originalFileName: req.file?.filename,
        mappingFormat,
        status: TaskStatus.PENDING,
      });
      queueProcessingTask(task._id.toString());

      res.status(201).json({
        taskId: task._id,
        message: 'File uploaded successfully and queued for processing',
      });
      return;
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({ message: 'Error uploading file' });
      return;
    }
  }
);

router.get(
  '/:taskId/status',
  requireReadPermission,
  async (req: Request, res: Response) => {
    try {
      const taskId = req.params.taskId;
      if (!taskId) {
        res.status(400).json({ message: 'No task id provided' });
        return;
      }

      const task = await Task.findById(taskId).exec();
      if (!task) {
        res.status(404).json({ message: 'Task not found' });
        return;
      }

      res.status(200).json({
        status: task.status,
        totalRows: task.totalRows,
        processedRows: task.processedRows,
        errors: task.errors.length,
      });
      return;
    } catch (error) {
      console.error('Error getting task status:', error);
      res.status(500).json({ message: 'Error getting task status' });
      return;
    }
  }
);

router.get(
  '/:taskId/errors',
  requireReadPermission,
  async (req: Request, res: Response) => {
    try {
      const taskId = req.params.taskId;
      if (!taskId) {
        res.status(400).json({ message: 'No task id provided' });
        return;
      }
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const skip = (page - 1) * limit;

      const task = await Task.findById(taskId).exec();
      if (!task) {
        res.status(404).json({ message: 'Task not found' });
        return;
      }
      const totalErrors = task.errors.length;
      const errors = task.errors.slice(skip, skip + limit);

      res.status(200).json({
        errors,
        pagination: {
          total: totalErrors,
          page,
          limit,
          pages: Math.ceil(totalErrors / limit),
        },
      });
      return;
    } catch (error) {
      console.error('Error getting task errors:', error);
      res.status(500).json({ message: 'Error getting task errors' });
      return;
    }
  }
);

router.get(
  '/:taskId/data',
  requireReadPermission,
  async (req: Request, res: Response) => {
    try {
      const taskId = req.params.taskId;
      if (!taskId) {
        res.status(400).json({ message: 'No task id provided' });
        return;
      }
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const skip = (page - 1) * limit;

      const task = await Task.findById(taskId).exec();

      if (!task) {
        res.status(404).json({ message: 'Task not found' });
        return;
      }

      if (task.status !== TaskStatus.DONE) {
        res.status(400).json({
          message: 'Task processing is not complete',
          status: task.status,
        });
        return;
      }

      const processedData = await ProcessedData.findOne({ taskId: task._id });

      if (!processedData) {
        res.status(404).json({ message: 'Processed data not found' });
        return;
      }

      const totalItems = processedData.data.length;
      const data = processedData.data.slice(skip, skip + limit);

      res.status(200).json({
        data,
        pagination: {
          total: totalItems,
          page,
          limit,
          pages: Math.ceil(totalItems / limit),
        },
      });
      return;
    } catch (error) {
      console.error('Error getting processed data:', error);
      res.status(500).json({ message: 'Error getting processed data' });
      return;
    }
  }
);

export default router;
