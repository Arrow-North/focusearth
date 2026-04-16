import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Building2 } from 'lucide-react';
import type { Company } from '@/types/database';

const TYPE_STRIPE_COLORS: Record<string, string> = {
  REU: 'bg-purple-500',
  SU: 'bg-yellow-500',
  EU: 'bg-teal-500',
};

const TYPE_EMOJI: Record<string, string> = {
  REU: 'R',
  SU: 'S',
  EU: 'E',
};

interface CompanyCardProps {
  company: Company;
}

export function CompanyCard({ company }: CompanyCardProps) {
  const navigate = useNavigate();

  const stripeColor = TYPE_STRIPE_COLORS[company.type] ?? 'bg-gray-400';

  return (
    <Card
      className="cursor-pointer overflow-hidden transition-shadow hover:shadow-md"
      onClick={() => navigate(`/companies/${company.id}`)}
    >
      {/* Color stripe */}
      <div className={cn('h-1.5 w-full', stripeColor)} />

      <CardContent className="flex items-center gap-4 p-4">
        {/* Image or fallback */}
        {company.image ? (
          <img
            src={company.image}
            alt={company.name}
            className="h-12 w-12 rounded-lg object-cover shrink-0"
          />
        ) : (
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-lg text-lg font-bold text-white shrink-0',
              stripeColor,
            )}
          >
            {TYPE_EMOJI[company.type] ?? <Building2 className="h-5 w-5" />}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold">{company.name}</h3>
          <p className="text-xs text-muted-foreground">
            {company.type}
            {company.company_sub_type ? ` - ${company.company_sub_type}` : ''}
          </p>
          {company.city && company.state && (
            <p className="text-xs text-muted-foreground">
              {company.city}, {company.state}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
