import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IProcessedData extends Document {
  taskId: Types.ObjectId;
  data: any[];
  createdAt: Date;
}

const ProcessedDataSchema: Schema = new Schema({
  taskId: {
    type: Types.ObjectId,
    ref: 'Task',
    required: true,
  },
  data: { type: [Schema.Types.Mixed], default: [] },
  createdAt: { type: Date, default: Date.now },
});

export const ProcessedData = mongoose.model<IProcessedData>(
  'ProcessedData',
  ProcessedDataSchema
);
