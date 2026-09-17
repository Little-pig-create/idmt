import { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { DeleteIcon, ImageIcon } from '../icons';
import { monoFont, tokens } from '../theme';
import type { CollectionSchema, ValidationError } from '../types';
import AssetPicker from './AssetPicker';

interface Props {
  schema: CollectionSchema;
  values: Record<string, unknown>;
  errors: ValidationError[];
  onChange: (name: string, value: unknown) => void;
}

function toInputValue(value: unknown, type: string): string {
  if (value === undefined || value === null) return '';
  if (type === 'array' && Array.isArray(value)) return value.join(', ');
  if (type === 'date' && typeof value === 'string') return value.slice(0, 10);
  return String(value);
}

export default function SchemaForm({ schema, values, errors, onChange }: Props) {
  const errorFor = (name: string) => errors.find((e) => e.field === name)?.message;
  /** 当前打开图片选择器的字段名，null 表示都关着 */
  const [pickerField, setPickerField] = useState<string | null>(null);

  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      {schema.fields.map((field) => {
        const error = errorFor(field.name);
        const value = values[field.name];

        if (field.type === 'boolean') {
          return (
            <FormControlLabel
              key={field.name}
              control={
                <Switch
                  checked={value === true}
                  onChange={(e) => onChange(field.name, e.target.checked)}
                />
              }
              label={
                <Box>
                  {field.label}
                  {field.help && (
                    <FormHelperText sx={{ mt: 0 }}>{field.help}</FormHelperText>
                  )}
                </Box>
              }
            />
          );
        }

        if (field.type === 'image') {
          const url = typeof value === 'string' ? value : '';
          return (
            <Box key={field.name}>
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <TextField
                  label={`${field.label}${field.required ? ' *' : ''}`}
                  value={url}
                  onChange={(e) => onChange(field.name, e.target.value)}
                  placeholder="例如 /images/foo.png"
                  required={field.required}
                  error={Boolean(error)}
                  helperText={error ?? field.help}
                  slotProps={{ htmlInput: { style: { fontFamily: monoFont } } }}
                />
                <Button
                  variant="outlined"
                  startIcon={<ImageIcon fontSize="small" />}
                  onClick={() => setPickerField(field.name)}
                  sx={{ mt: 0.25, flexShrink: 0, whiteSpace: 'nowrap' }}
                >
                  选择…
                </Button>
              </Stack>

              {url ? (
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1 }}>
                  <Box
                    component="img"
                    src={url}
                    alt=""
                    sx={{
                      height: 64,
                      maxWidth: 180,
                      objectFit: 'cover',
                      display: 'block',
                      border: `1px solid ${tokens.line}`,
                      borderRadius: 1,
                      bgcolor: tokens.surfaceSubtle,
                      flexShrink: 0,
                    }}
                  />
                  <Button
                    size="small"
                    color="inherit"
                    startIcon={<DeleteIcon fontSize="small" />}
                    onClick={() => onChange(field.name, '')}
                  >
                    清除
                  </Button>
                </Stack>
              ) : (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  尚未选择图片，可点「选择…」从资源库挑选，也可直接填写图片路径
                </Typography>
              )}

              <AssetPicker
                open={pickerField === field.name}
                mode="url"
                onClose={() => setPickerField(null)}
                onSelect={(picked) => {
                  onChange(field.name, picked);
                  setPickerField(null);
                }}
              />
            </Box>
          );
        }

        if (field.type === 'enum') {
          return (
            <FormControl key={field.name} size="small" fullWidth error={Boolean(error)}>
              <InputLabel id={`${field.name}-label`}>
                {field.label}
                {field.required ? ' *' : ''}
              </InputLabel>
              <Select
                labelId={`${field.name}-label`}
                label={`${field.label}${field.required ? ' *' : ''}`}
                value={typeof value === 'string' ? value : ''}
                onChange={(e) => onChange(field.name, e.target.value)}
              >
                {field.options?.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
              {(error || field.help) && (
                <FormHelperText error={Boolean(error)}>{error ?? field.help}</FormHelperText>
              )}
            </FormControl>
          );
        }

        return (
          <TextField
            key={field.name}
            label={`${field.label}${field.required ? ' *' : ''}`}
            value={toInputValue(value, field.type)}
            onChange={(e) => {
              const raw = e.target.value;
              if (field.type === 'array') {
                onChange(
                  field.name,
                  raw
                    .split(/[,，]/)
                    .map((v) => v.trim())
                    .filter(Boolean)
                );
              } else if (field.type === 'number') {
                onChange(field.name, raw === '' ? '' : Number(raw));
              } else {
                onChange(field.name, raw);
              }
            }}
            type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
            multiline={field.type === 'text'}
            minRows={field.type === 'text' ? 3 : undefined}
            required={field.required}
            error={Boolean(error)}
            helperText={error ?? field.help}
            slotProps={{
              inputLabel: field.type === 'date' ? { shrink: true } : undefined,
              htmlInput: field.type === 'number' ? { min: field.min, max: field.max } : undefined,
            }}
          />
        );
      })}
    </Box>
  );
}
