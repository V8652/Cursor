import React, { useState, useEffect, forwardRef } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Input } from './ui/input';

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
}

const ColorPicker = forwardRef<HTMLButtonElement, ColorPickerProps>(({ value, onChange }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [color, setColor] = useState(value || '#1C4E80');
  
  // Update internal color state when value prop changes
  useEffect(() => {
    if (value && value !== color) {
      setColor(value);
    }
  }, [value]);
  
  const handleColorChange = (newColor: string) => {
    setColor(newColor);
  };
  
  const handleAccept = () => {
    onChange(color);
    setIsOpen(false);
  };
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          ref={ref}
          variant="outline" 
          className="h-10 w-10 p-0"
          style={{ backgroundColor: value || color }}
          onClick={() => setIsOpen(true)}
        >
          <span className="sr-only">Pick a color</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="space-y-3">
          <HexColorPicker color={color} onChange={handleColorChange} style={{ width: '100%' }} />
          <div className="flex items-center gap-2">
            <Input 
              value={color} 
              onChange={(e) => handleColorChange(e.target.value)}
              className="h-8"
            />
            <Button onClick={handleAccept} size="sm">Apply</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});

ColorPicker.displayName = 'ColorPicker';

export default ColorPicker;
