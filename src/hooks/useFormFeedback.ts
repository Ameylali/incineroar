import { FormInstance } from 'antd';
import { useEffect } from 'react';

import { FormActionState } from '../types/form';

const useFormFeedback = <T extends object>(
  state: FormActionState<T>,
  form: FormInstance<T>,
) => {
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
};

export default useFormFeedback;
