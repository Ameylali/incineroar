import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  MinusCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  Alert,
  AutoComplete,
  Button,
  Card,
  Flex,
  Form,
  FormListFieldData,
  Input,
  Select,
  SelectProps,
} from 'antd';
import { useWatch } from 'antd/es/form/Form';
import FormItem from 'antd/es/form/FormItem';
import FormList from 'antd/es/form/FormList';
import Text from 'antd/es/typography/Text';
import { FormInstance } from 'antd/lib';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from 'react';

import { TrainingKeys } from '@/src/constants/query-keys';
import {
  useAllAbilitiesQuery,
  useAllItemsQuery,
  useAllMovesQuery,
  useAllPokemonQuery,
} from '@/src/hooks/pokemon-queries';
import useFormAction, { getValidateStatus } from '@/src/hooks/useFormAction';
import AutocompleteService from '@/src/services/autocomplete';
import { ActionKeyWords } from '@/src/services/pokemon/battle';
import { Action, Battle, Team, Turn } from '@/src/types/api';
import { EditBattleFormData } from '@/src/types/form';
import { toOptions } from '@/src/utils/antd-adapters';
import { queryClient } from '@/src/utils/query-clients';

import FormatInput from '../../components/FormatInput';
import { editBattle } from '../actions';

const BattleForm = Form<EditBattleFormData>;
const BattleFormItem = FormItem<EditBattleFormData>;
const ActionFormItem = FormItem<Action[]>;
const defaultAction: Action = {
  index: 0,
  name: '',
  type: 'move',
  user: '',
  targets: [],
};

interface IEditBattleFormContext {
  pokemonAutocomplete?: AutocompleteService;
  moveAutocomplete?: AutocompleteService;
  abilityAutocomplete?: AutocompleteService;
  actionNameAutocomplete?: AutocompleteService;
  form?: FormInstance<EditBattleFormData>;
}

const EditBattleFormContext = createContext<IEditBattleFormContext>({});

interface PokemonInputProps {
  player?: Action['player'] | null;
  value?: string;
  onChange?: (value: string) => void;
}

const filterPokemonByPlayer = (
  actions: Action[],
  player: Exclude<Action['player'], undefined>,
) => {
  const users = actions
    .filter(
      (action) =>
        action.user.startsWith(`${player}:`) || action.player === player,
    )
    .map((action) => action.user.replace(`${player}:`, ''));
  const targets = actions
    .flatMap((action) => action.targets)
    .filter((target) => target.startsWith(`${player}:`))
    .map((target) => target.replace(`${player}:`, ''));
  return Array.from(new Set([...users, ...targets]));
};

const useFilteredPokemon = (
  turns: Turn[] | undefined,
  player: Exclude<Action['player'], undefined>,
) => {
  return useMemo(
    () =>
      filterPokemonByPlayer(
        (turns ?? []).flatMap((turn) => turn.actions),
        player,
      ),
    [turns, player],
  );
};

const usePokemonAutocomplete = (
  value?: string,
  player?: Action['player'] | null | 'all',
) => {
  const { pokemonAutocomplete, form } = useContext(EditBattleFormContext);
  const turns = useWatch(['turns'], form);
  const pokemonP1 = useFilteredPokemon(turns, 'p1');
  const pokemonP2 = useFilteredPokemon(turns, 'p2');
  const baseOptions = useMemo(
    () =>
      getOptions({
        searchText: value ?? '',
        player,
        pokemonP1,
        pokemonP2,
        pokemonAutocomplete,
      }),
    [value, pokemonP1, pokemonP2, pokemonAutocomplete, player],
  );
  const [options, setOptions] = useState<string[]>([]);
  const [, startTransition] = useTransition();

  return {
    pokemonP1,
    pokemonP2,
    baseOptions,
    options,
    setOptions,
    startTransition,
    pokemonAutocomplete,
  };
};

