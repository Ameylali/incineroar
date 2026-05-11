'use client';

import {
  DeleteOutlined,
  FileImageOutlined,
  PlusOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Collapse,
  InputNumber,
  Progress,
  Switch,
  Tag,
  Upload,
} from 'antd';
import { useCallback, useState } from 'react';

import {
  DEFAULT_CONFIG,
  type ExtractedParagraph,
  type GameplayParsingConfig,
  TextExtractor,
} from '@/src/services/gameplay-parsing';

interface ExperimentConfig {
  id: number;
  label: string;
  config: GameplayParsingConfig;
}

interface ExperimentResult {
  id: number;
  label: string;
  config: GameplayParsingConfig;
  paragraphs: ExtractedParagraph[];
  totalText: string;
  avgConfidence: number;
  durationMs: number;
  error?: string;
}

let nextId = 1;

const createExperiment = (
  overrides?: Partial<GameplayParsingConfig>,
): ExperimentConfig => ({
  id: nextId++,
  label: `Experiment ${nextId - 1}`,
  config: { ...DEFAULT_CONFIG, ...overrides },
});

const PRESETS: { label: string; overrides: Partial<GameplayParsingConfig> }[] =
  [
    { label: 'Default', overrides: {} },
    {
      label: 'High contrast',
      overrides: {
        PREPROCESS: { ...DEFAULT_CONFIG.PREPROCESS, CONTRAST: 3.0 },
      },
    },
    {
      label: 'No preprocessing',
      overrides: {
        PREPROCESS: { GRAYSCALE: false, CONTRAST: 1, BLUR_RADIUS: 0 },
      },
    },
    {
      label: 'Grayscale only',
      overrides: {
        PREPROCESS: { GRAYSCALE: true, CONTRAST: 1, BLUR_RADIUS: 0 },
      },
    },
    {
      label: 'Strict confidence',
      overrides: {
        SELECTION: { MIN_LINE_CONFIDENCE: 0.8, MIN_WORD_CONFIDENCE: 0.7 },
      },
    },
    {
      label: 'Loose confidence',
      overrides: {
        SELECTION: { MIN_LINE_CONFIDENCE: 0.3, MIN_WORD_CONFIDENCE: 0.2 },
      },
    },
  ];

