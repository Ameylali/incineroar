import { DeepRequired } from '@/src/types';
import { Battle } from '@/src/types/api';
import { EditBattleFormData } from '@/src/types/form';
import { itShouldContainFormItems } from '@/src/utils/jest';
import { QueryClientWrap } from '@/src/utils/jest-ui';
import {
  itemClient,
  moveClient,
  pokemonClient,
} from '@/src/utils/query-clients';

import EditBattle from './EditBattle';

jest.mock('@razr/formdata', () => ({
  encode: jest.fn(),
}));

jest.mock('../actions', () => ({
  editBattle: jest.fn(),
}));

const battle: Battle = {
  id: '',
  name: '',
  notes: '',
  turns: [
    {
      index: 0,
      actions: [
        {
          index: 0,
          user: '',
          type: 'effect',
          name: '',
          targets: [],
        },
      ],
    },
  ],
  createdAt: '',
};

const Component = ({ isQuickEdit = false }: { isQuickEdit?: boolean }) => {
  return (
    <QueryClientWrap>
      <EditBattle
        battle={battle}
        teams={[]}
        onCancel={() => {}}
        trainingId=""
        onSuccess={() => {}}
        isQuickEdit={isQuickEdit}
      />
    </QueryClientWrap>
  );
};

describe('EditBattle', () => {
  const formData: DeepRequired<EditBattleFormData> = {
    id: '',
    name: 'notes',
    season: 0,
    format: '',
    result: 'win',
    notes: '',
    teamId: '',
    trainingId: '',
    turns: [
      {
        index: 0,
        actions: [
          {
            index: 0,
            player: 'p1',
            user: '',
            type: 'effect',
            name: '',
            targets: [],
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    jest
      .spyOn(pokemonClient, 'listPokemons')
      .mockResolvedValue({ results: [], count: 0, next: '', previous: '' });
    jest
      .spyOn(moveClient, 'listMoves')
      .mockResolvedValue({ results: [], count: 0, next: '', previous: '' });
    jest
      .spyOn(itemClient, 'listItems')
      .mockResolvedValue({ results: [], count: 0, next: '', previous: '' });
    jest
      .spyOn(pokemonClient, 'listAbilities')
      .mockResolvedValue({ results: [], count: 0, next: '', previous: '' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  itShouldContainFormItems({
    formData,
    formName: 'editBattle',
    component: <Component />,
  });

  itShouldContainFormItems({
    formData,
    formName: 'editBattle',
    component: <Component isQuickEdit={true} />,
  });
});
