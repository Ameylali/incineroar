import { TransitionStartFunction } from 'react';

export const actionToOnFinishAdapter = <
  T extends { [key: string]: string | Blob },
>(
  values: T,
  formAction: (payload: FormData) => void,
  startTransition: TransitionStartFunction,
) => {
  const formData = new FormData();
  Object.keys(values).forEach((key) => {
    formData.append(key, values[key as keyof T]);
  });
  // Wrap the server action call in startTransition
  startTransition(() => {
    formAction(formData);
  });
};