const withTagOnChange = (
  newValue: string,
  prevValue?: string,
  onChange?: (value: string) => void,
) => {
  if (
    prevValue?.includes(':') &&
    !prevValue.startsWith(newValue) &&
    !newValue.includes(':')
  ) {
    const [prefix] = prevValue.split(':');
    onChange?.(`${prefix}:${newValue}`);
    return;
  }
  onChange?.(newValue);
};

const getOptions = ({
  searchText,
  player,
  pokemonP1,
  pokemonP2,
  pokemonAutocomplete,
}: {
  searchText: string;
  player?: Action['player'] | null | 'all';
  pokemonP1: string[];
  pokemonP2: string[];
  pokemonAutocomplete?: AutocompleteService;
}) => {
  const list: string[] = [];
  const playerTag = searchText.includes(':')
    ? searchText.split(':')[0]
    : player;
  const searchPokemon = searchText.replace(`${playerTag}:`, '');
  if (playerTag === 'p1' || playerTag === 'all') {
    list.push(
      ...pokemonP1
        .filter((name) => pokemonAutocomplete?.hasWord(name) ?? false)
        .map((name) => (playerTag === 'all' ? 'p1:' : '') + name),
    );
  }
  if (playerTag === 'p2' || playerTag === 'all') {
    list.push(
      ...pokemonP2
        .filter((name) => pokemonAutocomplete?.hasWord(name) ?? false)
        .map((name) => (playerTag === 'all' ? 'p2' : '') + name),
    );
  }
  if (pokemonAutocomplete && searchPokemon.length >= 2) {
    list.push(...(pokemonAutocomplete.getSuggestions(searchPokemon) ?? []));
  }
  return Array.from(new Set(list));
};

interface PokemonMultiSelectProps {
  value?: string[];
  onChange?: (value: string[]) => void;
}

const PokemonMultiSelect = ({ value, onChange }: PokemonMultiSelectProps) => {
  const {
    setOptions,
    startTransition,
    baseOptions,
    options,
    pokemonP1,
    pokemonP2,
    pokemonAutocomplete,
  } = usePokemonAutocomplete('', 'all');

  const onSearch: SelectProps['onSearch'] = (searchText) => {
    startTransition(() => {
      const tag = searchText.includes(':') ? searchText.split(':')[0] : null;
      const list = getOptions({
        searchText,
        pokemonP1,
        pokemonP2,
        pokemonAutocomplete,
      });
      if (tag) {
        for (let i = 0; i < list.length; i++) {
          list[i] = `${tag}:${list[i]}`;
        }
      }
      setOptions(list);
    });
  };

  return (
    <Select
      mode="tags"
      placeholder="Enter targets"
      className="w-[200px]"
      value={value}
      onChange={onChange}
      options={toOptions(options.length > 1 ? options : baseOptions)}
      onSearch={onSearch}
    />
  );
};

const PokemonInput = ({ player, value, onChange }: PokemonInputProps) => {
  const {
    setOptions,
    startTransition,
    baseOptions,
    options,
    pokemonP1,
    pokemonP2,
    pokemonAutocomplete,
  } = usePokemonAutocomplete(value, player);

  const onSearch: SelectProps['onSearch'] = (searchText) => {
    startTransition(() => {
      const list = getOptions({
        searchText,
        player,
        pokemonP1,
        pokemonP2,
        pokemonAutocomplete,
      });
      setOptions(list);
    });
  };

  return (
    <AutoComplete
      value={value}
      onChange={(val) => withTagOnChange(val, value, onChange)}
      options={toOptions(options.length > 0 ? options : baseOptions)}
      onSearch={onSearch}
      className="min-w-[200px]"
      autoFocus
    />
  );
};

interface ActionNameAutocomplteteProps {
  value?: string;
  onChange?: (value: string) => void;
  type?: Action['type'];
}

