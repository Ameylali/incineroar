import { Col, Row } from 'antd';
import Text from 'antd/es/typography/Text';
import React from 'react';

import { ActionKeyWords } from '@/src/services/pokemon/battle';
import { type Action } from '@/src/types/api';
import { capitalize } from '@/src/utils/string';

interface PokemonNameProps {
  player?: Action['player'];
  pokemon: string;
}

const PLAYER_COLOR_MAP: Record<string, string> = {
  p1: '#1890ff',
  p2: '#f5222d',
};

const PokemonName = ({ player: playerProp, pokemon }: PokemonNameProps) => {
  const player =
    playerProp ?? (pokemon.includes(':') ? pokemon.split(':')[0] : undefined);

  if (pokemon === '') return <Text>-</Text>;

  if (!player) {
    return <Text>{pokemon}</Text>;
  }

  return (
    <Text style={{ color: PLAYER_COLOR_MAP[player] ?? 'white' }} code>
      {pokemon}
    </Text>
  );
};

const KEYWORDS = Object.values(ActionKeyWords);

const formatText = (text: string) => {
  const tokenized = text.split(' ');
  const formatted: React.ReactNode[] = [];
  let flags: {
    prevTokenWasItem?: boolean;
    prevTokenWasMove?: boolean;
    prevTokenWasAbility?: boolean;
  } = {};

  for (const token of tokenized) {
    if (KEYWORDS.includes(token)) {
      formatted.push(
        <Text strong style={{ color: '#d4b106' }}>
          {token}
        </Text>,
      );
    } else {
      if (
        flags.prevTokenWasItem ||
        flags.prevTokenWasMove ||
        flags.prevTokenWasAbility
      ) {
        formatted.push(<Text code>{token}</Text>);
      } else {
        formatted.push(token);
      }
    }
    flags = {};
    if (token.startsWith('item:')) {
      flags.prevTokenWasItem = true;
    }
    if (token.startsWith('move:')) {
      flags.prevTokenWasMove = true;
    }
    if (token.startsWith('ability:')) {
      flags.prevTokenWasAbility = true;
    }
    formatted.push(<span> </span>);
  }
  
  void formatted.pop(); // Remove last space
  return formatted;
};

const ActionName = ({ name }: { name: string }) => {
  return <Text>{formatText(name)}</Text>;
};

interface ActionProps {
  action: Action;
}

const Action = ({ action }: ActionProps) => {
  return (
    <Row>
      <Col span={2}>
        <Text>{`${action.index + 1}.`}</Text>
      </Col>
      <Col span={5}>
        <PokemonName player={action.player} pokemon={action.user} />
      </Col>
      <Col span={2}>
        <Text>{capitalize(action.type)}</Text>
      </Col>
      <Col span={10}>
        <ActionName name={action.name} />
      </Col>
      <Col span={5}>
        <ul>
          {action.targets.map((val, index) => (
            <li key={index}>
              <PokemonName player={action.player} pokemon={val} />
            </li>
          ))}
        </ul>
      </Col>
    </Row>
  );
};

export default Action;
