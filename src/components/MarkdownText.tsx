import Text from 'antd/es/typography/Text';
import Title from 'antd/es/typography/Title';
import Markdown, { Components } from 'react-markdown';

export interface MarkdownTextProps {
  children: string;
}

const components: Components = {
  h1: (props) => <Title level={1} {...props} />,
  h2: (props) => <Title level={2} {...props} />,
  h3: (props) => <Title level={3} {...props} />,
  h4: (props) => <Title level={4} {...props} />,
  h5: (props) => <Title level={5} {...props} />,
  h6: (props) => <Text {...props} />,
  ol: (props) => <ol className="list-inside list-decimal" {...props} />,
  ul: (props) => <ul className="list-inside list-disc" {...props} />,
};

const MarkdownText = ({ children }: MarkdownTextProps) => {
  return <Markdown components={components}>{children}</Markdown>;
};

export default MarkdownText;
