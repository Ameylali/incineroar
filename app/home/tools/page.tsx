import { LinkOutlined } from '@ant-design/icons';
import { Card, Col, Row, Typography } from 'antd';

const { Title, Text, Link } = Typography;

interface ToolItem {
  name: string;
  url: string;
  description: string;
}

const tools: ToolItem[] = [
  {
    name: 'Labmaus',
    url: 'https://labmaus.net/',
    description:
      'Advanced Pokémon battle analysis and team building tools with detailed statistics and matchup predictions.',
  },
  {
    name: 'Porygon Labs',
    url: 'https://www.porygonlabs.com/',
    description:
      'Comprehensive Pokémon data and analytics platform for competitive battling and team optimization.',
  },
  {
    name: 'Pokémon Showdown Calculator',
    url: 'https://calc.pokemonshowdown.com/',
    description:
      'Damage calculator for precise battle calculations, including type effectiveness, stats, and move damage.',
  },
  {
    name: 'Pkmn Help',
    url: 'https://www.pkmn.help/',
    description:
      'Quick reference tool for type effectiveness charts and Pokémon type matchups.',
  },
  {
    name: 'Pyco Sites - Stat Calculator',
    url: 'https://pycosites.com/pkmn/stat.php',
    description:
      'Pokémon stat calculator for determining exact stats based on level, IVs, EVs, and nature.',
  },
  {
    name: 'Pikalytics',
    url: 'https://www.pikalytics.com/',
    description:
      'Usage statistics and meta analysis for competitive Pokémon, tracking popular sets and trends.',
  },
];

const Page = () => {
  return (
    <>
      <Row>
        <Col span={24}>
          <Title level={2}>Other Tools</Title>
          <Text type="secondary" className="mb-6 block">
            Useful third-party websites and tools for Pokémon competitive
            battling, team building, and analysis.
          </Text>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        {tools.map((tool) => (
          <Col xs={24} sm={12} lg={8} key={tool.url}>
            <Card
              hoverable
              className="h-full"
              actions={[
                <Link
                  key="visit"
                  href={tool.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2"
                >
                  <LinkOutlined />
                  Visit Site
                </Link>,
              ]}
            >
              <Card.Meta title={tool.name} description={tool.description} />
            </Card>
          </Col>
        ))}
      </Row>
    </>
  );
};

export default Page;
