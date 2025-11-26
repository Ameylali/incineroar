import { FormItemProps } from 'antd';
import { useForm } from 'antd/es/form/Form';
import {
  TransitionStartFunction,
  useActionState,
  useEffect,
  useTransition,
} from 'react';

import { FormActionState } from '../types/form';

type FormValue = string | Blob | string[] | number;

export const getValidateStatus = <T>(
  state: FormActionState<T>,
  key: keyof T,
  isPending: boolean,
): FormItemProps['validateStatus'] => {
  if (state.success) return 'success';
  if (state.errors?.[key]?.errors) return 'error';
  if (isPending) return 'validating';
  return '';
};

export const actionToOnFinishAdapter = <T extends { [key: string]: FormValue }>(
  values: T,
  formAction: (payload: FormData) => void,
  startTransition: TransitionStartFunction,
) => {
  const formData = new FormData();
  Object.keys(values).forEach((key) => {
    const value = values[key as keyof T];
    if (Array.isArray(value)) {
      value.forEach((v) => formData.append(key, v));
      return;
    }
    if (typeof value === 'number') {
      formData.append(key, value.toString());
      return;
    }
    formData.append(key, value);
  });
  startTransition(() => {
    formAction(formData);
  });
};

const useFormAction = <T extends { [key: string]: FormValue }>(
  initial: FormActionState<T>,
  action: (
    state: Awaited<FormActionState<T>>,
    payload: FormData,
  ) => FormActionState<T> | Promise<FormActionState<T>>,
) => {
  const [state, formAction, isFormPending] = useActionState<
    FormActionState<T>,
    FormData
  >(action, initial);
  const [isTransitionPending, startTransition] = useTransition();
  const [form] = useForm<T>();

  const onFinish = (data: T) =>
    actionToOnFinishAdapter<T>(data, formAction, startTransition);

  useEffect(() => {
    if (!state.success) {
      const formFields = Object.keys(state.data).map((key) => ({
        name: key,
        value: state.data[key as keyof T],
        errors: state.errors?.[key as keyof T]?.errors,
      }));
      form.setFields(formFields);
    }
  }, [form, state]);

  return {
    isPending: isFormPending || isTransitionPending,
    form,
    onFinish,
    state,
  };
};

export default useFormAction;
