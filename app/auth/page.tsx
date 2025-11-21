'use client';

import { Col, Row } from 'antd';
import { useState } from 'react';

import SignInForm from './components/SignInForm';
import SignUpForm from './components/SignUpForm';

type FormType = 'signin' | 'signup';

const Login = () => {
  const [formType, setFormType] = useState<FormType>('signin');
  const [hasCreatedAccount, setHasCreatedAccount] = useState<boolean>(false);

  return (
    <Row align="middle" justify="center" className="h-dvh">
      <Col xs={24} md={16} lg={8}>
        {formType === 'signin' ? (
          <SignInForm
            onSignUp={() => setFormType('signup')}
            hasCreatedAccount={hasCreatedAccount}
          />
        ) : (
          <SignUpForm
            onSignIn={(hasCreatedAccount) => {
              setFormType('signin');
              setHasCreatedAccount(hasCreatedAccount);
            }}
          />
        )}
      </Col>
    </Row>
  );
};

export default Login;
