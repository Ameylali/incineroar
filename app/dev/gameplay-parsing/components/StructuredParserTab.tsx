'use client';

import { CopyOutlined, RobotOutlined } from '@ant-design/icons';
import { Button, Card, Input, Progress, Select } from 'antd';
import { useCallback, useRef, useState } from 'react';

import {
  LLM_MODELS,
  LLMEngine,
  type LLMModelSize,
  type LLMProgress,
  type StructuredParsingProgress,
} from '@/src/services/gameplay-parsing';
import type { CreateBattleData } from '@/src/types/api';

import {
  createBattleMetadata,
  formatStructuredLlmPrompt,
  normalizeLlmResponse,
  parseLlmResponse,
  parseStructuredInput,
  runStructuredParsing,
} from '../utils';

const PLACEHOLDER = `[1.0s] Go! Incineroar! | | Intimidate
[2.0s] The opposing Garchomp's Attack fell! | |
[3.0s] | Air Lock |
[4.0s] Incineroar used Flare Blitz! | |
[5.0s] It's super effective! | |
[6.0s] The opposing Garchomp fainted! | |`;

const StructuredParserTab = () => {
  const [input, setInput] = useState('');
  const [llmResponse, setLlmResponse] = useState('');
  const [playerTag, setPlayerTag] = useState('p1');
  const [battleName, setBattleName] = useState('Test Battle');
  const [llmProgress, setLlmProgress] = useState<LLMProgress | null>(null);
  const [llmLoading, setLlmLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [simProtocol, setSimProtocol] = useState<string | null>(null);
  const [battleData, setBattleData] = useState<CreateBattleData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [structuredProgress, setStructuredProgress] =
    useState<StructuredParsingProgress | null>(null);
  const [modelSize, setModelSize] = useState<LLMModelSize>('medium');
  const [promptCopied, setPromptCopied] = useState(false);
  const [promptCopyError, setPromptCopyError] = useState<string | null>(null);
  const llmEngineRef = useRef(new LLMEngine());

  const handleCopyPrompt = useCallback(async () => {
    if (!input.trim()) return;

    try {
      await navigator.clipboard.writeText(formatStructuredLlmPrompt(input));
      setPromptCopied(true);
      setPromptCopyError(null);
      window.setTimeout(() => setPromptCopied(false), 1500);
    } catch (err) {
      console.error('[StructuredParserTab] Failed to copy LLM prompt', err);
      setPromptCopyError('Could not copy the LLM prompt to the clipboard.');
    }
  }, [input]);

  const handleLoadLLM = useCallback(async () => {
    console.debug('[StructuredParserTab] Loading LLM', { modelSize });
    setLlmLoading(true);
    setError(null);
    try {
      await llmEngineRef.current.init(setLlmProgress, modelSize);
      console.debug('[StructuredParserTab] LLM loaded', { modelSize });
    } catch (err) {
      console.error('[StructuredParserTab] Failed to load LLM', {
        modelSize,
        error: err,
      });
      setError(err instanceof Error ? err.message : 'Failed to load LLM model');
    } finally {
      setLlmLoading(false);
    }
  }, [modelSize]);

  const handleRun = useCallback(async () => {
    if (!input.trim()) {
      console.debug('[StructuredParserTab] Run skipped: input is empty');
      return;
    }

    console.debug('[StructuredParserTab] Starting structured parse', {
      inputCharacters: input.length,
      modelSize,
      playerTag,
      battleName,
    });
    setRunning(true);
    setError(null);
    setSimProtocol(null);
    setBattleData(null);
    setStructuredProgress(null);

    try {
      const paragraphs = parseStructuredInput(input);

      console.log(
        '[StructuredParserTab] Parsed input into',
        paragraphs.length,
        'paragraphs',
      );

      console.debug('[StructuredParserTab] Converting paragraphs to protocol', {
        paragraphCount: paragraphs.length,
      });
      const { simProtocol: protocol, battleData: parsed } =
        await runStructuredParsing(
          paragraphs,
          llmEngineRef.current,
          createBattleMetadata(battleName, playerTag),
          setStructuredProgress,
        );
      setSimProtocol(protocol);
      console.debug('[StructuredParserTab] Protocol conversion complete', {
        protocolCharacters: protocol.length,
      });

      setBattleData(parsed);
      console.log(`[StructuredParserTab] Done: ${parsed.turns.length} turns`);
    } catch (err) {
      console.error('[StructuredParserTab] Structured parsing failed', {
        inputCharacters: input.length,
        error: err,
      });
      setError(
        err instanceof Error ? err.message : 'Structured parsing failed',
      );
    } finally {
      setRunning(false);
    }
  }, [input, playerTag, battleName, modelSize]);

  const handleParseResponse = useCallback(() => {
    if (!llmResponse.trim()) return;

    const normalizedResponse = normalizeLlmResponse(llmResponse);
    setError(null);
    setSimProtocol(null);
    setBattleData(null);

    try {
      const parsed = parseLlmResponse(
        llmResponse,
        llmEngineRef.current,
        createBattleMetadata(battleName, playerTag),
      );
      setSimProtocol(normalizedResponse);
      setBattleData(parsed);
    } catch (err) {
      console.error('[StructuredParserTab] Failed to parse LLM response', {
        responseCharacters: llmResponse.length,
        error: err,
      });
      setError(
        err instanceof Error ? err.message : 'Failed to parse LLM response',
      );
    }
  }, [llmResponse, battleName, playerTag]);

  return (
    <div className="flex flex-col gap-6">
      <Card title="Input">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-500">
            Paste OCR-extracted text in the format:{' '}
            <code>[timestamp] main-text | rival-box | my-box</code>
          </p>
          <Input.TextArea
            rows={10}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={PLACEHOLDER}
            disabled={running}
          />
          <div className="flex items-center gap-3">
            <Button
              icon={<CopyOutlined />}
              disabled={!input.trim() || running}
              onClick={() => void handleCopyPrompt()}
            >
              {promptCopied ? 'Copied' : 'Copy LLM prompt'}
            </Button>
            {promptCopyError && (
              <span className="text-red-500">{promptCopyError}</span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm">Player tag:</span>
              <Input
                value={playerTag}
                onChange={(e) => setPlayerTag(e.target.value)}
                style={{ width: 80 }}
                disabled={running}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Battle name:</span>
              <Input
                value={battleName}
                onChange={(e) => setBattleName(e.target.value)}
                style={{ width: 200 }}
                disabled={running}
              />
            </div>
          </div>
        </div>
      </Card>

      <Card title="LLM Engine">
        {!llmEngineRef.current.isReady() && !llmLoading && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm">Model:</span>
              <Select
                value={modelSize}
                onChange={setModelSize}
                style={{ width: 240 }}
                options={Object.entries(LLM_MODELS).map(([key, m]) => ({
                  value: key,
                  label: `${m.label} \u2014 ${m.description}`,
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
          <p className="text-green-600">Model loaded</p>
        )}
      </Card>

      <Card title="LLM Response">
        <div className="flex flex-col gap-3">
          <Input.TextArea
            rows={10}
            value={llmResponse}
            onChange={(event) => setLlmResponse(event.target.value)}
            placeholder="Paste the LLM's Showdown sim-protocol response here..."
            disabled={running}
          />
          <Button
            icon={<RobotOutlined />}
            disabled={!llmResponse.trim() || running}
            onClick={handleParseResponse}
          >
            Parse LLM Response
          </Button>
        </div>
      </Card>

      <Button
        type="primary"
        size="large"
        icon={<RobotOutlined />}
        disabled={!input.trim() || !llmEngineRef.current.isReady() || running}
        loading={running}
        onClick={() => void handleRun()}
      >
        {running ? 'Parsing...' : 'Run Structured Parser'}
      </Button>

      {running && structuredProgress && (
        <Progress
          percent={Math.round(
            (structuredProgress.current / structuredProgress.total) * 100,
          )}
          format={() =>
            `${structuredProgress.current} / ${structuredProgress.total} lines`
          }
          status="active"
        />
      )}

      {error && (
        <Card title="Error">
          <p className="text-red-500">{error}</p>
        </Card>
      )}

      {simProtocol && (
        <Card title="Generated Sim-Protocol">
          <pre className="max-h-64 overflow-auto rounded bg-gray-100 p-3 text-xs dark:bg-gray-800">
            {simProtocol}
          </pre>
        </Card>
      )}

      {battleData && (
        <Card
          title={`Parsed Battle: ${battleData.turns.length} turns${battleData.result ? `, result: ${battleData.result}` : ''}`}
        >
          <pre className="max-h-96 overflow-auto rounded bg-gray-100 p-3 text-xs dark:bg-gray-800">
            {JSON.stringify(battleData, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
};

export default StructuredParserTab;
