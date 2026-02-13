'use client'

import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertCircle, CreditCard } from 'lucide-react'

interface TokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredTier: 'basic' | 'power' | 'advanced';
  rosterCount: number;
}

export function TokenModal({ isOpen, onClose, requiredTier, rosterCount }: TokenModalProps) {
  const router = useRouter()

  const handleNavigateToBilling = () => {
    onClose()
    router.push('/dashboard/billing')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-slate-200 shadow-lg">
        <DialogHeader className="space-y-3">
          <div className="mx-auto bg-amber-100 p-3 rounded-full w-fit mb-2">
            <AlertCircle className="h-6 w-6 text-amber-600" strokeWidth={1.5} />
          </div>
          <DialogTitle className="text-center text-xl font-bold text-slate-900">
            Insufficient Assessment Tokens
          </DialogTitle>
          <DialogDescription className="text-center text-slate-600">
            This assessment has an enrolled roster of <strong>{rosterCount} students</strong>, requiring a <strong>{requiredTier.toUpperCase()}</strong> allocation token to proceed. Your current wallet balance for this tier is depleted.
          </DialogDescription>
        </DialogHeader>
        
        <div className="bg-slate-50 p-4 rounded-md border border-slate-100 mt-2">
          <p className="text-sm text-slate-600 text-center">
            To deploy this assessment and activate the Integrity Shield, please acquire additional tokens from the billing portal.
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 mt-6">
          <Button type="button" variant="outline" onClick={onClose} className="w-full border-slate-200 text-slate-600">
            Cancel Deployment
          </Button>
          <Button type="button" onClick={handleNavigateToBilling} className="w-full bg-slate-900 hover:bg-slate-800 text-white">
            <CreditCard className="mr-2 h-4 w-4" strokeWidth={1.5} />
            Acquire Tokens
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}