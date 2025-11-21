export class MissingConfigError extends Error {
  envVariable: string;

  constructor(envVariable: string) {
    super(
      `Missing env variable ${envVariable}. Found value ${process.env[envVariable]}`,
    );
    this.envVariable = envVariable;
  }
}

export class MissingDBConnectionError extends Error {
  constructor() {
    super('Not connected to DB, did you call DBConnection.connect()?');
  }
}
