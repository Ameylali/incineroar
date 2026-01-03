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
import useAllPokemonQuery from '@/src/hooks/useAllPokemonQuery';
import useFormAction, { getValidateStatus } from '@/src/hooks/useFormAction';
import AutocompleteService from '@/src/services/autocomplete';
import { Action, Battle, Team, Turn } from '@/src/types/api';
import { EditBattleFormData } from '@/src/types/form';
import { toOptions } from '@/src/utils/antd-adapters';
import { queryClient } from '@/src/utils/query-clients';

import FormatInput from '../../components/FormatInput';
import { editBattle } from '../actions';

const BattleForm = Form<EditBattleFormData>;
const BattleFormItem = FormItem<EditBattleFormData>;
const ActionFormItem = FormItem<Action[]>;

interface IEditBattleFormContext {
  autocompleteService?: AutocompleteService;
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

const getOptions = ({
  searchText,
  player,
  pokemonP1,
  pokemonP2,
  autocompleteService,
}: {
  searchText: string;
  player?: Action['player'] | null;
  pokemonP1: string[];
  pokemonP2: string[];
  autocompleteService?: AutocompleteService;
}) => {
  const list: string[] = [];
  const playerTag = searchText.includes(':')
    ? searchText.split(':')[0]
    : player;
  const searchPokemon = searchText.replace(`${playerTag}:`, '');
  if (playerTag === 'p1') {
    list.push(
      ...pokemonP1.filter(
        (name) => autocompleteService?.hasWord(name) ?? false,
      ),
    );
  }
  if (playerTag === 'p2') {
    list.push(
      ...pokemonP2.filter(
        (name) => autocompleteService?.hasWord(name) ?? false,
      ),
    );
  }
  if (autocompleteService && searchPokemon.length >= 2) {
    list.push(...(autocompleteService.getSuggestions(searchPokemon) ?? []));
  }
  return Array.from(new Set(list));
};

const PokemonInput = ({ player, value, onChange }: PokemonInputProps) => {
  const { autocompleteService, form } = useContext(EditBattleFormContext);
  const turns = useWatch(['turns'], form);
  const pokemonP1 = useMemo(
    () =>
      filterPokemonByPlayer(
        (turns ?? []).flatMap((turn) => turn.actions),
        'p1',
      ),
    [turns],
  );
  const pokemonP2 = useMemo(
    () =>
      filterPokemonByPlayer(
        (turns ?? []).flatMap((turn) => turn.actions),
        'p2',
      ),
    [turns],
  );
  const baseOptions = useMemo(
    () =>
      getOptions({
        searchText: value ?? '',
        player,
        pokemonP1,
        pokemonP2,
        autocompleteService,
      }),
    [value, player, pokemonP1, pokemonP2, autocompleteService],
  );
  const [options, setOptions] = useState<string[]>([]);
  const [, startTransition] = useTransition();

  const onSearch: SelectProps['onSearch'] = (searchText) => {
    startTransition(() => {
      const list = getOptions({
        searchText,
        player,
        pokemonP1,
        pokemonP2,
        autocompleteService,
      });
      setOptions(list);
    });
  };

  const withTagOnChange = (val: string) => {
    if (value?.includes(':') && !value.startsWith(val) && !val.includes(':')) {
      const [prefix] = value.split(':');
      onChange?.(`${prefix}:${val}`);
      return;
    }
    onChange?.(val);
  };

  return (
    <AutoComplete
      value={value}
      onChange={withTagOnChange}
      options={toOptions(options.length > 0 ? options : baseOptions)}
      onSearch={onSearch}
      className="min-w-[200px]"
      defaultOpen
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
        <Input />
      </ActionFormItem>
      <ActionFormItem name={[baseName, 'targets']} label="Targets">
        <Select
          className="min-w-[150px]"
          mode="tags"
          placeholder="Enter targets"
        />
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
  const defaultTurn: Action = {
    index: 0,
    name: '',
    type: 'move',
    user: '',
    targets: [],
  };
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
                onClick={() => add(defaultTurn)}
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
  const { data } = useAllPokemonQuery();
  const autocompleteService = useMemo(
    () => new AutocompleteService(data ?? []),
    [data],
  );
  const teamsItems: SelectProps['options'] = teams.map(({ name, id }) => ({
    label: name,
    value: id,
  }));
  const defaultTurn: Turn = {
    index: 0,
    actions: [
      {
        index: 0,
        name: '',
        type: 'move',
        user: '',
        targets: [],
      },
    ],
  };
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
        autocompleteService,
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
