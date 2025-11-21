export type FormActionState<T> =
  | {
      success: false;
      data: T;
      errors?: {
        [key in keyof T]?: { errors: string[] };
      };
      error?: string[] | string;
    }
  | {
      success: true;
    };
