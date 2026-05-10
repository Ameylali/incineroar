'use client';

import { FileImageOutlined, PauseOutlined, PlayCircleOutlined, UploadOutlined } from '@ant-design/icons';
import { Button, Card, Progress, Spin, Tabs, Upload } from 'antd';
import Title from 'antd/es/typography/Title';
import { useCallback, useRef, useState } from 'react';

import {
  DEFAULT_CONFIG,
  DEVICE_MASKS,
  type ExecutionController,
  type ExtractedParagraph,
  GameplayParsingPipeline,
  type GameplayParsingConfig,
  type ParsingProgress,
  TextExtractor,
} from '@/src/services/gameplay-parsing';

import ConfigForm from './ConfigForm';
import ExperimentsTab from './ExperimentsTab';
import ResultsDisplay from './ResultsDisplay';

const GameplayParsingPage = () => {
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
  const [imageProcessedUrl, setImageProcessedUrl] = useState<string | null>(null);
  const [imageRunning, setImageRunning] = useState(false);
  const [imageResults, setImageResults] = useState<ExtractedParagraph[] | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const pipelineRef = useRef<GameplayParsingPipeline | null>(null);
  const pauseResolveRef = useRef<(() => void) | null>(null);
  const isPausedRef = useRef(false);

  // Create execution controller for pause/resume
  const createController = useCallback((): ExecutionController => {
    return {
      checkPause: () => {
        if (!isPausedRef.current) {
          return Promise.resolve();
        }
        return new Promise<void>((resolve) => {
          pauseResolveRef.current = resolve;
        });
      },
    };
  }, []);

  const handlePause = useCallback(() => {
    isPausedRef.current = true;
    setPaused(true);
  }, []);

  const handleResume = useCallback(() => {
    isPausedRef.current = false;
    setPaused(false);
    if (pauseResolveRef.current) {
      pauseResolveRef.current();
      pauseResolveRef.current = null;
    }
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
      console.log('[Page] Starting pipeline...');
      pipelineRef.current = new GameplayParsingPipeline(config);
      const controller = createController();
      const paragraphs = await pipelineRef.current.run(
        file,
        setProgress,
        controller,
      );
      setResults(paragraphs);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unknown error occurred',
      );
    } finally {
      setRunning(false);
      pipelineRef.current = null;
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
      console.log('[Page] Starting image OCR test...');

      // Load image into ImageData
      const bitmap = await createImageBitmap(imageFile);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(bitmap, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      bitmap.close();

      // Generate processed image with mask overlays
      const masks = DEVICE_MASKS[config.DEVICE_PROFILE];
      const overlayCanvas = document.createElement('canvas');
      overlayCanvas.width = imageData.width;
      overlayCanvas.height = imageData.height;
      const overlayCtx = overlayCanvas.getContext('2d')!;
      overlayCtx.putImageData(imageData, 0, 0);
      overlayCtx.strokeStyle = 'red';
      overlayCtx.lineWidth = 3;
      overlayCtx.font = '14px sans-serif';
      for (const mask of masks) {
        const mx = Math.round(mask.x * overlayCanvas.width);
        const my = Math.round(mask.y * overlayCanvas.height);
        const mw = Math.round(mask.width * overlayCanvas.width);
        const mh = Math.round(mask.height * overlayCanvas.height);
        overlayCtx.strokeRect(mx, my, mw, mh);
        const labelPadding = 4;
        const labelHeight = 18;
        const labelWidth = overlayCtx.measureText(mask.label).width + labelPadding * 2;
        overlayCtx.fillStyle = 'rgba(255, 0, 0, 0.7)';
        overlayCtx.fillRect(mx, my - labelHeight, labelWidth, labelHeight);
        overlayCtx.fillStyle = 'white';
        overlayCtx.fillText(mask.label, mx + labelPadding, my - labelPadding);
      }
      setImageProcessedUrl(overlayCanvas.toDataURL('image/jpeg', 0.85));

      console.log(`[Page] Image loaded: ${imageData.width}x${imageData.height}`);

      // Run TextExtractor directly on the single image as a frame
      const extractor = new TextExtractor(config);
      const paragraphs = await extractor.extractAll([
        { timestamp: 0, imageData },
      ]);
      await extractor.terminate();

      console.log(`[Page] Image OCR result: ${paragraphs.length} paragraphs`);
      setImageResults(paragraphs);
    } catch (err) {
      setImageError(
        err instanceof Error ? err.message : 'An unknown error occurred',
      );
    } finally {
      setImageRunning(false);
    }
  }, [imageFile, config]);

  const progressPercent =
    progress && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <Title level={2}>Gameplay Parsing Test Lab</Title>

      <Tabs
        defaultActiveKey="pipeline"
        items={[
          {
            key: 'pipeline',
            label: 'Pipeline',
            children: (
              <div className="flex flex-col gap-6">
                <Card title="Video">
                  <Upload
                    accept="video/*"
                    maxCount={1}
                    beforeUpload={(f) => {
                      setFile(f);
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
                      beforeUpload={(f) => {
                        setImageFile(f);
                        setImagePreviewUrl(URL.createObjectURL(f));
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
                            <p className="mb-2 text-sm text-gray-500">Processed (with masks):</p>
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
                      onClick={handleImageTest}
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
                    onClick={handleRun}
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
              </div>
            ),
          },
          {
            key: 'experiments',
            label: 'Experiments',
            children: <ExperimentsTab />,
          },
        ]}
      />
    </div>
  );
};

export default GameplayParsingPage;
