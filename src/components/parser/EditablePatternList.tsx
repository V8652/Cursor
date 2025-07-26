import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, PlusCircle, Check, X, Edit2 } from 'lucide-react';

interface EditablePatternListProps {
  patterns: string[];
  type: string;
  onChange: (patterns: string[]) => void;
  placeholder?: string;
}

const EditablePatternList: React.FC<EditablePatternListProps> = ({
  patterns,
  type,
  onChange,
  placeholder = 'Add a new pattern'
}) => {
  const [newPattern, setNewPattern] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAddPattern = () => {
    if (!newPattern.trim()) {
      setError('Pattern cannot be empty');
      return;
    }
    if (patterns.includes(newPattern.trim())) {
      setError('Duplicate pattern');
      return;
    }
    if (type === 'amount' || type === 'cleaning' || type === 'merchant' || type === 'skip') {
      try {
        new RegExp(newPattern.trim());
      } catch (e) {
        setError('Invalid regex pattern');
        return;
      }
    }
    setError(null);
    onChange([...patterns, newPattern.trim()]);
    setNewPattern('');
  };

  const handleRemovePattern = (index: number) => {
    onChange(patterns.filter((_, i) => i !== index));
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditValue(patterns[index]);
  };

  const cancelEditing = () => {
    setEditingIndex(null);
  };

  const saveEdit = () => {
    if (editingIndex === null) return;
    
    const updatedPatterns = [...patterns];
    updatedPatterns[editingIndex] = editValue;
    onChange(updatedPatterns);
    setEditingIndex(null);
  };

  return (
    <div className="space-y-3">
      {patterns.map((pattern, index) => (
        <div key={index} className="flex items-center gap-2">
          {editingIndex === index ? (
            <>
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="flex-1 font-mono text-xs"
                autoFocus
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={saveEdit}
                className="h-8 w-8 p-0"
              >
                <Check className="h-4 w-4" />
                <span className="sr-only">Save</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={cancelEditing}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Cancel</span>
              </Button>
            </>
          ) : (
            <>
              <Badge variant="outline" className="flex-1 font-mono text-xs p-2 truncate">
                {pattern}
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => startEditing(index)}
                className="h-8 w-8 p-0"
              >
                <Edit2 className="h-4 w-4" />
                <span className="sr-only">Edit</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemovePattern(index)}
                className="h-8 w-8 p-0"
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Remove</span>
              </Button>
            </>
          )}
        </div>
      ))}
      
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={newPattern}
          onChange={(e) => {
            setNewPattern(e.target.value);
            setError(null);
          }}
          className="flex-1"
        />
        {error && <span className="text-xs text-red-600 ml-2">{error}</span>}
        <Button
          type="button"
          onClick={handleAddPattern}
          variant="outline"
          disabled={!newPattern.trim()}
        >
          <PlusCircle className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>
    </div>
  );
};

export default EditablePatternList;
