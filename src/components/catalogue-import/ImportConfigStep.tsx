import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { useCompanies } from '@/hooks/use-companies';
import { useDebounce } from '@/hooks/use-debounce';
import { LED_BUCKET, LUMINAIRE_TYPE_SLUGS } from '@/lib/catalogue-import/constants';
import { slugify } from '@/lib/catalogue-import/storage-paths';
import { cn } from '@/lib/utils';
import { LUMINAIRE_TYPES, type LuminaireType } from '@/types/catalogue-import';
import {
  Building2,
  Check,
  ChevronsUpDown,
  FolderTree,
  Lamp,
  Lightbulb,
  Puzzle,
  SlidersHorizontal,
  Zap,
} from 'lucide-react';

export interface ImportConfigStepProps {
  companyId: number | null;
  companyName: string | null;
  luminaireType: LuminaireType | null;
  onCompanyChange: (id: number, name: string) => void;
  onLuminaireTypeChange: (t: LuminaireType) => void;
}

const TYPE_ICONS: Record<LuminaireType, typeof Lightbulb> = {
  'Fixtures': Lightbulb,
  'Lamps': Lamp,
  'Power Supplies': Zap,
  'Controls': SlidersHorizontal,
  'Accessories': Puzzle,
};

const TYPE_HINTS: Record<LuminaireType, string> = {
  'Fixtures': 'Luminaires and housings',
  'Lamps': 'Bulbs and tubes',
  'Power Supplies': 'Drivers and ballasts',
  'Controls': 'Sensors and dimmers',
  'Accessories': 'Mounts, lenses, trims',
};

export function ImportConfigStep({
  companyId,
  companyName,
  luminaireType,
  onCompanyChange,
  onLuminaireTypeChange,
}: ImportConfigStepProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading, isError } = useCompanies({
    search: debouncedSearch || undefined,
    pageSize: 20,
  });

  const companies = data?.rows ?? [];
  const totalCount = data?.total_count ?? 0;
  const hiddenCount = Math.max(0, totalCount - companies.length);

  const companySlug = companyName ? slugify(companyName) : null;
  const typeSlug = luminaireType ? LUMINAIRE_TYPE_SLUGS[luminaireType] : null;
  const prefixReady = Boolean(companySlug && typeSlug);
  const storagePrefix = prefixReady
    ? `${LED_BUCKET}/${companySlug}/${typeSlug}/`
    : `${LED_BUCKET}/${companySlug ?? '<company>'}/${typeSlug ?? '<type>'}/`;

  return (
    <div className="space-y-6">
      {/* Company */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-5 w-5 text-[#3B4A6B]" />
            Company
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between font-normal"
              >
                <span
                  className={cn(
                    'truncate',
                    !companyName && 'text-muted-foreground',
                  )}
                >
                  {companyName ?? 'Select a company…'}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[--radix-popover-trigger-width] p-0"
              align="start"
            >
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Search companies…"
                  value={search}
                  onValueChange={setSearch}
                />
                <CommandList>
                  {isLoading ? (
                    <div className="space-y-2 p-3">
                      <Skeleton className="h-5 w-full" />
                      <Skeleton className="h-5 w-4/5" />
                      <Skeleton className="h-5 w-3/5" />
                    </div>
                  ) : isError ? (
                    <CommandEmpty>Could not load companies.</CommandEmpty>
                  ) : companies.length === 0 ? (
                    <CommandEmpty>
                      {debouncedSearch
                        ? `No company matches “${debouncedSearch}”.`
                        : 'No companies available.'}
                    </CommandEmpty>
                  ) : (
                    <CommandGroup>
                      {companies.map(company => (
                        <CommandItem
                          key={company.id}
                          value={String(company.id)}
                          onSelect={() => {
                            onCompanyChange(company.id, company.name);
                            setOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4 text-[#7BA23F]',
                              companyId === company.id
                                ? 'opacity-100'
                                : 'opacity-0',
                            )}
                          />
                          <span className="truncate">{company.name}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
              {hiddenCount > 0 && (
                <p className="border-t px-3 py-2 text-xs text-muted-foreground">
                  Showing {companies.length} of {totalCount}. Keep typing to
                  narrow the list.
                </p>
              )}
            </PopoverContent>
          </Popover>
          <p className="text-xs text-muted-foreground">
            Assets are filed under the company’s slug, so the company decides
            where every uploaded file lands.
          </p>
        </CardContent>
      </Card>

      {/* Luminaire type */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Luminaire Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            role="radiogroup"
            aria-label="Luminaire type"
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {LUMINAIRE_TYPES.map(type => {
              const Icon = TYPE_ICONS[type];
              const selected = luminaireType === type;
              return (
                <button
                  key={type}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onLuminaireTypeChange(type)}
                  className={cn(
                    'flex items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                    selected
                      ? 'border-[#5B6FAF] bg-[#5B6FAF]/5 ring-1 ring-[#5B6FAF]'
                      : 'border-border hover:bg-muted/40',
                  )}
                >
                  <Icon
                    className={cn(
                      'mt-0.5 h-5 w-5 shrink-0',
                      selected ? 'text-[#5B6FAF]' : 'text-muted-foreground',
                    )}
                  />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{type}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {TYPE_HINTS[type]}
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-muted-foreground/70">
                      {LUMINAIRE_TYPE_SLUGS[type]}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Storage prefix feedback */}
      <Card
        className={cn(
          prefixReady && 'border-[#7BA23F] bg-[#7BA23F]/5',
        )}
      >
        <CardContent className="flex items-start gap-3 pt-6">
          <FolderTree
            className={cn(
              'h-5 w-5 shrink-0',
              prefixReady ? 'text-[#7BA23F]' : 'text-muted-foreground',
            )}
          />
          <div className="min-w-0 space-y-1">
            <div className="text-sm font-medium">Storage destination</div>
            <code className="block break-all font-mono text-sm text-foreground">
              {storagePrefix}
            </code>
            <p className="text-xs text-muted-foreground">
              {prefixReady
                ? 'Every resolved spec sheet, instruction and image for this import is written here.'
                : 'Pick a company and a luminaire type to lock in the destination.'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
