import { Input, InputProps, Select, SelectProps } from 'antd';
import FormItem from 'antd/es/form/FormItem';
import Compact from 'antd/es/space/Compact';

interface FormatInputProps extends InputProps {
  additionalYearOptions?: SelectProps['options'];
}

const FormatInput = ({
  additionalYearOptions,
  ...inputProps
}: FormatInputProps) => {
  const SelectWrapper = FormItem;
  const yearValues = Array.from(
    { length: new Date().getFullYear() - 2008 + 2 },
    (_, i) => 2008 + i,
  )
    .map((year) => ({ value: year.toString() }))
    .reverse();

  return (
    <Compact block>
      <SelectWrapper name="season" noStyle>
        <Select
          placeholder="Season"
          options={[...(additionalYearOptions ?? []), ...yearValues]}
          aria-label="season select"
        />
      </SelectWrapper>
      <Input placeholder="Format" {...inputProps} aria-label="format input" />
    </Compact>
  );
};

export default FormatInput;
