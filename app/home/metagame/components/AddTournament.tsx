'use client';

import { PlusCircleOutlined } from '@ant-design/icons';
import { Alert, Button, Form, Input, Modal, Select } from 'antd';
import { useWatch } from 'antd/es/form/Form';
import FormItem from 'antd/es/form/FormItem';
import TextArea from 'antd/es/input/TextArea';
import { useEffect, useMemo, useState } from 'react';

import { MetagameKeys } from '@/src/constants/query-keys';
import useFormAction, { getValidateStatus } from '@/src/hooks/useFormAction';
import { AddTournamentFormData } from '@/src/types/form';
import { queryClient } from '@/src/utils/query-clients';

import FormatInput from '../../components/FormatInput';
import { createTournament, CreateTournamentActionState } from '../actions';

const TournamentForm = Form<AddTournamentFormData>;
const TournamentFormItem = FormItem<AddTournamentFormData>;

const INITIAL_STATE: CreateTournamentActionState = {
  success: false,
  data: {
    name: '',
    season: new Date().getFullYear(),
    format: '',
    source: 'pokedata',
    data: '',
  },
};

interface AddTournamentModalProps {
  isOpen: boolean;
  closeModal: () => void;
}

const AddTournamentModal = ({
  isOpen,
  closeModal,
}: AddTournamentModalProps) => {
  const { state, form, onFinish, isPending } =
    useFormAction<AddTournamentFormData>(INITIAL_STATE, createTournament);
  const sources = [
    { value: 'pokedata', label: 'Pokedata' },
    { value: 'pokedata_url', label: 'Pokedata URL' },
  ];
  const source = useWatch('source', form);
  const dataPlaceholder = useMemo(() => {
    switch (source) {
      case 'pokedata':
        return 'Paste pokedata JSON here...';
      case 'pokedata_url':
        return 'Enter URL to pokedata JSON...';
      default:
        return '';
    }
  }, [source]);

  useEffect(() => {
    if (state.success) {
      closeModal();
      form.resetFields();
      queryClient
        .invalidateQueries({ queryKey: MetagameKeys.tournaments() })
        .catch((reason) => console.warn('Failed to invalidate query', reason));
    }
  }, [state.success, closeModal, form]);

  return (
    <Modal
      title="Add tournament data"
      open={isOpen}
      onCancel={closeModal}
      footer={[
        <Button key="back" onClick={closeModal}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" onClick={() => form.submit()}>
          Submit
        </Button>,
      ]}
    >
      <TournamentForm
        name="createTournament"
        form={form}
        onFinish={onFinish}
        initialValues={state.success ? INITIAL_STATE : state.data}
        labelCol={{ span: 4 }}
      >
        {'error' in state && (
          <FormItem>
            <Alert message={state.error} type="error" />
          </FormItem>
        )}
        <TournamentFormItem
          name="name"
          label="Name"
          rules={[{ required: true, message: 'Please enter a name' }]}
          validateStatus={getValidateStatus(state, 'name', isPending)}
        >
          <Input />
        </TournamentFormItem>
        <TournamentFormItem
          name="format"
          label="Format"
          rules={[{ required: true, message: 'Please enter the format' }]}
          validateStatus={getValidateStatus(state, 'format', isPending)}
        >
          <FormatInput />
        </TournamentFormItem>
        <TournamentFormItem name="source" label="Source">
          <Select options={sources} />
        </TournamentFormItem>
        <TournamentFormItem
          name="data"
          label="Data"
          rules={[
            { required: true, message: 'Please enter the tournament data' },
          ]}
          validateStatus={getValidateStatus(state, 'data', isPending)}
        >
          <TextArea
            autoSize={{ minRows: 4, maxRows: 12 }}
            placeholder={dataPlaceholder}
          />
        </TournamentFormItem>
      </TournamentForm>
    </Modal>
  );
};

const AddTournament = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        type="primary"
        icon={<PlusCircleOutlined />}
        onClick={() => setIsModalOpen(true)}
      >
        Add tournament
      </Button>
      {isModalOpen && (
        <AddTournamentModal
          isOpen={isModalOpen}
          closeModal={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
};

export default AddTournament;
