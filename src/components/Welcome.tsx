import { Flex, Typography } from 'antd';
import Title from 'antd/es/typography/Title';
import Image from 'next/image';
import Link from 'next/link';

import foLabsLogo from '@/public/fo-labs.svg';

import { theme } from '../utils/theme';

interface WelcomeProps {
  showEnter?: boolean;
}

const Welcome = ({ showEnter }: WelcomeProps) => {
  const { token } = theme;

  return (
    <Flex vertical justify="center" align="center" className="h-full">
      <Image src={foLabsLogo as string} alt="fakeout labs" width={300} />
      <Title style={{ color: token.colorWhite }}>FakeOut Labs</Title>
      <Typography style={{ color: token.colorWhite }}>
        Tools for pokemon battling
      </Typography>
      {showEnter && <Link href="/auth">Enter</Link>}
    </Flex>
  );
};

export default Welcome;
