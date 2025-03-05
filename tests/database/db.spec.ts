import mongoose from 'mongoose';
import connectDB from '../../src/database/db';

const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('Database Connection', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('should attempt to connect to the database', async () => {
    const connectSpy = jest.spyOn(mongoose, 'connect');

    connectDB();

    expect(connectSpy).toHaveBeenCalledWith(
      expect.stringContaining('mongodb://'),
      {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      }
    );

    connectSpy.mockRestore();
  });

  it('should log successful connection', async () => {
    const connectSpy = jest
      .spyOn(mongoose, 'connect')
      .mockResolvedValue({} as any);

    connectDB();

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(consoleLogSpy).toHaveBeenCalledWith(
      'Mongoose connected to database'
    );

    connectSpy.mockRestore();
  });

  it('should handle connection errors', async () => {
    const connectSpy = jest
      .spyOn(mongoose, 'connect')
      .mockRejectedValue(new Error('Connection failed'));

    connectDB();

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to connect to database:',
      expect.any(Error)
    );

    connectSpy.mockRestore();
  });

  it('should set up error and disconnection event listeners', () => {
    const onSpy = jest.spyOn(mongoose.connection, 'on');

    connectDB();

    expect(onSpy).toHaveBeenCalledWith('error', expect.any(Function));
    expect(onSpy).toHaveBeenCalledWith('disconnected', expect.any(Function));

    onSpy.mockRestore();
  });

  it('should handle SIGINT signal', async () => {
    const disconnectSpy = jest
      .spyOn(mongoose, 'disconnect')
      .mockResolvedValue();
    const exitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);

    process.emit('SIGINT');

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(disconnectSpy).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);

    disconnectSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
