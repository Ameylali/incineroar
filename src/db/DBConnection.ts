import mongoose, { connect, Mongoose } from 'mongoose';

import { MissingConfigError, MissingDBConnectionError } from '../utils/errors';

mongoose.set('toObject', {
  virtuals: true,
  getters: true,
  transform: (_doc, ret) => {
    const { _id, __v, ...rest } = ret;
    return rest;
  },
});

mongoose.set('toJSON', {
  virtuals: true,
  getters: true,
  transform: (_doc, ret) => {
    const { _id, __v, ...rest } = ret;
    return rest;
  },
});

export default class DBConnection {
  protected static connection?: Mongoose;

  static async connect() {
    const uri = process.env.MONGO_DB_URI;
    if (!uri) {
      throw new MissingConfigError('MONGO_DB_URI');
    }
    return (DBConnection.connection = await connect(uri));
  }

  static getConnection() {
    if (!DBConnection.connection) {
      throw new MissingDBConnectionError();
    }
    return DBConnection.connection;
  }

  static async close() {
    await DBConnection.connection?.connection.close();
  }
}
