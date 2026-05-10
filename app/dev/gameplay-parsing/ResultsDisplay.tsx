'use client';

import { Card, Collapse, Tag } from 'antd';

import type { ExtractedParagraph } from '@/src/services/gameplay-parsing';

interface ResultsDisplayProps {
  paragraphs: ExtractedParagraph[];
}

const formatTimestamp = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const ResultsDisplay = ({ paragraphs }: ResultsDisplayProps) => {
  if (paragraphs.length === 0) {
    return <p>No paragraphs extracted. Try adjusting the configuration.</p>;
  }

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
                <Tag key={k} color={c >= 90 ? 'green' : c >= 70 ? 'orange' : 'red'}>
                  {c.toFixed(1)}%
                </Tag>
              ))}
            </div>
          </Card>
        ))}
      </div>
    ),
  }));

  return <Collapse items={items} />;
};

export default ResultsDisplay;