const ExperimentsTab = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [experiments, setExperiments] = useState<ExperimentConfig[]>([
    createExperiment(),
  ]);
  const [results, setResults] = useState<ExperimentResult[]>([]);
  const [running, setRunning] = useState(false);
  const [currentRun, setCurrentRun] = useState<number>(0);
  const [totalRuns, setTotalRuns] = useState<number>(0);

  const addExperiment = useCallback(
    (overrides?: Partial<GameplayParsingConfig>) => {
      setExperiments((prev) => [...prev, createExperiment(overrides)]);
    },
    [],
  );

  const removeExperiment = useCallback((id: number) => {
    setExperiments((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const updateExperiment = useCallback(
    (id: number, updater: (draft: GameplayParsingConfig) => void) => {
      setExperiments((prev) =>
        prev.map((exp) => {
          if (exp.id !== id) return exp;
          const next = structuredClone(exp);
          updater(next.config);
          return next;
        }),
      );
    },
    [],
  );

  const updateLabel = useCallback((id: number, label: string) => {
    setExperiments((prev) =>
      prev.map((exp) => (exp.id === id ? { ...exp, label } : exp)),
    );
  }, []);

  const runExperiments = useCallback(async () => {
    if (!imageFile || experiments.length === 0) return;

    setRunning(true);
    setResults([]);
    setCurrentRun(0);
    setTotalRuns(experiments.length);

    // Load image once
    const bitmap = await createImageBitmap(imageFile);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    bitmap.close();

    const allResults: ExperimentResult[] = [];

    for (let i = 0; i < experiments.length; i++) {
      const exp = experiments[i];
      setCurrentRun(i + 1);

      const start = performance.now();
      try {
        const extractor = new TextExtractor(exp.config);
        const paragraphs = await extractor.extractAll([
          { timestamp: 0, imageData },
        ]);
        await extractor.terminate();
        const durationMs = performance.now() - start;

        const allConfidences = paragraphs.flatMap((p) =>
          p.extractions.flatMap((e) => e.lineConfidences),
        );
        const avgConfidence =
          allConfidences.length > 0
            ? allConfidences.reduce((a, b) => a + b, 0) / allConfidences.length
            : 0;

        const totalText = paragraphs
          .flatMap((p) => p.extractions.map((e) => e.text))
          .join('\n');

        allResults.push({
          id: exp.id,
          label: exp.label,
          config: exp.config,
          paragraphs,
          totalText,
          avgConfidence,
          durationMs,
        });
      } catch (err) {
        allResults.push({
          id: exp.id,
          label: exp.label,
          config: exp.config,
          paragraphs: [],
          totalText: '',
          avgConfidence: 0,
          durationMs: performance.now() - start,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }

      setResults([...allResults]);
    }

    setRunning(false);
  }, [imageFile, experiments]);

  return (
    <div className="flex flex-col gap-6">
      <Card title="Test Image">
        <Upload
          accept="image/*"
          maxCount={1}
          beforeUpload={(f) => {
            setImageFile(f);
            setImagePreviewUrl(URL.createObjectURL(f));
            setResults([]);
            return false;
          }}
          onRemove={() => {
            setImageFile(null);
            setImagePreviewUrl(null);
            setResults([]);
          }}
        >
          <Button icon={<FileImageOutlined />} disabled={running}>
            Select image
          </Button>
        </Upload>
        {imagePreviewUrl && (
          <div className="mt-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreviewUrl}
              alt="Test image"
              className="max-h-48 rounded border"
            />
          </div>
        )}
      </Card>

      <Card
        title={`Experiments (${experiments.length})`}
        extra={
          <div className="flex gap-2">
            {PRESETS.map((preset) => (
              <Button
                key={preset.label}
                size="small"
                disabled={running}
                onClick={() => addExperiment(preset.overrides)}
              >
                + {preset.label}
              </Button>
            ))}
            <Button
              icon={<PlusOutlined />}
              size="small"
              disabled={running}
              onClick={() => addExperiment()}
            >
              Custom
            </Button>
          </div>
        }
      >
        <Collapse
          items={experiments.map((exp) => ({
            key: String(exp.id),
            label: (
              <input
                className="border-none bg-transparent font-medium outline-none"
                value={exp.label}
                onChange={(e) => updateLabel(exp.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                disabled={running}
              />
            ),
            extra: (
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                disabled={running || experiments.length <= 1}
                onClick={(e) => {
                  e.stopPropagation();
                  removeExperiment(exp.id);
                }}
              />
            ),
            children: (
              <ExperimentConfigForm
                config={exp.config}
                onChange={(updater) => updateExperiment(exp.id, updater)}
                disabled={running}
              />
            ),
          }))}
        />
      </Card>

      <div className="flex items-center gap-4">
        <Button
          type="primary"
          size="large"
          icon={<ThunderboltOutlined />}
          disabled={!imageFile || running || experiments.length === 0}
          loading={running}
          onClick={void runExperiments()}
        >
          {running
            ? `Running ${currentRun}/${totalRuns}...`
            : `Run ${experiments.length} experiment${experiments.length !== 1 ? 's' : ''}`}
        </Button>
        {running && (
          <Progress
            percent={Math.round((currentRun / totalRuns) * 100)}
            format={() => `${currentRun} / ${totalRuns}`}
            className="flex-1"
          />
        )}
      </div>

      {results.length > 0 && (
        <Card title="Comparison">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-2">Experiment</th>
                  <th className="p-2">Grayscale</th>
                  <th className="p-2">Contrast</th>
                  <th className="p-2">Blur</th>
                  <th className="p-2">Min Line Conf</th>
                  <th className="p-2">Min Word Conf</th>
                  <th className="p-2">Extracted Lines</th>
                  <th className="p-2">Avg Confidence</th>
                  <th className="p-2">Duration</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => {
                  const lineCount = r.paragraphs.reduce(
                    (sum, p) =>
                      sum +
                      p.extractions.reduce(
                        (s, e) => s + e.lineConfidences.length,
                        0,
                      ),
                    0,
                  );
                  const bestAvg = Math.max(
                    ...results
                      .filter((x) => !x.error)
                      .map((x) => x.avgConfidence),
                  );
                  const mostLines = Math.max(
                    ...results
                      .filter((x) => !x.error)
                      .map((x) =>
                        x.paragraphs.reduce(
                          (sum, p) =>
                            sum +
                            p.extractions.reduce(
                              (s, e) => s + e.lineConfidences.length,
                              0,
                            ),
                          0,
                        ),
                      ),
                  );

                  return (
                    <tr
                      key={r.id}
                      className="border-b hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <td className="p-2 font-medium">{r.label}</td>
                      <td className="p-2">
                        {r.config.PREPROCESS.GRAYSCALE ? 'Yes' : 'No'}
                      </td>
                      <td className="p-2">{r.config.PREPROCESS.CONTRAST}</td>
                      <td className="p-2">{r.config.PREPROCESS.BLUR_RADIUS}</td>
                      <td className="p-2">
                        {r.config.SELECTION.MIN_LINE_CONFIDENCE}
                      </td>
                      <td className="p-2">
                        {r.config.SELECTION.MIN_WORD_CONFIDENCE}
                      </td>
                      <td className="p-2">
                        <Tag
                          color={
                            lineCount === mostLines && lineCount > 0
                              ? 'green'
                              : undefined
                          }
                        >
                          {lineCount}
                        </Tag>
                      </td>
                      <td className="p-2">
                        <Tag
                          color={
                            r.avgConfidence === bestAvg && r.avgConfidence > 0
                              ? 'green'
                              : r.avgConfidence >= 70
                                ? 'orange'
                                : 'red'
                          }
                        >
                          {r.avgConfidence.toFixed(1)}%
                        </Tag>
                      </td>
                      <td className="p-2">
                        {(r.durationMs / 1000).toFixed(2)}s
                      </td>
                      <td className="p-2">
                        {r.error ? (
                          <Tag color="red">Error</Tag>
                        ) : r.totalText ? (
                          <Tag color="green">OK</Tag>
                        ) : (
                          <Tag color="orange">No text</Tag>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {results.length > 0 && (
        <Collapse
          items={results.map((r) => ({
            key: String(r.id),
            label: (
              <span>
                <Tag color={r.error ? 'red' : r.totalText ? 'green' : 'orange'}>
                  {r.label}
                </Tag>
                {r.error
                  ? r.error
                  : r.totalText
                    ? `${r.totalText.substring(0, 100)}${r.totalText.length > 100 ? '...' : ''}`
                    : 'No text extracted'}
              </span>
            ),
            children: r.error ? (
              <p className="text-red-500">{r.error}</p>
            ) : (
              <div className="flex flex-col gap-2">
                {r.paragraphs.flatMap((p) =>
                  p.extractions.map((ext, j) => (
                    <Card key={j} size="small" title={ext.mask.label}>
                      <p className="whitespace-pre-wrap">{ext.text}</p>
                      <div className="mt-2 flex gap-1">
                        {ext.lineConfidences.map((c, k) => (
                          <Tag
                            key={k}
                            color={
                              c >= 90 ? 'green' : c >= 70 ? 'orange' : 'red'
                            }
                          >
                            {c.toFixed(1)}%
                          </Tag>
                        ))}
                      </div>
                    </Card>
                  )),
                )}
              </div>
            ),
          }))}
        />
      )}
    </div>
  );
};

const ExperimentConfigForm = ({
  config,
  onChange,
  disabled,
}: {
  config: GameplayParsingConfig;
  onChange: (updater: (draft: GameplayParsingConfig) => void) => void;
  disabled?: boolean;
}) => (
  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
    <label>Grayscale</label>
    <Switch
      checked={config.PREPROCESS.GRAYSCALE}
      onChange={(v) => onChange((d) => (d.PREPROCESS.GRAYSCALE = v))}
      disabled={disabled}
    />

    <label>Contrast</label>
    <InputNumber
      min={0.1}
      max={5}
      step={0.1}
      value={config.PREPROCESS.CONTRAST}
      onChange={(v) =>
        onChange(
          (d) =>
            (d.PREPROCESS.CONTRAST = v ?? DEFAULT_CONFIG.PREPROCESS.CONTRAST),
        )
      }
      disabled={disabled}
    />

    <label>Blur radius</label>
    <InputNumber
      min={0}
      max={10}
      value={config.PREPROCESS.BLUR_RADIUS}
      onChange={(v) =>
        onChange(
          (d) =>
            (d.PREPROCESS.BLUR_RADIUS =
              v ?? DEFAULT_CONFIG.PREPROCESS.BLUR_RADIUS),
        )
      }
      disabled={disabled}
    />

    <label>Min line confidence</label>
    <InputNumber
      min={0}
      max={1}
      step={0.05}
      value={config.SELECTION.MIN_LINE_CONFIDENCE}
      onChange={(v) =>
        onChange(
          (d) =>
            (d.SELECTION.MIN_LINE_CONFIDENCE =
              v ?? DEFAULT_CONFIG.SELECTION.MIN_LINE_CONFIDENCE),
        )
      }
      disabled={disabled}
    />

    <label>Min word confidence</label>
    <InputNumber
      min={0}
      max={1}
      step={0.05}
      value={config.SELECTION.MIN_WORD_CONFIDENCE}
      onChange={(v) =>
        onChange(
          (d) =>
            (d.SELECTION.MIN_WORD_CONFIDENCE =
              v ?? DEFAULT_CONFIG.SELECTION.MIN_WORD_CONFIDENCE),
        )
      }
      disabled={disabled}
    />

    <label>Worker count</label>
    <InputNumber
      min={1}
      max={8}
      value={config.WORKER_COUNT}
      onChange={(v) =>
        onChange((d) => (d.WORKER_COUNT = v ?? DEFAULT_CONFIG.WORKER_COUNT))
      }
      disabled={disabled}
    />
  </div>
);

export default ExperimentsTab;
