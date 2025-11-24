import { PlusCircleOutlined } from '@ant-design/icons';
import { Alert, Button, Form, FormInstance, Input, Modal, Select } from 'antd';
import FormItem from 'antd/es/form/FormItem';
import TextArea from 'antd/es/input/TextArea';
import Compact from 'antd/es/space/Compact';
import { useEffect, useMemo, useState } from 'react';

import { UserKeys } from '@/src/constants/query-keys';
import useFormAction, { getValidateStatus } from '@/src/hooks/useFormAction';
import { CreateTeamData, Team, UpdateTeamData } from '@/src/types/api';
import { FormActionState } from '@/src/types/form';
import { queryClient } from '@/src/utils/query-client';

import { createTeam, CreateTeamActionState, updateTeam } from '../actions';

const TeamFormItem = FormItem<CreateTeamData>;

const INITIAL_STATE: CreateTeamActionState = {
  success: false,
  data: {
    name: '',
    description: '',
    season: new Date().getFullYear(),
    regulation: '',
    tags: [],
    data: '',
  },
};

type TeamFormProps<T extends CreateTeamData | UpdateTeamData> = {
  form: FormInstance<T>;
  onFinish: (values: T) => void;
  initialValues: T;
  state: FormActionState<T>;
  isPending: boolean;
  isEdit?: boolean;
};

const TeamForm = <T extends CreateTeamData | UpdateTeamData>(
  props: TeamFormProps<T>,
) => {
  const CreateOrUpdateForm = Form<T>;
  const yearValues = Array.from(
    { length: new Date().getFullYear() - 2008 + 2 },
    (_, i) => 2008 + i,
  )
    .map((year) => ({ value: year.toString() }))
    .reverse();
  const { state, isPending, initialValues } = props;
  const onFinish = (data: T) => {
    const newData = data;
    if (props.isEdit && 'data' in state) {
      (newData as UpdateTeamData).id = (state.data as UpdateTeamData).id;
    }
    props.onFinish(newData);
  };
  const TeamFormContent = useMemo(
    () => (
      <>
        <TeamFormItem
          name="name"
          label="Name"
          rules={[{ required: true, message: 'Please enter a team name' }]}
          validateStatus={getValidateStatus(state, 'name', isPending)}
        >
          <Input />
        </TeamFormItem>
        <TeamFormItem
          name="description"
          label="Description"
          validateStatus={getValidateStatus(state, 'description', isPending)}
        >
          <TextArea autoSize />
        </TeamFormItem>
        <TeamFormItem
          name="regulation"
          label="Regulation"
          rules={[{ required: true, message: 'Please enter the regulation' }]}
          validateStatus={getValidateStatus(state, 'regulation', isPending)}
        >
          <Compact block>
            <TeamFormItem name="season" noStyle>
              <Select options={yearValues} />
            </TeamFormItem>
            <Input />
          </Compact>
        </TeamFormItem>
        <TeamFormItem
          name="tags"
          label="Tags"
          validateStatus={getValidateStatus(state, 'tags', isPending)}
        >
          <Select className="w-full" mode="tags" placeholder="Enter tags" />
        </TeamFormItem>
        <TeamFormItem
          name="data"
          label="Data"
          rules={[{ required: true, message: 'Please enter the team data' }]}
          validateStatus={getValidateStatus(state, 'data', isPending)}
        >
          <TextArea autoSize={{ minRows: 4, maxRows: 12 }} />
        </TeamFormItem>
      </>
    ),
    [state, isPending, yearValues],
  );

  return (
    <CreateOrUpdateForm
      name={props.isEdit ? 'editTeam' : 'createTeam'}
      form={props.form}
      onFinish={onFinish}
      initialValues={initialValues}
      labelCol={{ span: 5 }}
    >
      {'error' in state && (
        <FormItem>
          <Alert message={state.error} type="error" />
        </FormItem>
      )}
      {TeamFormContent}
    </CreateOrUpdateForm>
  );
};

type TeamFormModalProps<T extends CreateTeamData | UpdateTeamData> = {
  closeModal: () => void;
  isOpen: boolean;
  action: (
    state: FormActionState<T>,
    formData: FormData,
  ) => Promise<FormActionState<T>>;
} & (T extends UpdateTeamData ? { team: Team } : { team?: undefined });

const TeamFormModal = <T extends CreateTeamData | UpdateTeamData>(
  props: TeamFormModalProps<T>,
) => {
  const { isOpen, closeModal } = props;
  const isEdit = !!props.team;
  const initialState = isEdit
    ? { success: false, data: props.team }
    : INITIAL_STATE;
  const { state, form, onFinish, isPending } = useFormAction<T>(
    initialState as FormActionState<T>,
    props.action as (
      state: FormActionState<T>,
      formData: FormData,
    ) => Promise<FormActionState<T>>,
  );
  const initialValues = (state.success ? initialState.data : state.data) as T;
  const CreateOrUpdateTeamForm = TeamForm<T>;

  useEffect(() => {
    if (state.success) {
      closeModal();
      form.resetFields();
      const teamId = isEdit ? props.team.id : undefined;
      Promise.all([
        queryClient.invalidateQueries({ queryKey: UserKeys.me() }),
        teamId
          ? queryClient.invalidateQueries({ queryKey: UserKeys.team(teamId) })
          : Promise.resolve(),
      ]).catch(() => console.error('Failed to invalidate user query'));
    }
  }, [state.success, closeModal, form, isEdit, props.team]);

  return (
    <Modal
      title={isEdit ? 'Edit team' : 'Import new team'}
      open={isOpen}
      onCancel={closeModal}
      footer={[
        <Button key="back" onClick={closeModal}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" onClick={() => form.submit()}>
          {isEdit ? 'Save changes' : 'Submit'}
        </Button>,
      ]}
    >
      <CreateOrUpdateTeamForm
        form={form}
        onFinish={onFinish}
        initialValues={initialValues}
        state={state}
        isPending={isPending}
        isEdit={!!props.team}
      />
    </Modal>
  );
};

interface EditTeamModalProps {
  isOpen: boolean;
  closeModal: () => void;
  team: Team;
}

export const EditTeamModal = ({
  isOpen,
  closeModal,
  team,
}: EditTeamModalProps) => {
  const EditModal = TeamFormModal<UpdateTeamData>;
  return (
    <EditModal
      isOpen={isOpen}
      closeModal={closeModal}
      action={updateTeam}
      team={team}
    />
  );
};

export const ImportTeamModal = () => {
  const EditModal = TeamFormModal<CreateTeamData>;
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        type="primary"
        icon={<PlusCircleOutlined />}
        onClick={() => setIsModalOpen(true)}
      >
        Import team
      </Button>
      <EditModal
        isOpen={isModalOpen}
        closeModal={() => setIsModalOpen(false)}
        action={createTeam}
      />
    </>
  );
};