const ActionNameAutocomplete = ({
  value,
  onChange,
  type,
}: ActionNameAutocomplteteProps) => {
  const { actionNameAutocomplete, moveAutocomplete, abilityAutocomplete } =
    useContext(EditBattleFormContext);
  const [options, setOptions] = useState<string[]>([]);

  const onSearch: SelectProps['onSearch'] = (searchText) => {
    if (type === 'move' && moveAutocomplete) {
      const list = moveAutocomplete.getSuggestions(searchText) ?? [];
      setOptions(list);
      return;
    }
    if (type === 'ability' && abilityAutocomplete) {
      const list = abilityAutocomplete.getSuggestions(searchText) ?? [];
      setOptions(list);
      return;
    }
    if (actionNameAutocomplete) {
      const list = actionNameAutocomplete.getSuggestions(searchText) ?? [];
      setOptions(list);
      return;
    }
  };

  return (
    <AutoComplete
      value={value}
      onChange={onChange}
      options={toOptions(options)}
      onSearch={onSearch}
      className="min-w-[200px]"
    />
  );
};

interface ActionFormFieldsProps {
  index: number;
  name: FormListFieldData['name'];
  namePrefix?: (string | number)[];
  remove: () => void;
  move: (from: number, to: number) => void;
}

const typeOptions: SelectProps['options'] = [
  {
    value: 'move',
  },
  {
    value: 'effect',
  },
  {
    value: 'ability',
  },
  {
    value: 'switch',
  },
];
const playerOptions: SelectProps['options'] = [
  {
    value: null,
  },
  {
    value: 'p1',
  },
  {
    value: 'p2',
  },
];

const ActionFormFields = ({
  namePrefix,
  name: baseName,
  remove,
  move,
  index,
}: ActionFormFieldsProps) => {
  const { form } = useContext(EditBattleFormContext);
  const player = useWatch(
    [...(namePrefix ?? []), baseName, 'player'],
    form,
  ) as Action['player'];
  const type = useWatch(
    [...(namePrefix ?? []), baseName, 'type'],
    form,
  ) as Action['type'];

  return (
    <Flex justify="space-between">
      <ActionFormItem name={[baseName, 'player']} label="Player">
        <Select className="min-w-[80px]" options={playerOptions} />
      </ActionFormItem>
      <ActionFormItem name={[baseName, 'user']} label="User">
        <PokemonInput player={player} />
      </ActionFormItem>
      <ActionFormItem name={[baseName, 'type']}>
        <Select options={typeOptions} />
      </ActionFormItem>
      <ActionFormItem name={[baseName, 'name']} label="Name">
        <ActionNameAutocomplete type={type} />
      </ActionFormItem>
      <ActionFormItem name={[baseName, 'targets']} label="Targets">
        <PokemonMultiSelect />
      </ActionFormItem>
      <FormItem>
        <Flex gap={2}>
          <ArrowUpOutlined onClick={() => move(index, index - 1)} />
          <ArrowDownOutlined onClick={() => move(index, index + 1)} />
          <MinusCircleOutlined onClick={() => remove()} />
        </Flex>
      </FormItem>
    </Flex>
  );
};

interface TurnFormFieldsProps {
  name: FormListFieldData['name'];
  namePrefix?: (string | number)[];
  index: number;
  remove: () => void;
  move: (from: number, to: number) => void;
}

const TurnFormFields = ({
  namePrefix,
  name: baseName,
  index,
  remove,
  move,
}: TurnFormFieldsProps) => {
  return (
    <Card>
      <Flex className="mb-3" justify="space-between">
        <Text>{`Turn ${index + 1}`}</Text>
        <Flex gap={3}>
          <ArrowUpOutlined onClick={() => move(index, index - 1)} />
          <ArrowDownOutlined onClick={() => move(index, index + 1)} />
          <MinusCircleOutlined onClick={() => remove()} />
        </Flex>
      </Flex>
      <FormList name={[baseName, 'actions']}>
        {(fields, { add, remove, move }) => (
          <>
            {fields.map(({ key, name }, index) => (
              <ActionFormFields
                index={index}
                key={key}
                namePrefix={[...(namePrefix ?? []), baseName, 'actions']}
                name={name}
                remove={() => remove(name)}
                move={move}
              />
            ))}
            <FormItem>
              <Button
                type="dashed"
                block
                onClick={() => add(defaultAction)}
                icon={<PlusOutlined />}
              >
                Add action
              </Button>
            </FormItem>
          </>
        )}
      </FormList>
    </Card>
  );
};

