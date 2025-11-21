import { Flex, Typography } from 'antd';
import Title from 'antd/lib/typography/Title';
import Image from 'next/image';

import foLabsLogo from '@/public/fo-labs.svg';

const Welcome = () => {
  return (
    <Flex vertical justify="center" align="center" className="h-full">
      <Image src={foLabsLogo as string} alt="fakeout labs" width={300} />
      <Title>FakeOut Labs</Title>
      <Typography>Tools for pokemon battling</Typography>
    </Flex>
  );
};

export default Welcome;
