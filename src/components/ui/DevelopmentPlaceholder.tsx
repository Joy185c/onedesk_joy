import React from 'react';
import Link from 'next/link';
import { Construction, ArrowLeft, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface DevelopmentPlaceholderProps {
  title: string;
  phase: string;
  description: string;
  plannedFeatures: string[];
}

export const DevelopmentPlaceholder: React.FC<DevelopmentPlaceholderProps> = ({
  title,
  phase,
  description,
  plannedFeatures,
}) => {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/w/factor-labs">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-[#5E6962]">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <Card className="border-dashed border-2 border-[#CBD3CE] bg-[#F7F8F8]">
        <CardContent className="p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#E9FBEA] text-[#064E24] border border-[#C6F5CB] flex items-center justify-center mx-auto">
            <Construction className="w-6 h-6 text-[#20E34A]" />
          </div>

          <div className="space-y-1">
            <div className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#082F1B] text-[#20E34A]">
              Phase {phase} Roadmap Milestone
            </div>
            <h2 className="text-xl font-extrabold text-[#18251D]">{title}</h2>
            <p className="text-xs text-[#778079] max-w-md mx-auto">{description}</p>
          </div>

          <div className="max-w-md mx-auto text-left bg-white p-4 rounded-xl border border-[#E5E9E6] shadow-2xs space-y-2">
            <div className="text-xs font-bold text-[#18251D] flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#20E34A]" />
              Scheduled Capabilities:
            </div>
            <ul className="text-xs text-[#5E6962] space-y-1 pl-4 list-disc">
              {plannedFeatures.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>

          <div className="pt-2">
            <span className="text-[11px] text-[#8E9891]">
              Architecture verified in Phase 0. Implementation will activate in Phase {phase}.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

