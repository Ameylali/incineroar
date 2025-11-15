import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Alert, Button, Form, Input } from 'antd';
import FormItem from 'antd/es/form/FormItem';

import FormCard from '@/src/components/FormCard';
import { SignInData } from '@/src/types/api';

import { signIn } from '../actions';

const SignInFormItem = FormItem<SignInData>;

interface SignInFormProps {
  onSignUp: () => void;
  hasCreatedAccount?: boolean;
}

const SignInForm = ({ onSignUp, hasCreatedAccount }: SignInFormProps) => {
  return (
    <FormCard title="FakeOut Labs">
      <Form name="signin" action={signIn}>
        {hasCreatedAccount && (
          <FormItem>
            <Alert
              message="You can now sign in with your credentials"
              type="success"
            />
          </FormItem>
        )}
        <SignInFormItem
          name="username"
          rules={[{ required: true, message: 'Please input your Username!' }]}
        >
          <Input prefix={<UserOutlined />} placeholder="Username" />
        </SignInFormItem>
        <SignInFormItem
          name="password"
          rules={[{ required: true, message: 'Please input your Password!' }]}
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
