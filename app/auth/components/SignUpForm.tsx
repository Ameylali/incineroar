import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Alert, Button, Form, Input } from 'antd';
import { RuleRender } from 'antd/lib/form';
import FormItem from 'antd/lib/form/FormItem';
import { useEffect } from 'react';

import FormCard from '@/src/components/FormCard';
import useFormAction, { getValidateStatus } from '@/src/hooks/useFormAction';
import { SignUpData } from '@/src/types/api';

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
  const { state, isPending, form, onFinish } = useFormAction<SignUpData>(
    INITIAL_STATE,
    signUp,
  );

  const validateSamePassword: RuleRender = ({ getFieldValue }) => ({
    validator: (_, value) => {
      if (getFieldValue('password') === value) {
        return Promise.resolve();
      }
      return Promise.reject(new Error(`The passwords don't match`));
    },
  });

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
      <Form
        name="signup"
        onFinish={onFinish}
        initialValues={state.data}
        form={form}
      >
        {state.error && (
          <FormItem>
            <Alert message={state.error} type="error" />
          </FormItem>
        )}

        <SignUpFormItem
          name="username"
          rules={[{ required: true, message: 'Please input your Username!' }]}
          validateStatus={getValidateStatus(state, 'username', isPending)}
        >
          <Input prefix={<UserOutlined />} placeholder="Username" />
        </SignUpFormItem>
        <SignUpFormItem
          name="password"
          rules={[{ required: true, message: 'Please input your Password!' }]}
          validateStatus={getValidateStatus(state, 'password', isPending)}
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
