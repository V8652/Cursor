
import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, PlusCircle, Check, X, Edit2, Eye } from 'lucide-react';
import { MerchantNote } from '@/types/merchant-note';
import { toast } from '@/hooks/use-toast';
import EditablePatternList from '@/components/parser/EditablePatternList';

interface MerchantNoteEditorProps {
  merchantName: string;
  onNotesSaved: (note: MerchantNote) => void;
  initialNote?: MerchantNote;
  previewText?: string;
}

const MerchantNoteEditor: React.FC<MerchantNoteEditorProps> = ({
  merchantName,
  onNotesSaved,
  initialNote,
  previewText
}) => {
  const [pattern, setPattern] = useState<string>(initialNote?.merchantPattern || merchantName);
  const [notes, setNotes] = useState<string>(initialNote?.notes || '');
  const [categoryOverride, setCategoryOverride] = useState<string>(initialNote?.categoryOverride || '');
  const [isEditing, setIsEditing] = useState<boolean>(!initialNote);
  const [previewResult, setPreviewResult] = useState<{ matches: boolean; text?: string } | null>(null);

  useEffect(() => {
    if (!initialNote) {
      setPattern(merchantName);
    }
  }, [merchantName, initialNote]);

  // Add effect to update preview when pattern changes
  useEffect(() => {
    if (previewText && pattern) {
      testPattern();
    }
  }, [pattern, previewText]);

  const testPattern = () => {
    if (!previewText || !pattern.trim()) {
      setPreviewResult(null);
      return;
    }

    try {
      // Try as regex first
      let isRegex = false;
      try {
        const regex = new RegExp(pattern, 'i');
        isRegex = true;
        const match = regex.test(previewText);
        setPreviewResult({
          matches: match,
          text: match ? 'Pattern matches the text' : 'Pattern does not match the text'
        });
      } catch (e) {
        // If not a valid regex, try as simple text match
        if (!isRegex) {
          const match = previewText.toLowerCase().includes(pattern.toLowerCase());
          setPreviewResult({
            matches: match,
            text: match ? 'Text contains this pattern' : 'Text does not contain this pattern'
          });
        }
      }
    } catch (error) {
      setPreviewResult({
        matches: false,
        text: 'Error testing pattern'
      });
    }
  };

  const handleSave = () => {
    if (!pattern.trim()) {
      toast({
        title: 'Pattern Required',
        description: 'Please provide a valid merchant pattern',
        variant: 'destructive'
      });
      return;
    }

    const noteData: MerchantNote = {
      id: initialNote?.id || crypto.randomUUID(),
      merchantPattern: pattern,
      notes: notes.trim() || undefined,
      categoryOverride: categoryOverride.trim() || undefined
    };

    onNotesSaved(noteData);
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div className="space-y-3 border rounded-md p-3 bg-card">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="text-sm font-medium">Merchant Pattern</h4>
            <Badge variant="outline" className="mt-1">{pattern}</Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsEditing(true)}
            className="h-8 w-8"
          >
            <Edit2 className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
        </div>

        {(notes || categoryOverride) && (
          <div className="space-y-2">
            {notes && (
              <div>
                <h4 className="text-sm font-medium">Notes</h4>
                <p className="text-sm text-muted-foreground">{notes}</p>
              </div>
            )}
            
            {categoryOverride && (
              <div>
                <h4 className="text-sm font-medium">Category Override</h4>
                <Badge>{categoryOverride}</Badge>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 border rounded-md p-3 bg-card">
      <div className="space-y-2">
        <label className="text-sm font-medium">Merchant Pattern</label>
        <div className="flex gap-2">
          <Input
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder="Enter merchant pattern"
            className={previewResult && !previewResult.matches ? "border-red-300" : ""}
          />
          {previewText && (
            <Button 
              variant="outline" 
              size="icon"
              onClick={testPattern}
              className="flex-shrink-0"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
        </div>
        {previewResult && (
          <div className={`text-xs mt-1 ${previewResult.matches ? 'text-green-600' : 'text-red-500'}`}>
            {previewResult.text}
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium">Notes</label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes about this merchant"
          className="resize-none"
          rows={3}
        />
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium">Category Override</label>
        <Input
          value={categoryOverride}
          onChange={(e) => setCategoryOverride(e.target.value)}
          placeholder="Override default category (optional)"
        />
      </div>
      
      <div className="flex justify-end gap-2 pt-2">
        <Button
          variant="outline"
          onClick={() => {
            if (!initialNote) {
              onNotesSaved({
                id: crypto.randomUUID(),
                merchantPattern: '',
                notes: '',
                categoryOverride: ''
              });
            }
            setIsEditing(false);
          }}
        >
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
        <Button onClick={handleSave}>
          <Check className="h-4 w-4 mr-1" />
          Save
        </Button>
      </div>
    </div>
  );
};

export default MerchantNoteEditor;
