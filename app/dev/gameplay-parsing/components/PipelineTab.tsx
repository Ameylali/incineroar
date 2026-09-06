'use client';

import {
  FileImageOutlined,
  PauseOutlined,
  PlayCircleOutlined,
  RobotOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { Button, Card, Input, Progress, Select, Upload } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  DEFAULT_CONFIG,
  type ExecutionController,
  type ExtractedParagraph,
  type GameplayParsingConfig,
  getDefaultWorkerCount,
  LLM_MODELS,
  LLMEngine,
  type LLMModelSize,
  type LLMProgress,
  type ParsingProgress,
  type StructuredParsingProgress,
} from '@/src/services/gameplay-parsing';
import type { CreateBattleData } from '@/src/types/api';

import {
  createBattleMetadata,
  createMaskPreviewUrl,
  runGameplayPipeline,
  runImageOcr,
  runStructuredParsing,
} from '../utils';
import ConfigForm from './ConfigForm';
import ResultsDisplay from './ResultsDisplay';

const PipelineTab = () => {
  const [config, setConfig] = useState<GameplayParsingConfig>({
    ...DEFAULT_CONFIG,
  });
  const [file, setFile] = useState<File | null>(null);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState<ParsingProgress | null>(null);
  const [results, setResults] = useState<ExtractedParagraph[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageProcessedUrl, setImageProcessedUrl] = useState<string | null>(
    null,
  );
  const [imageRunning, setImageRunning] = useState(false);
  const [imageResults, setImageResults] = useState<ExtractedParagraph[] | null>(
    null,
  );
  const [imageError, setImageError] = useState<string | null>(null);
  const [llmProgress, setLlmProgress] = useState<LLMProgress | null>(null);
  const [llmLoading, setLlmLoading] = useState(false);
  const [structuredRunning, setStructuredRunning] = useState(false);
  const [simProtocol, setSimProtocol] = useState<string | null>(null);
  const [battleData, setBattleData] = useState<CreateBattleData | null>(null);
  const [structuredError, setStructuredError] = useState<string | null>(null);
  const [structuredProgress, setStructuredProgress] =
    useState<StructuredParsingProgress | null>(null);
  const [playerTag, setPlayerTag] = useState('p1');
  const [modelSize, setModelSize] = useState<LLMModelSize>('medium');
  const llmEngineRef = useRef(new LLMEngine());
  const pauseResolveRef = useRef<(() => void) | null>(null);
  const isPausedRef = useRef(false);

  useEffect(() => {
    setConfig((previous) => ({
      ...previous,
      WORKER_COUNT: getDefaultWorkerCount(),
    }));
  }, []);

  const createController = useCallback(
    (): ExecutionController => ({
      checkPause: () => {
        if (!isPausedRef.current) return Promise.resolve();
        return new Promise<void>((resolve) => {
          pauseResolveRef.current = resolve;
        });
      },
    }),
    [],
  );

  const handlePause = useCallback(() => {
    isPausedRef.current = true;
    setPaused(true);
  }, []);

  const handleResume = useCallback(() => {
    isPausedRef.current = false;
    setPaused(false);
    pauseResolveRef.current?.();
    pauseResolveRef.current = null;
  }, []);

  const handleRun = useCallback(async () => {
    if (!file) return;
    setRunning(true);
    setError(null);
    setResults(null);
    setProgress(null);
    setPaused(false);
    isPausedRef.current = false;

    try {
      console.log('[PipelineTab] Starting pipeline...');
      setResults(
        await runGameplayPipeline(
          file,
          config,
          setProgress,
          createController(),
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unknown error occurred',
      );
    } finally {
      setRunning(false);
      isPausedRef.current = false;
      pauseResolveRef.current = null;
    }
  }, [file, config, createController]);

  const handleImageTest = useCallback(async () => {
    if (!imageFile) return;
    setImageRunning(true);
    setImageError(null);
    setImageResults(null);
    setImageProcessedUrl(null);

    try {
      console.log('[PipelineTab] Starting image OCR test...');
      const { imageData, paragraphs } = await runImageOcr(imageFile, config);
      setImageProcessedUrl(createMaskPreviewUrl(imageData, config));
      setImageResults(paragraphs);
    } catch (err) {
      setImageError(
        err instanceof Error ? err.message : 'An unknown error occurred',
      );
    } finally {
      setImageRunning(false);
    }
  }, [imageFile, config]);

  const handleLoadLLM = useCallback(async () => {
    setLlmLoading(true);
    setStructuredError(null);
    try {
      await llmEngineRef.current.init(setLlmProgress, modelSize);
    } catch (err) {
      setStructuredError(
        err instanceof Error ? err.message : 'Failed to load LLM model',
      );
    } finally {
      setLlmLoading(false);
    }
  }, [modelSize]);

  const handleStructuredParse = useCallback(async () => {
    if (!results) return;
    setStructuredRunning(true);
    setStructuredError(null);
    setSimProtocol(null);
    setBattleData(null);
    setStructuredProgress(null);

    try {
      const { simProtocol, battleData } = await runStructuredParsing(
        results,
        llmEngineRef.current,
        createBattleMetadata(file?.name ?? 'Parsed Battle', playerTag),
        setStructuredProgress,
      );
      setSimProtocol(simProtocol);
      setBattleData(battleData);
    } catch (err) {
      setStructuredError(
        err instanceof Error ? err.message : 'Structured parsing failed',
      );
    } finally {
      setStructuredRunning(false);
    }
  }, [results, file, playerTag]);

  const progressPercent =
    progress && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  return (
    <div className="flex flex-col gap-6">
      <Card title="Video">
        <Upload
          accept="video/*"
          maxCount={1}
          beforeUpload={(uploadedFile) => {
            setFile(uploadedFile);
            setResults(null);
            setError(null);
            return false;
          }}
          onRemove={() => {
            setFile(null);
            setResults(null);
          }}
        >
          <Button icon={<UploadOutlined />} disabled={running}>
            Select video
          </Button>
        </Upload>
      </Card>

      <Card title="Image OCR Test">
        <div className="flex flex-col gap-4">
          <Upload
            accept="image/*"
            maxCount={1}
            beforeUpload={(uploadedFile) => {
              setImageFile(uploadedFile);
              setImagePreviewUrl(URL.createObjectURL(uploadedFile));
              setImageResults(null);
              setImageError(null);
              return false;
            }}
            onRemove={() => {
              setImageFile(null);
              setImagePreviewUrl(null);
              setImageProcessedUrl(null);
              setImageResults(null);
            }}
          >
            <Button icon={<FileImageOutlined />} disabled={imageRunning}>
              Select image
            </Button>
          </Upload>
          {(imagePreviewUrl || imageProcessedUrl) && (
            <div className="grid grid-cols-2 gap-4">
              {imagePreviewUrl && (
                <div>
                  <p className="mb-2 text-sm text-gray-500">Original:</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreviewUrl}
                    alt="Uploaded preview"
                    className="max-w-full rounded border"
                  />
                </div>
              )}
              {imageProcessedUrl && (
                <div>
                  <p className="mb-2 text-sm text-gray-500">
                    Processed (with masks):
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageProcessedUrl}
                    alt="Processed with masks"
                    className="max-w-full rounded border"
                  />
                </div>
              )}
            </div>
          )}
          <Button
            type="primary"
            disabled={!imageFile || imageRunning}
            loading={imageRunning}
            onClick={() => void handleImageTest()}
          >
            {imageRunning ? 'Extracting...' : 'Run OCR on Image'}
          </Button>
          {imageError && <p className="text-red-500">{imageError}</p>}
          {imageResults && (
            <div>
              <p className="mb-2 font-medium">
                Results ({imageResults.length} paragraphs)
              </p>
              {imageResults.length === 0 ? (
                <p className="text-orange-500">
                  No text extracted. Check browser console for OCR debug logs.
                </p>
              ) : (
                <ResultsDisplay paragraphs={imageResults} />
              )}
            </div>
          )}
        </div>
      </Card>

      <Card title="Configuration">
        <ConfigForm config={config} onChange={setConfig} disabled={running} />
      </Card>

      <div className="flex gap-2">
        <Button
          type="primary"
          size="large"
          disabled={!file || running}
          loading={running && !paused}
          onClick={() => void handleRun()}
        >
          {running ? 'Processing...' : 'Run Algorithm'}
        </Button>
        {running && (
          <Button
            size="large"
            icon={paused ? <PlayCircleOutlined /> : <PauseOutlined />}
            onClick={paused ? handleResume : handlePause}
          >
            {paused ? 'Resume' : 'Pause'}
          </Button>
        )}
      </div>

      {running && progress && (
        <Card
          title={`Phase: ${progress.phase}${paused ? ' (Paused)' : ''}`}
          extra={
            paused && (
              <span className="text-orange-500">Paused - analyze frame</span>
            )
          }
        >
          <Progress
            percent={progressPercent}
            format={() => `${progress.current} / ${progress.total}`}
            status={paused ? 'exception' : 'active'}
          />
          {(progress.frameImageUrl || progress.processedFrameImageUrl) && (
            <div className="mt-4 grid grid-cols-2 gap-4">
              {progress.frameImageUrl && (
                <div>
                  <p className="mb-2 text-sm text-gray-500">Original frame:</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={progress.frameImageUrl}
                    alt={`Original frame ${progress.current}`}
                    className="max-w-full rounded border"
                  />
                </div>
              )}
              {progress.processedFrameImageUrl && (
                <div>
                  <p className="mb-2 text-sm text-gray-500">Processed frame:</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={progress.processedFrameImageUrl}
                    alt={`Processed frame ${progress.current}`}
                    className="max-w-full rounded border"
                  />
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {error && (
        <Card title="Error">
          <p className="text-red-500">{error}</p>
        </Card>
      )}
      {results && (
        <Card title={`Results (${results.length} paragraphs)`}>
          <ResultsDisplay paragraphs={results} />
        </Card>
      )}
      {results && results.length > 0 && (
        <Card title="Structured Parsing (LLM)">
          <div className="flex flex-col gap-4">
            {!llmEngineRef.current.isReady() && !llmLoading && (
              <div className="flex flex-col gap-3">
                <p className="mb-2 text-sm text-gray-500">
                  Load an LLM model to convert OCR text into structured battle
                  data.
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm">Model:</span>
                  <Select
                    value={modelSize}
                    onChange={setModelSize}
                    style={{ width: 240 }}
                    options={Object.entries(LLM_MODELS).map(([key, model]) => ({
                      value: key,
                      label: `${model.label} — ${model.description}`,
                    }))}
                  />
                </div>
                <Button
                  icon={<RobotOutlined />}
                  onClick={() => void handleLoadLLM()}
                >
                  Load LLM Model
                </Button>
              </div>
            )}
            {llmLoading && llmProgress && (
              <div>
                <p className="mb-2 text-sm">{llmProgress.text}</p>
                <Progress
                  percent={Math.round(llmProgress.progress * 100)}
                  status="active"
                />
              </div>
            )}
            {llmEngineRef.current.isReady() && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Your player tag:</span>
                  <Input
                    value={playerTag}
                    onChange={(event) => setPlayerTag(event.target.value)}
                    style={{ width: 80 }}
                    disabled={structuredRunning}
                  />
                </div>
                <Button
                  type="primary"
                  icon={<RobotOutlined />}
                  loading={structuredRunning}
                  onClick={() => void handleStructuredParse()}
                >
                  {structuredRunning ? 'Parsing...' : 'Convert to Battle Data'}
                </Button>
                {structuredRunning && structuredProgress && (
                  <Progress
                    percent={Math.round(
                      (structuredProgress.current / structuredProgress.total) *
                        100,
                    )}
                    format={() =>
                      `${structuredProgress.current} / ${structuredProgress.total} lines`
                    }
                    status="active"
                  />
                )}
              </div>
            )}
            {structuredError && (
              <p className="text-red-500">{structuredError}</p>
            )}
            {simProtocol && (
              <div>
                <p className="mb-2 font-medium">Generated Sim-Protocol:</p>
                <pre className="max-h-64 overflow-auto rounded bg-gray-100 p-3 text-xs dark:bg-gray-800">
                  {simProtocol}
                </pre>
              </div>
            )}
            {battleData && (
              <div>
                <p className="mb-2 font-medium">
                  Parsed Battle: {battleData.turns.length} turns
                  {battleData.result && `, result: ${battleData.result}`}
                </p>
                <pre className="max-h-64 overflow-auto rounded bg-gray-100 p-3 text-xs dark:bg-gray-800">
                  {JSON.stringify(battleData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default PipelineTab;
