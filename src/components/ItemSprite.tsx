import { FileImageOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import Image from 'next/image';

import useItemQuery from '../hooks/useItemQuery';

interface ItemSpriteProps {
  item?: string;
  width?: number | string;
  height?: number | string;
}

const ItemSprite = ({
  item,
  width = 'auto',
  height = 'auto',
}: ItemSpriteProps) => {
  const { isSuccess, isLoading, data } = useItemQuery(item);
  const title = item || 'unknown';

  if (isLoading || !isSuccess || !data.sprites.default) {
    return (
      <Tooltip title={title}>
        <FileImageOutlined style={{ fontSize: width }} />
      </Tooltip>
    );
  }
  return (
    <div style={{ width, height, position: 'relative' }}>
      <Image
        src={data.sprites.default}
        title={title}
        alt={title}
        sizes={`${width}px`}
        quality={100}
        fill
        style={{ objectFit: 'contain' }}
      />
    </div>
  );
};

export default ItemSprite;
