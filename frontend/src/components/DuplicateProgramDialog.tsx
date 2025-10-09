import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Calendar, DollarSign, Copy, Loader2, Info } from 'lucide-react';
import { BusinessProgram } from '../types/yelp';

interface DuplicateProgramDialogProps {
  isOpen: boolean;
  onClose: () => void;
  program: BusinessProgram | null;
  onConfirm: (data: DuplicateFormData) => void;
  isLoading?: boolean;
}

export interface DuplicateFormData {
  program_id: string;
  start_date: string;
  end_date?: string;
  budget: number;
  copy_features: boolean;
  is_autobid?: boolean;
  max_bid?: number;
}

const DuplicateProgramDialog: React.FC<DuplicateProgramDialogProps> = ({
  isOpen,
  onClose,
  program,
  onConfirm,
  isLoading = false
}) => {
  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Get date 30 days from now
  const getFutureDate = (daysAhead: number = 30) => {
    const future = new Date();
    future.setDate(future.getDate() + daysAhead);
    return future.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState<Omit<DuplicateFormData, 'program_id'>>({
    start_date: getTodayDate(),
    end_date: getFutureDate(30),
    budget: 0,
    copy_features: true,
    is_autobid: true,
  });

  useEffect(() => {
    if (program && isOpen) {
      // Pre-fill with original program data
      const originalBudget = program.program_metrics?.budget 
        ? Number(program.program_metrics.budget) / 100 
        : 100;
      
      setFormData({
        start_date: getTodayDate(),
        end_date: getFutureDate(30),
        budget: originalBudget,
        copy_features: true,
        is_autobid: program.program_metrics?.is_autobid ?? true,
        max_bid: program.program_metrics?.max_bid 
          ? Number(program.program_metrics.max_bid) / 100 
          : undefined,
      });
    }
  }, [program, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!program) return;
    
    onConfirm({
      program_id: program.program_id,
      ...formData
    });
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  if (!program) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Copy className="w-5 h-5" />
            Create Campaign Layer (Duplicate Program)
          </DialogTitle>
          <DialogDescription>
            Create a new campaign based on <strong>{program.program_type}</strong> program
            <code className="ml-2 bg-gray-100 px-2 py-1 rounded text-xs">
              {program.program_id}
            </code>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Original Program Info */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Original Program Details:
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
              <div>
                <span className="text-gray-600">Type:</span> <strong>{program.program_type}</strong>
              </div>
              <div>
                <span className="text-gray-600">Status:</span> <strong>{program.program_status}</strong>
              </div>
              <div>
                <span className="text-gray-600">Original Budget:</span>{' '}
                <strong>
                  ${program.program_metrics?.budget ? (Number(program.program_metrics.budget) / 100).toFixed(2) : 'N/A'}
                </strong>
              </div>
              <div>
                <span className="text-gray-600">Period:</span>{' '}
                <strong>{program.start_date} → {program.end_date || 'ongoing'}</strong>
              </div>
              {program.active_features && program.active_features.length > 0 && (
                <div className="col-span-2">
                  <span className="text-gray-600">Features ({program.active_features.length}):</span>{' '}
                  <span className="text-xs">{program.active_features.join(', ')}</span>
                </div>
              )}
            </div>
          </div>

          {/* New Program Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_date" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Start Date *
              </Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                min={getTodayDate()}
                required
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Can be a future date for scheduled campaigns
              </p>
            </div>

            <div>
              <Label htmlFor="end_date" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                End Date
              </Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date || ''}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value || undefined })}
                min={formData.start_date}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty for ongoing campaign
              </p>
            </div>
          </div>

          {/* Budget */}
          <div>
            <Label htmlFor="budget" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Budget (USD) *
            </Label>
            <Input
              id="budget"
              type="number"
              step="0.01"
              min="25"
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) || 0 })}
              required
              className="mt-1"
            />
            <p className="text-xs text-red-600 mt-1 font-medium">
              ⚠️ Minimum budget: $25.00 (Yelp requirement)
            </p>
            <p className="text-xs text-gray-500">
              Separate budget for this campaign layer
            </p>
          </div>

          {/* Copy Features Toggle */}
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
            <div>
              <Label htmlFor="copy_features" className="font-medium">
                Copy all features from original program
              </Label>
              <p className="text-sm text-gray-600">
                {formData.copy_features 
                  ? `Will copy ${program.active_features?.length || 0} active features` 
                  : 'Create new program without features'
                }
              </p>
            </div>
            <Switch
              id="copy_features"
              checked={formData.copy_features}
              onCheckedChange={(checked) => setFormData({ ...formData, copy_features: checked })}
            />
          </div>

          {/* Auto-bid settings (only for CPC) */}
          {program.program_type === 'CPC' && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="is_autobid" className="font-medium">
                    Use Auto-bidding
                  </Label>
                  <p className="text-sm text-gray-600">
                    Let Yelp optimize your bids automatically
                  </p>
                </div>
                <Switch
                  id="is_autobid"
                  checked={formData.is_autobid}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_autobid: checked })}
                />
              </div>

              {!formData.is_autobid && (
                <div>
                  <Label htmlFor="max_bid">
                    Max Bid (USD)
                  </Label>
                  <Input
                    id="max_bid"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.max_bid || ''}
                    onChange={(e) => setFormData({ ...formData, max_bid: parseFloat(e.target.value) || undefined })}
                    className="mt-1"
                    placeholder="e.g., 5.00"
                  />
                </div>
              )}
            </div>
          )}

          {/* Use Case Examples */}
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">💡 Common use cases for layers:</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• <strong>Seasonal campaigns:</strong> "Black Friday 2025", "Summer Sale"</li>
              <li>• <strong>Special promotions:</strong> with increased budget for limited time</li>
              <li>• <strong>Testing:</strong> duplicate with different budget/dates to compare results</li>
              <li>• <strong>Future planning:</strong> schedule campaigns in advance</li>
            </ul>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.start_date || !formData.budget || formData.budget < 25}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Layer...
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Create Layer
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DuplicateProgramDialog;
