'use client';

import { RobotOutlined } from '@ant-design/icons';
import { Button, Card, Input, Progress } from 'antd';
import { useCallback, useRef, useState } from 'react';

import {
  LLMEngine,
  type LLMProgress,
  StructuredParser,
} from '@/src/services/gameplay-parsing';
import type { BattleMetadata } from '@/src/services/pokemon/battle';
import type { CreateBattleData } from '@/src/types/api';

const PLACEHOLDER = `[1.0s] Go! Incineroar! | | Intimidate
[2.0s] The opposing Garchomp's Attack fell! | |
[3.0s] | Air Lock |
[4.0s] Incineroar used Flare Blitz! | |
[5.0s] It's super effective! | |
[6.0s] The opposing Garchomp fainted! | |`;

const StructuredParserTab = () => {
  const [input, setInput] = useState('');
  const [playerTag, setPlayerTag] = useState('p1');
  const [battleName, setBattleName] = useState('Test Battle');
  const [llmProgress, setLlmProgress] = useState<LLMProgress | null>(null);
  const [llmLoading, setLlmLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [simProtocol, setSimProtocol] = useState<string | null>(null);
  const [battleData, setBattleData] = useState<CreateBattleData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const llmEngineRef = useRef(new LLMEngine());

  const handleLoadLLM = useCallback(async () => {
    setLlmLoading(true);
    setError(null);
    try {
      await llmEngineRef.current.init(setLlmProgress);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load LLM model');
    } finally {
      setLlmLoading(false);
    }
  }, []);

  const handleRun = useCallback(async () => {
    if (!input.trim()) return;

    setRunning(true);
    setError(null);
    setSimProtocol(null);
    setBattleData(null);

    try {
      const paragraphs = input
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .map((line) => {
          const match = line.match(/^\[(\d+(?:\.\d+)?)s\]\s*(.*)$/);
          const timestamp = match ? parseFloat(match[1]) : 0;
          const textPart = match ? match[2] : line;
          const parts = textPart.split(' | ');

          return {
            timestamp,
            extractions: parts.map((text, i) => ({
              mask: {
                x: 0,
                y: 0,
                width: 1,
                height: 1,
                label:
                  ['main-text-box', 'rival-right-box', 'my-left-box'][i] ??
                  `mask-${i}`,
              },
              text: text.trim(),
              lineConfidences: [1],
            })),
          };
        });

      console.log(
        '[StructuredParserTab] Parsed input into',
        paragraphs.length,
        'paragraphs',
      );

      const structuredParser = new StructuredParser(llmEngineRef.current);
      const protocol = await structuredParser.convertToSimProtocol(paragraphs);
      setSimProtocol(protocol);

      const metadata: BattleMetadata = {
        name: battleName,
        notes: '',
        playerTag: playerTag as 'p1' | 'p2',
      };
      const parsed = structuredParser.parseSimProtocol(protocol, metadata);
      setBattleData(parsed);
      console.log(`[StructuredParserTab] Done: ${parsed.turns.length} turns`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Structured parsing failed',
      );
    } finally {
      setRunning(false);
    }
  }, [input, playerTag, battleName]);

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
          <Button icon={<RobotOutlined />} onClick={void handleLoadLLM()}>
            Load LLM Model
          </Button>
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

      <Button
        type="primary"
        size="large"
        icon={<RobotOutlined />}
        disabled={!input.trim() || !llmEngineRef.current.isReady() || running}
        loading={running}
        onClick={void handleRun()}
      >
        {running ? 'Parsing...' : 'Run Structured Parser'}
      </Button>

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
