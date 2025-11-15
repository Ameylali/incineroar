import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Alert, Button, Form, Input } from 'antd';
import { RuleRender } from 'antd/es/form';
import { useForm } from 'antd/es/form/Form';
import FormItem, { FormItemProps } from 'antd/es/form/FormItem';
import { useActionState, useEffect, useTransition } from 'react';

import FormCard from '@/src/components/FormCard';
import useFormFeedback from '@/src/hooks/useFormFeedback';
import { SignUpData } from '@/src/types/api';
import { actionToOnFinishAdapter } from '@/src/utils/adapters';

import { signUp, SignUpActionState } from '../actions';
const SignUpFormItem = FormItem<SignUpData>;

interface SignUpFormProps {
  onSignIn: (hasCreatedAccount?: boolean) => void;
}

const INITIAL_STATE: SignUpActionState = {
  success: false,
  data: {
    username: '',
    password: '',
  },
};

const SignUpForm = ({ onSignIn }: SignUpFormProps) => {
  const [state, formAction, isFormPending] = useActionState<
    SignUpActionState,
    FormData
  >(signUp, INITIAL_STATE);
  const [isTransitionPending, startTransition] = useTransition();
  const [form] = useForm<SignUpData>();

  const onFinish = (data: SignUpData) =>
    actionToOnFinishAdapter<SignUpData>(data, formAction, startTransition);

  const validateSamePassword: RuleRender = ({ getFieldValue }) => ({
    validator: (_, value) => {
      if (getFieldValue('password') === value) {
        return Promise.resolve();
      }
      return Promise.reject(new Error(`The passwords don't match`));
    },
  });

  const getValidateStatus = (
    key: keyof SignUpData,
  ): FormItemProps['validateStatus'] => {
    if (state.success) return 'success';
    if (state.errors?.[key]?.errors) return 'error';
    if (isFormPending || isTransitionPending) return 'validating';
    return '';
  };

  useFormFeedback(state, form);

  useEffect(() => {
    if (state.success) {
      onSignIn(true);
    }
  }, [state.success, onSignIn]);

  if (state.success) {
    return <></>;
  }

  return (
    <FormCard title="FakeOut Labs">
      <FormItem>
        {state.error && <Alert message={state.error} type="error" />}
      </FormItem>
      <Form
        name="signup"
        onFinish={onFinish}
        initialValues={state.data}
        form={form}
      >
        <SignUpFormItem
          name="username"
          rules={[{ required: true, message: 'Please input your Username!' }]}
          validateStatus={getValidateStatus('username')}
        >
          <Input prefix={<UserOutlined />} placeholder="Username" />
        </SignUpFormItem>
        <SignUpFormItem
          name="password"
          rules={[{ required: true, message: 'Please input your Password!' }]}
          validateStatus={getValidateStatus('password')}
        >
          <Input
            prefix={<LockOutlined />}
            type="password"
            placeholder="Password"
          />
        </SignUpFormItem>
        <FormItem
          name="passwordConfirm"
          rules={[
            { required: true, message: 'Please confirm your Password!' },
            validateSamePassword,
          ]}
        >
          <Input
            prefix={<LockOutlined />}
            type="password"
            placeholder="Confirm password"
          />
        </FormItem>
        <FormItem>
          <Button block type="primary" htmlType="submit">
            Sign up
          </Button>
        </FormItem>
        <FormItem>
          <Button block type="link" onClick={() => onSignIn()}>
            I already have an account
          </Button>
        </FormItem>
      </Form>
    </FormCard>
  );
};

export default SignUpForm;
