'use client';

import { CopyOutlined } from '@ant-design/icons';
import { Button, Card, Collapse, Tag } from 'antd';
import { useState } from 'react';

import type { ExtractedParagraph } from '@/src/services/gameplay-parsing';

import { formatExtractedText, formatTimestamp } from '../utils';

interface ResultsDisplayProps {
  paragraphs: ExtractedParagraph[];
}

const ResultsDisplay = ({ paragraphs }: ResultsDisplayProps) => {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  if (paragraphs.length === 0) {
    return <p>No paragraphs extracted. Try adjusting the configuration.</p>;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatExtractedText(paragraphs));
      setCopied(true);
      setCopyError(null);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error('[ResultsDisplay] Failed to copy extracted text', error);
      setCopyError('Could not copy extracted text to the clipboard.');
    }
  };

  const items = paragraphs.map((p, i) => ({
    key: String(i),
    label: (
      <span>
        <Tag color="blue">{formatTimestamp(p.timestamp)}</Tag>
        {p.extractions.map((e) => e.text).join(' | ')}
      </span>
    ),
    children: (
      <div className="flex flex-col gap-2">
        {p.extractions.map((extraction, j) => (
          <Card key={j} size="small" title={extraction.mask.label}>
            <p className="whitespace-pre-wrap">{extraction.text}</p>
            <div className="mt-2 flex gap-1">
              {extraction.lineConfidences.map((c, k) => (
                <Tag
                  key={k}
                  color={c >= 90 ? 'green' : c >= 70 ? 'orange' : 'red'}
                >
                  {c.toFixed(1)}%
                </Tag>
              ))}
            </div>
          </Card>
        ))}
      </div>
    ),
  }));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Button icon={<CopyOutlined />} onClick={() => void handleCopy()}>
          {copied ? 'Copied' : 'Copy extracted text'}
        </Button>
        {copyError && <span className="text-red-500">{copyError}</span>}
      </div>
      <Collapse items={items} />
    </div>
  );
};

export default ResultsDisplay;
