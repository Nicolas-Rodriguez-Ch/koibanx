import * as XLSX from 'xlsx';
import { Task, TaskStatus, IError } from '../database/models/taskModel';
import { ProcessedData } from '../database/models/processDataModel';
import { getMappingStrategy } from './mappingStrategy';
import fs from 'fs';
import path from 'path';

export const processExcelFile = async (taskId: string): Promise<void> => {
  const task = await Task.findById(taskId).exec();

  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }

  try {
    task.status = TaskStatus.PROCESSING;
    await task.save();

    const pathFile = path.join(
      __dirname,
      '../../uploads',
      task.originalFileName
    );

    const woorkbook = XLSX.readFile(pathFile, {
      cellDates: true,
      cellNF: true,
      cellText: true,
    });

    const sheetName = woorkbook.SheetNames[0];
    const worksheet = woorkbook.Sheets[sheetName];

    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    const rows = data.slice(1).filter((row) => {
      return (
        row.length > 0 &&
        row.some(
          (cell) =>
            cell !== null && cell !== undefined && String(cell).trim() !== ''
        )
      );
    });
    task.totalRows = rows.length;
    await task.save();

    const mappingStrategy = getMappingStrategy(task.mappingFormat);

    const chunkSize = 1000;
    const processedData: any[] = [];
    const errors: IError[] = [];

    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      chunk.forEach((row, index) => {
        const rowIndex = i + index + 2;
        const validation = mappingStrategy.validate(row);

        if (validation.valid) {
          try {
            const mappedData = mappingStrategy.map(row);
            processedData.push(mappedData);
          } catch (error) {
            errors.push({
              row: rowIndex,
              col: 0,
              message: 'Failed to map data',
            });
          }
        } else {
          validation.errors.forEach((error) => {
            errors.push({
              row: rowIndex,
              col: error.col,
              message: 'Validation failed',
            });
          });
        }
      });
      task.processedRows = i + chunk.length;
      await task.save();
    }
    await ProcessedData.create({
      taskId: task._id,
      data: processedData,
    });

    errors.forEach((error) => {
      (task.errors as IError[]).push(error);
    });
    task.status = TaskStatus.DONE;
    await task.save();

    fs.unlinkSync(pathFile);
  } catch (error: any) {
    console.error('Error processing Excel file:', error);
    task.status = TaskStatus.DONE;
    task.errors.push({
      row: 0,
      col: 0,
      message: `Processing failed: ${error.message}`,
    });
    await task.save();

    throw error;
  }
};

export const queueProcessingTask = async (taskId: string): Promise<void> => {
  setTimeout(() => {
    processExcelFile(taskId).catch((err) => {
      console.error(`Error processing task ${taskId}:`, err);
    });
  }, 0);
};
