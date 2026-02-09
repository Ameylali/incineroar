import { InboxOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { Alert, Button, Form, Input, Modal, Select } from 'antd';
import { useWatch } from 'antd/es/form/Form';
import FormItem from 'antd/es/form/FormItem';
import Dragger, { type DraggerProps } from 'antd/es/upload/Dragger';
import { useEffect, useMemo, useState } from 'react';

import { SHOWDOWN_USERNAME } from '@/src/constants/localstorage-keys';
import { TrainingKeys } from '@/src/constants/query-keys';
import useFormAction, { getValidateStatus } from '@/src/hooks/useFormAction';
import { Training } from '@/src/types/api';
import {
  BattleDataSource,
  FormActionState,
  ImportBattlesFormData,
} from '@/src/types/form';
import { readFile } from '@/src/utils/file';
import { queryClient } from '@/src/utils/query-clients';

import { importBattles } from '../actions';

const ImportForm = Form<ImportBattlesFormData>;
const ImportFormItem = FormItem<ImportBattlesFormData>;

interface ImportBattlesModalProps {
  isOpen: boolean;
  closeModal: () => void;
  training: Training;
}

interface DataSource {
  label: string;
  value: BattleDataSource;
}

const parseFile = (content: string, username?: string) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/html');
  const elements = doc.getElementsByClassName('battle-log-data');
  const data = elements[0].innerHTML ?? '';
  let playerTag: 'p1' | 'p2' = 'p1';
  if (username) {
    const regex = new RegExp(`\\|player\\|p2\\|${username.toLowerCase()}`);
    if (data.match(regex)) {
      playerTag = 'p2';
    }
  }
  return { data, playerTag };
};

export const ImportBattlesModal = ({
  closeModal,
  isOpen,
  training,
}: ImportBattlesModalProps) => {
  const INITIAL_STATE: FormActionState<
    ImportBattlesFormData & { username: string }
  > = {
    success: false,
    data: {
      trainingId: training.id,
      source: 'showdown-sim-protocol',
      battles: [],
      username: localStorage.getItem(SHOWDOWN_USERNAME) ?? '',
    },
  };
  const { state, form, onFinish, isPending } =
    useFormAction<ImportBattlesFormData>(INITIAL_STATE, importBattles);
  const [files, setFiles] = useState<DraggerProps['fileList']>([]);
  const source = useWatch('source', form);
  const username = useWatch('username', form) as string | undefined;
  const sources = [
    {
      label: 'Showdown',
      value: 'showdown-sim-protocol',
    },
  ] satisfies ReadonlyArray<DataSource>;
  const acceptedFileExtension = useMemo(() => {
    switch (source) {
      case 'showdown-sim-protocol':
        return '.html';
      default:
        return '';
    }
  }, [source]);
  const intertecptOnFinish = async (data: ImportBattlesFormData) => {
    const battles = await Promise.all(
      (files ?? []).map(async (file) => {
        if (!file.originFileObj) {
          console.warn('Missing origin file data');
          return { name: '', data: '' };
        }
        const result = parseFile(await readFile(file.originFileObj), username);
        return {
          name: file.name.replace('.html', ''),
          ...result,
        };
      }),
    );
    onFinish({
      ...data,
      battles,
    });
  };

  useEffect(() => {
    if (state.success) {
      if (username) {
        localStorage.setItem(SHOWDOWN_USERNAME, username.toLowerCase());
      }
      closeModal();
      form.resetFields();
      const trainingId = training.id;
      Promise.all([
        queryClient.invalidateQueries({ queryKey: TrainingKeys.trainings() }),
        trainingId
          ? queryClient.invalidateQueries({
              queryKey: TrainingKeys.training(trainingId),
            })
          : Promise.resolve(),
      ]).catch((reason) => console.warn('Failed to invalidate query', reason));
    }
  }, [state.success, closeModal, form, training, username]);

  return (
    <Modal
      title="Import battles"
      open={isOpen}
      onCancel={closeModal}
      footer={[
        <Button key="back" onClick={closeModal} disabled={isPending}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          onClick={() => form.submit()}
          loading={isPending}
        >
          Import
        </Button>,
      ]}
    >
      <ImportForm
        name="importBattles"
        form={form}
        initialValues={state}
        labelCol={{ span: 4 }}
        onFinish={(d) => void intertecptOnFinish(d)}
      >
        {'error' in state && (
          <FormItem>
            <Alert message={state.error} type="error" />
          </FormItem>
        )}
        <ImportFormItem name="trainingId" hidden>
          <Input />
        </ImportFormItem>
        <ImportFormItem
          name="source"
          label="Source"
          validateStatus={getValidateStatus(state, 'source', isPending)}
          required
        >
          <Select options={sources} />
        </ImportFormItem>
        <FormItem name="username" label="Username">
          <Input placeholder="Your showdown username" />
        </FormItem>
        <ImportFormItem name="battles">
          <Dragger
            multiple
            accept={acceptedFileExtension}
            beforeUpload={() => false}
            fileList={files}
            onChange={(info) => setFiles(info.fileList)}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">
              Click or drag files to this area to upload
            </p>
          </Dragger>
        </ImportFormItem>
      </ImportForm>
    </Modal>
  );
};

interface ImportBattlesProps {
  training: Training;
}

const ImportBattles = ({ training }: ImportBattlesProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        icon={<PlusCircleOutlined />}
        onClick={() => setIsModalOpen(true)}
      >
        Import battle
      </Button>
      {isModalOpen && (
        <ImportBattlesModal
          isOpen={isModalOpen}
          closeModal={() => setIsModalOpen(false)}
          training={training}
        />
      )}
    </>
  );
};

export default ImportBattles;
