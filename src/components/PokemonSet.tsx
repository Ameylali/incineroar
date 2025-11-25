import { Col, Flex, List, Progress, Row } from 'antd';
import Item from 'antd/es/list/Item';
import Text from 'antd/es/typography/Text';
import Title from 'antd/es/typography/Title';

import { PokemonSet as PokemonSetType } from '@/src/services/pokemon';

import ItemSprite from './ItemSprite';
import PokemonSprite from './PokemonSprite';
import TypeBadge from './TypeBadge';

const StatEvs = ({ value, stat }: { value?: number; stat: string }) => {
  return (
    <Item>
      <Flex gap={2} className="w-full">
        <Text className="w-[2rem]">{stat}</Text>
        <Progress percent={((value ?? 0) / 252) * 100} showInfo={false} />
        <Text className="w-[2rem] text-right">{value}</Text>
      </Flex>
    </Item>
  );
};

const SetPropertyLabel = ({
  property,
  value,
}: {
  property: string;
  value?: string;
}) => {
  return (
    <Item>
      <Text>
        {`${property}: `}
        {value ?? ''}
      </Text>
    </Item>
  );
};

interface PokemonSetProps {
  pokemon: Partial<PokemonSetType>;
}

const PokemonSet = ({ pokemon }: PokemonSetProps) => {
  const evsList = Object.keys(pokemon.evs ?? {}).map((key) => ({
    stat: key,
    value: pokemon.evs?.[key as keyof PokemonSetType['evs']],
  }));
  return (
    <div className="p-3">
      <Row>
        <Col span={6}>
          <PokemonSprite
            pokemon={pokemon.species}
            imageProps={{ fill: true, style: { objectFit: 'contain' } }}
          />
          <ItemSprite
            item={pokemon.item}
            imageProps={{ width: 30, height: 30 }}
          />
        </Col>
        <Col span={18}>
          <Title level={3}>{pokemon.species}</Title>
          <List>
            <SetPropertyLabel property="Ability" value={pokemon.ability} />
            <SetPropertyLabel property="Item" value={pokemon.item} />
            <SetPropertyLabel property="Nature" value={pokemon.nature} />
            <Item>
              <Text>
                {`Tera type: `}
                <TypeBadge type={pokemon.teraType} isTera />
              </Text>
            </Item>
          </List>
        </Col>
      </Row>
      <Row>
        <Col span={3}>
          <List>
            <SetPropertyLabel property="Moves" />
          </List>
        </Col>
        <Col span={21}>
          <List
            itemLayout="horizontal"
            dataSource={pokemon.moves || []}
            renderItem={(move) => <Item>{move}</Item>}
          ></List>
        </Col>
      </Row>
      <Row>
        <Col span={3}>
          <List>
            <SetPropertyLabel property="Evs" />
          </List>
        </Col>
        <Col span={21}>
          <List
            itemLayout="horizontal"
            dataSource={evsList || []}
            renderItem={({ stat, value }) => (
              <StatEvs stat={stat} value={value} />
            )}
          ></List>
        </Col>
      </Row>
    </div>
  );
};

export default PokemonSet;
