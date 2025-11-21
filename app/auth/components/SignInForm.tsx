import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Alert, Button, Form, Input } from 'antd';
import FormItem from 'antd/lib/form/FormItem';

import FormCard from '@/src/components/FormCard';
import useFormAction, { getValidateStatus } from '@/src/hooks/useFormAction';
import { SignInData } from '@/src/types/api';

import { signIn, SignInActionState } from '../actions';

const SignInFormItem = FormItem<SignInData>;

interface SignInFormProps {
  onSignUp: () => void;
  hasCreatedAccount?: boolean;
}

const INITIAL_STATE: SignInActionState = {
  success: false,
  data: {
    username: '',
    password: '',
  },
};

const SignInForm = ({ onSignUp, hasCreatedAccount }: SignInFormProps) => {
  const { state, form, onFinish, isPending } = useFormAction(
    INITIAL_STATE,
    signIn,
  );

  if (state.success) {
    return <></>;
  }

  return (
    <FormCard title="FakeOut Labs">
      <Form
        name="signin"
        onFinish={onFinish}
        initialValues={state.data}
        form={form}
      >
        {hasCreatedAccount && (
          <FormItem>
            <Alert
              message="You can now sign in with your credentials"
              type="success"
            />
          </FormItem>
        )}
        {state.error && (
          <FormItem>
            <Alert message={state.error} type="error" />
          </FormItem>
        )}
        <SignInFormItem
          name="username"
          rules={[{ required: true, message: 'Please input your Username!' }]}
          validateStatus={getValidateStatus(state, 'username', isPending)}
        >
          <Input prefix={<UserOutlined />} placeholder="Username" />
        </SignInFormItem>
        <SignInFormItem
          name="password"
          rules={[{ required: true, message: 'Please input your Password!' }]}
          validateStatus={getValidateStatus(state, 'password', isPending)}
        >
          <Input
            prefix={<LockOutlined />}
            type="password"
            placeholder="Password"
          />
        </SignInFormItem>
        <FormItem>
          <Button block type="primary" htmlType="submit">
            Sign in
          </Button>
        </FormItem>
        <FormItem>
          <Button block type="link" onClick={onSignUp}>
            Sign up
          </Button>
        </FormItem>
      </Form>
    </FormCard>
  );
};

export default SignInForm;
