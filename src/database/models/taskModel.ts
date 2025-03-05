import mongoose, { Schema, Document } from 'mongoose';

export enum TaskStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  DONE = 'done',
}

export interface IError {
  row: number;
  col: number;
  message?: string;
}

export interface ITask extends Omit<Document, 'errors'> {
  originalFileName: string;
  status: TaskStatus;
  totalRows: number;
  processedRows: number;
  errors: IError[];
  mappingFormat: string;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema: Schema = new Schema({
  originalFileName: { type: String, required: true },
  status: {
    type: String,
    enum: Object.values(TaskStatus),
    default: TaskStatus.PENDING,
  },
  totalRows: { type: Number, default: 0 },
  processedRows: { type: Number, default: 0 },
  errors: [
    {
      row: { type: Number, required: true },
      col: { type: Number, required: true },
      message: { type: String },
    },
  ],
  mappingFormat: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

TaskSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export const Task = mongoose.model<ITask>('Task', TaskSchema);
