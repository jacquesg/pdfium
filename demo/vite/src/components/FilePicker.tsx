import { useRef } from 'react';
import { Button } from './Button';

interface FilePickerProps {
  onFileSelect: (data: Uint8Array, name: string) => void;
  label?: string;
  accept?: string;
}

export function FilePicker({ onFileSelect, label = 'Open File', accept = '.pdf' }: FilePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      onFileSelect(new Uint8Array(buffer), file.name);
    } catch (err) {
      console.error('Error reading file:', err);
      alert('Failed to read file');
    }
    
    // Reset input so same file can be selected again
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        type="file"
        ref={inputRef}
        onChange={handleChange}
        accept={accept}
        style={{ display: 'none' }}
      />
      <Button variant="secondary" onClick={() => inputRef.current?.click()}>
        {label}
      </Button>
    </>
  );
}
