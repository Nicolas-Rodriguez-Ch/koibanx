import mongoose from 'mongoose';
import { Task, TaskStatus } from '../../src/database/models/taskModel';
import {
  queueJob,
  initializeJobProcessing,
} from '../../src/services/backgroundJobService';
import * as excelProcessingService from '../../src/services/excelProcessingService';

jest.mock('../../src/services/backgroundJobService', () => {
  const original = jest.requireActual(
    '../../src/services/backgroundJobService'
  );
  return {
    ...original,
    __esModule: true,
  };
});

jest.mock('../../src/database/models/taskModel', () => {
  const mockTask = {
    find: jest.fn(),
    findById: jest.fn(),
  };

  const TaskStatus = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    DONE: 'done',
  };

  return { Task: mockTask, TaskStatus };
});

jest.mock('../../src/services/excelProcessingService', () => ({
  processExcelFile: jest.fn(),
}));

describe('Background Service', () => {
  let consoleErrorSpy: jest.SpyInstance;
  let setIntervalSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    setIntervalSpy = jest
      .spyOn(global, 'setInterval')
      .mockImplementation((cb: any) => {
        cb();
        return 1 as unknown as NodeJS.Timeout;
      });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    if (setIntervalSpy) setIntervalSpy.mockRestore();
  });

  describe('queueJob', () => {
    it('should add a job to the queue and start processing', async () => {
      const processExcelFileMock = jest
        .spyOn(excelProcessingService, 'processExcelFile')
        .mockResolvedValue(undefined);

      await queueJob('test-task-id');

      expect(processExcelFileMock).toHaveBeenCalledWith('test-task-id');
    });

    it('should handle processing errors', async () => {
      const testError = new Error('Test processing error');
      jest
        .spyOn(excelProcessingService, 'processExcelFile')
        .mockRejectedValue(testError);

      const mockTask = {
        status: TaskStatus.PROCESSING,
        errors: [],
        save: jest.fn().mockResolvedValue(undefined),
        _id: 'test-task-id',
      };

      (Task.findById as jest.Mock).mockResolvedValue(mockTask);

      await queueJob('test-task-id');

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(console.error).toHaveBeenCalledWith(
        'Error processing task test-task-id:',
        testError
      );

      expect(mockTask.errors).toEqual([
        {
          row: 0,
          col: 0,
          message: 'Processing failed: Test processing error',
        },
      ]);
      expect(mockTask.save).toHaveBeenCalled();
    });

    it('should handle null taskId', async () => {
      jest.spyOn(Array.prototype, 'shift').mockReturnValueOnce(null);

      await queueJob('some-id');

      expect(excelProcessingService.processExcelFile).not.toHaveBeenCalled();
    });
  });

  describe('initializeJobProcessing', () => {
    it('should queue pending tasks', async () => {
      const mockPendingTasks = [
        { _id: new mongoose.Types.ObjectId('60d21b4667d0d8992e610c85') },
        { _id: new mongoose.Types.ObjectId('60d21b4667d0d8992e610c86') },
      ];

      (Task.find as jest.Mock).mockReturnValueOnce(mockPendingTasks);
      (Task.find as jest.Mock).mockReturnValueOnce([]);

      const processExcelFileMock = jest
        .spyOn(excelProcessingService, 'processExcelFile')
        .mockResolvedValue(undefined);

      try {
        await initializeJobProcessing();
      } catch (error) {}

      expect(Task.find).toHaveBeenCalledWith({ status: TaskStatus.PENDING });
    });

    it('should call find for stuck tasks', async () => {
      (Task.find as jest.Mock).mockReturnValueOnce([]);
      (Task.find as jest.Mock).mockReturnValueOnce([]);

      try {
        await initializeJobProcessing();
      } catch (error) {}

      expect(Task.find).toHaveBeenCalledWith({ status: TaskStatus.PENDING });
      expect(Task.find).toHaveBeenCalledWith({ status: TaskStatus.PROCESSING });
    });

    it('should reset and queue stuck tasks', async () => {
      const mockStuckTasks = [
        {
          _id: new mongoose.Types.ObjectId('60d21b4667d0d8992e610c87'),
          status: TaskStatus.PROCESSING,
          save: jest.fn().mockResolvedValue(undefined),
        },
      ];

      (Task.find as jest.Mock)
        .mockReturnValueOnce([])
        .mockReturnValueOnce(mockStuckTasks);

      try {
        await initializeJobProcessing();
      } catch (error) {
      }

      expect(mockStuckTasks[0].status).toBe(TaskStatus.PENDING);
      expect(mockStuckTasks[0].save).toHaveBeenCalled();
    });
  });
});
