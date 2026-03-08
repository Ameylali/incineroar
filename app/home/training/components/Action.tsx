import { Col, Row, theme } from 'antd';
import Text from 'antd/es/typography/Text';
import React from 'react';

import { ActionKeyWords } from '@/src/services/pokemon/battle';
import { type Action } from '@/src/types/api';
import { capitalize } from '@/src/utils/string';

interface PokemonNameProps {
  player?: Action['player'];
  pokemon: string;
}

const PokemonName = ({ player: playerProp, pokemon }: PokemonNameProps) => {
  const { token } = theme.useToken();

  const PLAYER_COLOR_MAP: Record<string, string> = {
    p1: token.colorPlayerP1,
    p2: token.colorPlayerP2,
  };

  const player =
    (pokemon.includes(':') ? pokemon.split(':')[0] : undefined) ?? playerProp;

  if (pokemon === '') return <Text>-</Text>;

  if (!player) {
    return <Text>{pokemon}</Text>;
  }

  return (
    <Text style={{ color: PLAYER_COLOR_MAP[player] ?? token.colorWhite }} code>
      {pokemon}
    </Text>
  );
};

const KEYWORDS = Object.values(ActionKeyWords);

const formatText = (text: string) => {
  const { token } = theme.useToken();
  const tokenized = text.split(' ');
  const formatted: React.ReactNode[] = [];
  let flags: {
    prevTokenWasItem?: boolean;
    prevTokenWasMove?: boolean;
    prevTokenWasAbility?: boolean;
  } = {};

  for (const textToken of tokenized) {
    if (KEYWORDS.includes(textToken)) {
      formatted.push(
        <Text strong style={{ color: token.colorKeyword }}>
          {textToken}
        </Text>,
      );
    } else {
      if (
        flags.prevTokenWasItem ||
        flags.prevTokenWasMove ||
        flags.prevTokenWasAbility
      ) {
        formatted.push(<Text code>{textToken}</Text>);
      } else {
        formatted.push(textToken);
      }
    }
    flags = {};
    if (textToken.startsWith('item:')) {
      flags.prevTokenWasItem = true;
    }
    if (textToken.startsWith('move:')) {
      flags.prevTokenWasMove = true;
    }
    if (textToken.startsWith('ability:')) {
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
