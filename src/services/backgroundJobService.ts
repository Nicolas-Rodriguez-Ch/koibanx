import { Task, TaskStatus } from '../database/models/taskModel';
import { processExcelFile } from './excelProcessingService';

const jobQueue: string[] = [];
let isProcessing = false;

const processNextJob = async (): Promise<void> => {
  if (jobQueue.length === 0 || isProcessing) {
    return;
  }

  isProcessing = true;
  const taskId = jobQueue.shift();
  if (!taskId) {
    return;
  }
  try {
    await processExcelFile(taskId);
  } catch (error: any) {
    console.error(`Error processing task ${taskId}:`, error);
    try {
      const task = await Task.findById(taskId);
      if (task) {
        task.status = TaskStatus.DONE;
        task.errors.push({
          row: 0,
          col: 0,
          message: `Processing failed: ${error.message}`,
        });
        await task.save();
      }
    } catch (dbError) {
      console.error('Error updating task status:', dbError);
    }
  } finally {
    isProcessing = false;
    processNextJob();
  }
};

export const queueJob = async (taskId: string): Promise<void> => {
  jobQueue.push(taskId);

  if (!isProcessing) {
    processNextJob();
  }
};

export const initializeJobProcessing = async (): Promise<void> => {
  const pendingTasks = await Task.find({ status: TaskStatus.PENDING });

  pendingTasks.forEach((task) => {
    jobQueue.push(task._id.toString());
  });

  if (pendingTasks.length > 0 && !isProcessing) {
    processNextJob();
  }

  const stuckTasks = await Task.find({ status: TaskStatus.PROCESSING });

  for (const task of stuckTasks) {
    task.status = TaskStatus.PENDING;
    await task.save();
    jobQueue.push(task._id.toString());
  }
};

export const startJobWorker = (): void => {
  initializeJobProcessing().catch((err) => {
    console.error('Error initializing job processing:', err);
  });

  setInterval(() => {
    initializeJobProcessing().catch((err) => {
      console.error('Error in job processing cycle:', err);
    });
  }, 60000);
};
