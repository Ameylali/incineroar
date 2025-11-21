import { connect, Mongoose } from 'mongoose';

import { MissingConfigError, MissingDBConnectionError } from '../utils/errors';

export default class DBConnection {
  protected static connection?: Mongoose;

  static async connect() {
    const uri = process.env.MONGO_DB_URL;
    if (!uri) {
      throw new MissingConfigError('MONGO_DB_URL');
    }
    return (DBConnection.connection = await connect(uri));
  }

  static getConnection() {
    if (!DBConnection.connection) {
      throw new MissingDBConnectionError();
    }
    return DBConnection.connection;
  }
}