interface EditBattleProps {
  trainingId: string;
  battle: Battle;
  teams: Team[];
  onCancel: () => void;
  onSuccess?: () => void;
}

const resultOptions = [
  {
    value: null,
  },
  {
    value: 'win',
  },
  {
    value: 'loose',
  },
  {
    value: 'tie',
  },
];

const defaultTurn: Turn = {
  index: 0,
  actions: [defaultAction],
};

const useActionNameAutocomplete = (): AutocompleteService => {
  const { data: allItems } = useAllItemsQuery();

  const actionNameAutocomplete = useMemo(() => {
    const data: string[] = [];
    if (allItems) {
      data.push(...allItems.map((item) => `item:${item}`));
    }
    const keyWords = [
      ActionKeyWords.FAINTED,
      `${ActionKeyWords.WEATHER} ended`,
      ActionKeyWords.CRIT,
      ActionKeyWords.Z_MOVE,
      ActionKeyWords.MEGA,
      ActionKeyWords.FORME,
    ];
    data.push(...keyWords);
    const STATUSES = ['slp', 'par', 'frz', 'brn', 'psn', 'tox', 'confusion'];
    STATUSES.forEach((status) => {
      data.push(`${status} ${ActionKeyWords.AFFECTED}`);
      data.push(`${ActionKeyWords.CURED} ${status}`);
    });
    const WEATHERS = ['sun', 'rain', 'sandstorm', 'hail'];
    WEATHERS.forEach((weather) => {
      data.push(`${ActionKeyWords.WEATHER} ${weather}`);
    });
    const TYPES = [
      'normal',
      'fire',
      'water',
      'electric',
      'grass',
      'ice',
      'fighting',
      'poison',
      'ground',
      'flying',
      'psychic',
      'bug',
      'rock',
      'ghost',
      'dragon',
      'dark',
      'steel',
      'fairy',
      'stellar',
    ];
    TYPES.forEach((type) => {
      data.push(`${ActionKeyWords.TERA} ${type}`);
    });
    const STATS = ['atk', 'def', 'spa', 'spd', 'spe', 'accuracy', 'evasion'];
    STATS.forEach((stat) => {
      [1, 2, 3, 4, 5, 6].forEach((stage) => {
        data.push(`${stat} ${ActionKeyWords.BOOST_INCREASED} ${stage}`);
        data.push(`${stat} ${ActionKeyWords.BOOST_CHANGED} ${stage}`);
        data.push(`${stat} ${ActionKeyWords.BOOST_DECREASED} ${stage}`);
      });
    });
    const EFFECTS = [
      'gravity',
      'grassy terrain',
      'misty terrain',
      'electric terrain',
      'psychic terrain',
      'trick room',
      'tailwind',
      'reflect',
      'light screen',
      'safeguard',
      'substitute',
      'leech seed',
      'heal block',
      'perish song',
      'encore',
      'disable',
      'aqua ring',
      'focus energy',
      'ingrain',
      'wish',
      'nightmare',
      'curse',
    ];
    EFFECTS.forEach((effect) => {
      data.push(`${effect} ${ActionKeyWords.STARTED}`);
      data.push(`${effect} ${ActionKeyWords.ENDED}`);
    });
    return new AutocompleteService(data);
  }, [allItems]);

  return actionNameAutocomplete;
};

