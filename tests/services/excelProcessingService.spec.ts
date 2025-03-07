import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { Task, TaskStatus, IError } from '../../src/database/models/taskModel';
import { ProcessedData } from '../../src/database/models/processDataModel';
import { processExcelFile, queueProcessingTask } from '../../src/services/excelProcessingService';
import { getMappingStrategy } from '../../src/services/mappingStrategy';

jest.mock('xlsx');
jest.mock('fs');
jest.mock('path');
jest.mock('../../src/database/models/taskModel');
jest.mock('../../src/database/models/processDataModel');
jest.mock('../../src/services/mappingStrategy');

interface ValidationError {
  col: number;
  message?: string;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

describe('Excel Processing Service', () => {
  const mockTaskId = new mongoose.Types.ObjectId().toString();
  const mockTask = {
    _id: mockTaskId,
    originalFileName: 'test.xlsx',
    mappingFormat: 'default',
    status: TaskStatus.PENDING,
    totalRows: 0,
    processedRows: 0,
    errors: [] as IError[],
    save: jest.fn().mockResolvedValue(true)
  };
  
  const mockSheetData = [
    ['Name', 'Age', 'Nums'],
    ['John', 30, '1,2,3,4,5'],
    ['Jane', 25, '6,7,8,9,10'],
    ['Invalid', 'not-a-number', 'invalid-nums']
  ];
  
  const mockMappingStrategy = {
    map: jest.fn((row) => ({
      name: row[0],
      age: Number(row[1]),
      nums: row[2].split(',').map(Number).sort((a: number, b: number) => a - b)
    })),
    validate: jest.fn((row): ValidationResult => {
      const errors: ValidationError[] = [];
      
      if (isNaN(Number(row[1]))) {
        errors.push({ col: 1, message: 'Invalid age' });
      }
      
      return {
        valid: errors.length === 0,
        errors
      };
    })
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    (Task.findById as jest.Mock).mockImplementation(() => ({
      exec: jest.fn().mockResolvedValue(mockTask)
    }));
    
    (path.join as jest.Mock).mockReturnValue('/mocked/path/test.xlsx');
    
    (XLSX.readFile as jest.Mock).mockReturnValue({
      SheetNames: ['Sheet1'],
      Sheets: {
        Sheet1: {}
      }
    });
    
    (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockSheetData);
    
    (getMappingStrategy as jest.Mock).mockReturnValue(mockMappingStrategy);
    
    (ProcessedData.create as jest.Mock).mockResolvedValue({});
    
    (fs.unlinkSync as jest.Mock).mockReturnValue(undefined);
  });

  describe('processExcelFile', () => {
    it('should throw an error if task is not found', async () => {
      (Task.findById as jest.Mock).mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(null)
      }));
      
      await expect(processExcelFile(mockTaskId)).rejects.toThrow(
        `Task not found: ${mockTaskId}`
      );
    });

    it('should read the Excel file correctly', async () => {
      await processExcelFile(mockTaskId);
      
      expect(XLSX.readFile).toHaveBeenCalledWith('/mocked/path/test.xlsx', {
        cellDates: true,
        cellNF: true,
        cellText: true
      });
      
      expect(XLSX.utils.sheet_to_json).toHaveBeenCalled();
    });

    it('should process valid rows correctly', async () => {
      await processExcelFile(mockTaskId);
      
      expect(mockMappingStrategy.validate).toHaveBeenCalledTimes(3);
      
      expect(mockMappingStrategy.map).toHaveBeenCalledWith(['John', 30, '1,2,3,4,5']);
      expect(mockMappingStrategy.map).toHaveBeenCalledWith(['Jane', 25, '6,7,8,9,10']);
      
      expect(mockMappingStrategy.map).not.toHaveBeenCalledWith(['Invalid', 'not-a-number', 'invalid-nums']);
      
      expect(ProcessedData.create).toHaveBeenCalled();
    });

    it('should handle errors and track invalid rows', async () => {
      mockMappingStrategy.validate.mockImplementation((row): ValidationResult => {
        if (row[0] === 'Invalid') {
          return {
            valid: false,
            errors: [{ col: 1, message: 'Invalid age' }]
          };
        }
        return {
          valid: true,
          errors: []
        };
      });
      
      await processExcelFile(mockTaskId);
      
      expect(mockTask.errors.length).toBeGreaterThan(0);
      expect(mockTask.errors.some((err) => err.row === 4 && err.col === 1)).toBeTruthy();
    });

    it('should update task status to DONE after processing', async () => {
      await processExcelFile(mockTaskId);
      
      expect(mockTask.status).toBe(TaskStatus.DONE);
      expect(mockTask.save).toHaveBeenCalled();
    });

    it('should delete the file after processing', async () => {
      await processExcelFile(mockTaskId);
      
      expect(fs.unlinkSync).toHaveBeenCalledWith('/mocked/path/test.xlsx');
    });

  });

  describe('queueProcessingTask', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.spyOn(global, 'setTimeout');
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should queue the task for processing', async () => {
      queueProcessingTask(mockTaskId);
      
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 0);
    });

  });
  it('should handle errors, update task status, and rethrow the error', async () => {
    const testError = new Error('Test error message');
    
    mockTask.errors = [];
    mockTask.status = TaskStatus.PROCESSING;
  
    (XLSX.utils.sheet_to_json as jest.Mock).mockImplementation(() => {
      throw testError;
    });
    
    await expect(processExcelFile(mockTaskId)).rejects.toThrow(testError);
    
    expect(mockTask.status).toBe(TaskStatus.DONE);
    expect(mockTask.errors.length).toBe(1);
    expect(mockTask.errors[0]).toEqual({
      row: 0,
      col: 0,
      message: `Processing failed: ${testError.message}`
    });
    expect(mockTask.save).toHaveBeenCalled();
  });
});