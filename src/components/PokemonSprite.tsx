import SkeletonAvatar from 'antd/lib/skeleton/Avatar';
import Image, { ImageProps } from 'next/image';

import usePokemonQuery from '../hooks/usePokemonQuery';

interface PokemonSpriteProps {
  pokemon?: string;
  imageProps?: Omit<ImageProps, 'src' | 'alt'>;
}

const PokemonSprite = ({ pokemon, imageProps = {} }: PokemonSpriteProps) => {
  const { isLoading, isSuccess, data } = usePokemonQuery(pokemon);
  if (isLoading || !isSuccess) {
    return <SkeletonAvatar active size="default" shape="circle" />;
  }
  return (
    <Image
      src={data.sprites.front_default}
      alt={pokemon || 'unknown'}
      {...imageProps}
    />
  );
};

export default PokemonSprite;
