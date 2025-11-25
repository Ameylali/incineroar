import SkeletonAvatar from 'antd/es/skeleton/Avatar';
import Image, { ImageProps } from 'next/image';

import useItemQuery from '../hooks/useItemQuery';

interface ItemSpriteProps {
  item?: string;
  imageProps: Omit<ImageProps, 'src' | 'alt'>;
}

const ItemSprite = ({ item, imageProps }: ItemSpriteProps) => {
  const { isSuccess, isLoading, data } = useItemQuery(item);
  if (isLoading || !isSuccess || !data.sprites.default) {
    return <SkeletonAvatar active={isLoading} size="default" shape="circle" />;
  }
  return (
    <Image src={data.sprites.default} alt={item || 'unknown'} {...imageProps} />
  );
};

export default ItemSprite;