const EditBattle = ({
  battle,
  teams,
  onCancel,
  trainingId,
  onSuccess,
}: EditBattleProps) => {
  const { team: _, ...battleData } = battle;
  const initialData: EditBattleFormData = {
    ...battleData,
    teamId: battle.team?.id,
    trainingId,
  };
  const { state, form, isPending, onFinish } =
    useFormAction<EditBattleFormData>(
      { success: false, data: initialData },
      editBattle,
    );
  const { data: allPokemon } = useAllPokemonQuery();
  const { data: allMoves } = useAllMovesQuery();
  const { data: allAbilities } = useAllAbilitiesQuery();
  const pokemonAutocomplete = useMemo(
    () => new AutocompleteService(allPokemon ?? []),
    [allPokemon],
  );
  const moveAutocomplete = useMemo(
    () => new AutocompleteService(allMoves ?? []),
    [allMoves],
  );
  const abilityAutocomplete = useMemo(
    () => new AutocompleteService(allAbilities ?? []),
    [allAbilities],
  );
  const actionNameAutocomplete = useActionNameAutocomplete();
  const teamsItems: SelectProps['options'] = teams.map(({ name, id }) => ({
    label: name,
    value: id,
  }));

  const interceptOnFinish = (data: EditBattleFormData) => {
    data.trainingId = trainingId;
    data.id = battle.id;
    data.turns.forEach((turn, index) => {
      turn.index = index;
      turn.actions.forEach((action, actionIndex) => {
        action.index = actionIndex;
      });
    });
    return onFinish(data);
  };

  useEffect(() => {
    if (state.success) {
      Promise.all([
        queryClient.invalidateQueries({ queryKey: TrainingKeys.trainings() }),
        queryClient.invalidateQueries({
          queryKey: TrainingKeys.training(trainingId),
        }),
        queryClient.invalidateQueries({
          queryKey: TrainingKeys.battle(trainingId, battle.id),
        }),
      ]).catch((reason) => console.warn('Failed to invalidate query', reason));
      onSuccess?.();
    }
  }, [state.success, form, onSuccess, trainingId, battle]);

  return (
    <EditBattleFormContext.Provider
      value={{
        form,
        pokemonAutocomplete,
        moveAutocomplete,
        abilityAutocomplete,
        actionNameAutocomplete,
      }}
    >
      <BattleForm
        name="editBattle"
        form={form}
        scrollToFirstError
        initialValues={initialData}
        onFinish={interceptOnFinish}
      >
        {'error' in state && (
          <FormItem>
            <Alert message={state.error} type="error" />
          </FormItem>
        )}
        <BattleFormItem
          name="name"
          rules={[{ required: true, message: 'Please enter a name' }]}
          validateStatus={getValidateStatus(state, 'name', isPending)}
        >
          <Input placeholder="Name" />
        </BattleFormItem>
        <BattleFormItem
          name="result"
          validateStatus={getValidateStatus(state, 'result', isPending)}
        >
          <Select placeholder="Result" options={resultOptions} />
        </BattleFormItem>
        <Flex justify="space-between">
          <BattleFormItem
            name="format"
            validateStatus={getValidateStatus(state, 'format', isPending)}
          >
            <FormatInput additionalYearOptions={[{ value: null }]} />
          </BattleFormItem>
          <BattleFormItem name="teamId" label="Team">
            <Select
              placeholder="Team"
              className="min-w-[200px]"
              options={[{ value: null }, ...teamsItems]}
            />
          </BattleFormItem>
        </Flex>
        <BattleFormItem
          name="notes"
          validateStatus={getValidateStatus(state, 'notes', isPending)}
        >
          <Input.TextArea placeholder="Notes" rows={4} />
        </BattleFormItem>
        <FormList name="turns">
          {(fields, { add, remove, move }) => (
            <Flex gap={10} vertical>
              {fields.map(({ key, name }, index) => (
                <TurnFormFields
                  key={key}
                  namePrefix={['turns']}
                  name={name}
                  index={index}
                  remove={() => remove(name)}
                  move={move}
                />
              ))}
              <FormItem>
                <Button
                  type="dashed"
                  block
                  onClick={() => add(defaultTurn)}
                  icon={<PlusOutlined />}
                >
                  Add turn
                </Button>
              </FormItem>
            </Flex>
          )}
        </FormList>
        <FormItem>
          <Flex gap={3}>
            <Button onClick={onCancel}>Cancel</Button>
            <Button type="primary" htmlType="submit">
              Save
            </Button>
          </Flex>
        </FormItem>
      </BattleForm>
    </EditBattleFormContext.Provider>
  );
};

export default EditBattle;
