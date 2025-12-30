import { FileImageOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import Image from 'next/image';

import usePokemonQuery from '../hooks/usePokemonQuery';

interface PokemonSpriteProps {
  pokemon?: string;
  width?: number | string;
  height?: number | string;
}

const PokemonSprite = ({
  pokemon,
  width = 'auto',
  height = 'auto',
}: PokemonSpriteProps) => {
  const { isLoading, isSuccess, data } = usePokemonQuery(pokemon);
  const title = pokemon || 'unknown';

  if (isLoading || !isSuccess || !data.sprites.front_default) {
    return (
      <Tooltip title={title}>
        <FileImageOutlined style={{ fontSize: width }} />
      </Tooltip>
    );
  }
  return (
    <div style={{ width, height, position: 'relative' }}>
      <Image
        src={data.sprites.front_default}
        alt={title}
        title={title}
        fill
        style={{ objectFit: 'contain' }}
      />
    </div>
  );
};

export default PokemonSprite;
