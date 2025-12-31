import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  MinusCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Flex,
  Form,
  FormListFieldData,
  Input,
  Select,
  SelectProps,
} from 'antd';
import FormItem from 'antd/es/form/FormItem';
import FormList from 'antd/es/form/FormList';
import Text from 'antd/es/typography/Text';
import { useEffect } from 'react';

import { TrainingKeys } from '@/src/constants/query-keys';
import useFormAction, { getValidateStatus } from '@/src/hooks/useFormAction';
import { Action, Battle, Team, Turn } from '@/src/types/api';
import { EditBattleFormData } from '@/src/types/form';
import { queryClient } from '@/src/utils/query-clients';

import FormatInput from '../../components/FormatInput';
import { editBattle } from '../actions';

const BattleForm = Form<EditBattleFormData>;
const BattleFormItem = FormItem<EditBattleFormData>;
const ActionFormItem = FormItem<Action[]>;

interface ActionFormFieldsProps {
  index: number;
  name: FormListFieldData['name'];
  remove: () => void;
  move: (from: number, to: number) => void;
}

const ActionFormFields = ({
  name: baseName,
  remove,
  move,
  index,
}: ActionFormFieldsProps) => {
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

  return (
    <Flex justify="space-between">
      <ActionFormItem name={[baseName, 'user']} label="User">
        <Input />
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
  index: number;
  remove: () => void;
  move: (from: number, to: number) => void;
}

const TurnFormFields = ({
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
        <Input />
      </BattleFormItem>
      <BattleFormItem
        name="result"
        validateStatus={getValidateStatus(state, 'result', isPending)}
      >
        <Select options={resultOptions} />
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
            className="min-w-[200px]"
            options={[{ value: null }, ...teamsItems]}
          />
        </BattleFormItem>
      </Flex>
      <BattleFormItem
        name="notes"
        validateStatus={getValidateStatus(state, 'notes', isPending)}
      >
        <Input.TextArea rows={4} />
      </BattleFormItem>
      <FormList name="turns">
        {(fields, { add, remove, move }) => (
          <Flex gap={10} vertical>
            {fields.map(({ key, name }, index) => (
              <TurnFormFields
                key={key}
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
  );
};

export default EditBattle;
