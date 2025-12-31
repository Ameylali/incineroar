'use client';

import { PlusCircleOutlined } from '@ant-design/icons';
import { Alert, Button, Form, Input, Modal, Select, SelectProps } from 'antd';
import FormItem from 'antd/es/form/FormItem';
import TextArea from 'antd/es/input/TextArea';
import { useEffect, useState } from 'react';

import { TrainingKeys } from '@/src/constants/query-keys';
import useFormAction, { getValidateStatus } from '@/src/hooks/useFormAction';
import useUserQuery from '@/src/hooks/useUserQuery';
import { Team, Training } from '@/src/types/api';
import { AddTrainingFormData, EditTrainingFormData } from '@/src/types/form';
import { queryClient } from '@/src/utils/query-clients';

import FormatInput from '../../components/FormatInput';
import {
  AddTrainingActionState,
  createTraining,
  editTraining,
  EditTrainingActionState,
} from '../actions';

const TrainingForm = Form<AddTrainingFormData | EditTrainingFormData>;
const TrainingFormItem = FormItem<AddTrainingFormData | EditTrainingFormData>;

const INITIAL_STATE: AddTrainingActionState = {
  success: false,
  data: {
    name: '',
    teamId: undefined,
    season: undefined,
    format: undefined,
    description: '',
  },
};

interface AddOrEditTrainingModalProps {
  isOpen: boolean;
  closeModal: () => void;
  teams: Team[];
  isLoading?: boolean;
  training?: Training;
}

type AddOrEditTrainingAction = (
  _: AddTrainingActionState | EditTrainingActionState,
  form: FormData,
) => Promise<AddTrainingActionState | EditTrainingActionState>;

const AddOrEditTrainingModal = (props: AddOrEditTrainingModalProps) => {
  const { teams, closeModal, isLoading, isOpen } = props;
  const isEdit = !!props.training;
  const initialState = props.training
    ? {
        success: false,
        data: { teamId: props.training.team?.id, ...props.training },
      }
    : INITIAL_STATE;
  const { state, form, onFinish, isPending } = useFormAction<
    AddTrainingFormData | EditTrainingFormData
  >(
    initialState,
    (isEdit ? editTraining : createTraining) as AddOrEditTrainingAction,
  );
  const teamsItems: SelectProps['options'] = teams.map(({ name, id }) => ({
    label: name,
    value: id,
  }));
  const intertecptOnFinish = (
    data: AddTrainingFormData | EditTrainingFormData,
  ) => {
    const newData = data;
    if (isEdit && 'data' in state && 'id' in state.data) {
      (newData as EditTrainingFormData).id = state.data.id;
    }
    onFinish(newData);
  };

  useEffect(() => {
    if (state.success) {
      closeModal();
      form.resetFields();
      const trainingId = props.training?.id;
      Promise.all([
        queryClient.invalidateQueries({ queryKey: TrainingKeys.trainings() }),
        trainingId
          ? queryClient.invalidateQueries({
              queryKey: TrainingKeys.training(trainingId),
            })
          : Promise.resolve(),
      ]).catch((reason) => console.warn('Failed to invalidate query', reason));
    }
  }, [state.success, closeModal, form, props.training, isEdit]);

  return (
    <Modal
      title={`${isEdit ? 'Edit' : 'Add'} training`}
      open={isOpen}
      onCancel={closeModal}
      loading={isLoading}
      footer={[
        <Button key="back" onClick={closeModal}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" onClick={() => form.submit()}>
          {isEdit ? 'Update' : 'Submit'}
        </Button>,
      ]}
    >
      <TrainingForm
        name={`${isEdit ? 'edit' : 'create'}Training`}
        form={form}
        initialValues={initialState}
        labelCol={{ span: 4 }}
        onFinish={intertecptOnFinish}
      >
        {'error' in state && (
          <FormItem>
            <Alert message={state.error} type="error" />
          </FormItem>
        )}
        <TrainingFormItem
          name="name"
          label="Name"
          rules={[{ required: true, message: 'Please enter a name' }]}
          validateStatus={getValidateStatus(state, 'name', isPending)}
        >
          <Input />
        </TrainingFormItem>
        <TrainingFormItem
          name="format"
          label="Format"
          validateStatus={getValidateStatus(state, 'format', isPending)}
        >
          <FormatInput additionalYearOptions={[{ value: null }]} />
        </TrainingFormItem>
        <TrainingFormItem name="teamId" label="Team">
          <Select options={teamsItems} />
        </TrainingFormItem>
        <TrainingFormItem
          name="description"
          label="Description"
          validateStatus={getValidateStatus(state, 'description', isPending)}
        >
          <TextArea autoSize={{ minRows: 4, maxRows: 12 }} />
        </TrainingFormItem>
      </TrainingForm>
    </Modal>
  );
};

interface EditTrainingModalProps {
  closeModal: () => void;
  training?: Training | null;
  isOpen?: boolean;
}

export const EditTrainingModal = ({
  closeModal,
  training,
  isOpen,
}: EditTrainingModalProps) => {
  const { isLoading, data } = useUserQuery();
  if (!training) return null;
  return (
    <AddOrEditTrainingModal
      isOpen={isOpen ?? true}
      isLoading={isLoading}
      teams={data?.teams ?? []}
      closeModal={closeModal}
      training={training}
    />
  );
};

const AddTraining = () => {
  const { isLoading, data } = useUserQuery();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        type="primary"
        icon={<PlusCircleOutlined />}
        onClick={() => setIsModalOpen(true)}
      >
        Add training
      </Button>
      {isModalOpen && (
        <AddOrEditTrainingModal
          teams={data?.teams ?? []}
          isLoading={isLoading}
          isOpen={isModalOpen}
          closeModal={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
};

export default AddTraining;
