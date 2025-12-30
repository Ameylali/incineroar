'use client';

import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { Button } from 'antd';
import Title from 'antd/es/typography/Title';
import { useEffect } from 'react';

const Error = ({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) => {
  const { reset: resetQueries } = useQueryErrorResetBoundary();
  const restAll = () => {
    resetQueries();
    reset();
  };

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <Title level={2}>Something went wrong!</Title>
      <Button type="primary" onClick={() => restAll()}>
        Try again
      </Button>
    </>
  );
};

export default Error;
