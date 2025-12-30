import { Col, Collapse, List, Row } from 'antd';
import Item from 'antd/es/list/Item';
import Text from 'antd/es/typography/Text';

import { PokemonSet } from '@/src/services/pokemon';

import { EvUsage, PokemonAnalytics, Usage } from '../types/api';
import PokemonSprite from './PokemonSprite';
import TypeBadge from './TypeBadge';

interface PokemonUsageCardProps {
  pokemon: PokemonAnalytics;
}

const EvsUsage = ({ usages }: { usages: EvUsage[] }) => {
  const stats: (keyof PokemonSet['evs'])[] = [
    'hp',
    'atk',
    'spa',
    'def',
    'spd',
    'spe',
  ];
  const items = stats.map((stat) => ({
    key: stat,
    label: stat,
    children: (
      <PropertyUsage
        property={stat}
        usages={usages.find((val) => val.stat === stat)?.values ?? []}
      />
    ),
  }));

  return <Collapse ghost items={items} />;
};

const PropertyUsage = ({
  property,
  usages,
}: {
  property:
    | Omit<keyof PokemonAnalytics, 'usage' | 'species' | 'evs'>
    | keyof PokemonSet['evs'];
  usages: Usage<number | string>[];
}) => {
  const values = usages
    .sort((a, b) => b.percentage - a.percentage)
    .map(({ value, percentage }, index) => {
      return (
        <Item key={index}>
          <Row className="w-full">
            <Col span={12}>
              {property === 'teraTypes' ? (
                <TypeBadge type={value as string} />
              ) : (
                value
              )}
            </Col>
            <Col span={12}>{`${(percentage * 100).toFixed(2)}%`}</Col>
          </Row>
        </Item>
      );
    });
  return <List>{values}</List>;
};

const PokemonUsageCard = ({ pokemon }: PokemonUsageCardProps) => {
  const properties = ['items', 'teraTypes', 'moves'] as const;
  const bottomCollapseItems = properties.map((key) => ({
    key,
    label: key,
    children: <PropertyUsage property={key} usages={pokemon[key]} />,
  }));
  return (
    <>
      <Row>
        <Col span={6} className="min-h-50">
          <PokemonSprite pokemon={pokemon.species} width="100%" height="100%" />
        </Col>
        <Col span={18}>
          <List>
            <Item>
              <Text>{`Used in ${pokemon.usage} teams `}</Text>
            </Item>
          </List>
          <Collapse
            ghost
            defaultActiveKey="abilities"
            items={[
              {
                key: 'abilities',
                label: 'Abilities',
                children: (
                  <PropertyUsage
                    property="abilities"
                    usages={pokemon.abilities}
                  />
                ),
              },
            ]}
          />
        </Col>
      </Row>
      <Collapse ghost defaultActiveKey="items" items={bottomCollapseItems} />
      <Collapse
        ghost
        items={[
          {
            key: 'evs',
            label: 'Evs',
            children: <EvsUsage usages={pokemon.evs} />,
          },
        ]}
      />
    </>
  );
};

export default PokemonUsageCard;
