import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { UserPlus, CheckCircle2, XCircle } from 'lucide-react';

interface ReferralPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReferralPopup: React.FC<ReferralPopupProps> = ({ isOpen, onClose }) => {
  const { updateUser } = useAuth();
  const [referralCode, setReferralCode] = useState('');
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const checkReferral = async () => {
    if (referralCode.length < 6) return;
    setIsChecking(true);
    try {
      const q = query(collection(db, 'users'), where('referral_code', '==', referralCode.toUpperCase()));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setReferrerName(querySnapshot.docs[0].data().username);
      } else {
        setReferrerName(null);
        toast.error('Invalid Referral ID');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleSubmit = async () => {
    if (!referrerName) {
      toast.error('Please enter a valid Referral ID');
      return;
    }
    setIsSubmitting(true);
    try {
      await updateUser({ referred_by: referralCode.toUpperCase() });
      toast.success('Referral ID applied successfully!');
      onClose();
    } catch (error) {
      toast.error('Failed to apply referral');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">Welcome to Eco Ads! 🌿</DialogTitle>
          <DialogDescription className="text-center pt-2">
            Do you have a Referral ID? Enter it below to support your friend.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="popupReferral" className="text-slate-700 font-medium">Referral ID</Label>
            <div className="relative">
              <UserPlus className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                id="popupReferral"
                placeholder="ABC123XY"
                className="pl-10 h-11 uppercase"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                onBlur={checkReferral}
              />
              {isChecking && (
                <div className="absolute right-3 top-3 h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              )}
            </div>
            {referrerName && (
              <div className="flex items-center gap-1.5 px-1 text-emerald-600 animate-in fade-in slide-in-from-top-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Referred by: {referrerName}</span>
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="sm:justify-center gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isSubmitting}
          >
            Skip for now
          </Button>
          <Button 
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            onClick={handleSubmit}
            disabled={isSubmitting || !referrerName}
          >
            {isSubmitting ? 'Applying...' : 'Apply Referral'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
