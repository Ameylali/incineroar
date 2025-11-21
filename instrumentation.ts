export const register = async () => {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('pino');
    await import('next-logger');
  }
};
