import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useUser, useUpdateUser, useDeleteUser } from '@/hooks/use-users';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Pencil, Save, X, Upload, Trash2, ExternalLink, Plus, Minus } from 'lucide-react';

// ─── Schema ──────────────────────────────────────────────────────────────────

const editSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  title: z.string().optional(),
  phone: z.string().optional(),
});

type EditFormValues = z.infer<typeof editSchema>;

// ─── Subject Interests ───────────────────────────────────────────────────────

const SUBJECT_INTERESTS = [
  { key: 'architecture', label: 'Architecture', color: '#d946a8' },
  { key: 'cyrcadian_rhythm', label: 'Cyrcadian Rhythm', color: '#e87c3e' },
  { key: 'engineering', label: 'Engineering', color: '#c4b84d' },
  { key: 'illumination', label: 'Illumination', color: '#e8893e' },
  { key: 'environment', label: 'Environment', color: '#3eb89e' },
  { key: 'property_value', label: 'Property Value', color: '#5ab84d' },
  { key: 'energy', label: 'Energy', color: '#d4c83e' },
  { key: 'technology', label: 'Technology', color: '#4477aa' },
] as const;

// ─── LED Lighting Elements ───────────────────────────────────────────────────

const LED_CATEGORIES = [
  {
    name: 'Illumination',
    color: '#e87c3e',
    items: [
      { key: 'intensity', label: 'Intensity' },
      { key: 'uniformity', label: 'Uniformity' },
      { key: 'color_quality', label: 'Color Quality' },
      { key: 'color_rendering', label: 'Color Rendering' },
      { key: 'human_centric', label: 'Human Centric' },
    ],
  },
  {
    name: 'Technology',
    color: '#4477aa',
    items: [
      { key: 'efficiency', label: 'Efficiency' },
      { key: 'sensors', label: 'Sensors' },
      { key: 'energy_monitoring', label: 'Energy Monitoring' },
      { key: 'system_longevity', label: 'System Longevity' },
      { key: 'internet_of_things', label: 'Internet of Things' },
    ],
  },
  {
    name: 'Valuation',
    color: '#6d8b3e',
    items: [
      { key: 'flexible_space', label: 'Flexible Space' },
      { key: 'expense_reduction', label: 'Expense Reduction' },
      { key: 'financing_laas', label: 'Financing/LaaS' },
      { key: 'user_experience', label: 'User Experience' },
      { key: 'asset_resilience', label: 'Asset Resilience' },
    ],
  },
  {
    name: 'Environment',
    color: '#5ab84d',
    items: [
      { key: 'clean_energy', label: 'Clean Energy' },
      { key: 'sustainability', label: 'Sustainability' },
      { key: 'eco_design', label: 'Eco Design' },
      { key: 'green_programs', label: 'Green Programs' },
      { key: 'grey_energy', label: 'Grey Energy' },
    ],
  },
] as const;

// ─── Bubble Chart ────────────────────────────────────────────────────────────

function BubbleChart({
  categories,
  values,
}: {
  categories: typeof LED_CATEGORIES;
  values: Record<string, number>;
}) {
  // Generate deterministic bubble positions using a seed per item
  const bubbles = useMemo(() => {
    const result: { x: number; y: number; r: number; color: string; catIdx: number }[] = [];
    categories.forEach((cat, catIdx) => {
      cat.items.forEach((item, itemIdx) => {
        const pct = values[item.key] ?? 0;
        if (pct === 0) return;
        const r = Math.max(8, (pct / 50) * 50);
        // Spread items within their category column
        const colWidth = 100 / categories.length;
        const xBase = colWidth * catIdx + colWidth / 2;
        // Deterministic offsets using item index
        const seed = catIdx * 7 + itemIdx * 13;
        const xOff = ((seed % 11) - 5) * (colWidth * 0.06);
        const yBase = 20 + (itemIdx * 60) / cat.items.length;
        const yOff = ((seed % 7) - 3) * 3;
        result.push({
          x: xBase + xOff,
          y: yBase + yOff,
          r,
          color: cat.color,
          catIdx,
        });
      });
    });
    return result;
  }, [categories, values]);

  const opacities = [1, 0.7, 0.5, 0.35, 0.25];

  return (
    <div className="mt-6">
      <div className="grid grid-cols-4 mb-2">
        {categories.map((cat) => (
          <p key={cat.name} className="text-center text-sm font-semibold text-foreground">
            {cat.name}
          </p>
        ))}
      </div>
      <div className="relative w-full bg-muted/30 border border-border rounded-lg" style={{ height: 280 }}>
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          {bubbles.map((b, i) => {
            const itemIdxInCat = i % 5;
            return (
              <circle
                key={i}
                cx={b.x}
                cy={b.y}
                r={b.r / 5}
                fill={b.color}
                opacity={opacities[itemIdxInCat] ?? 0.5}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ─── Increment/Decrement Control ─────────────────────────────────────────────

function PercentControl({
  label,
  value,
  color,
  onIncrement,
  onDecrement,
  readOnly,
}: {
  label: string;
  value: number;
  color: string;
  onIncrement: () => void;
  onDecrement: () => void;
  readOnly?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 bg-muted/40 rounded-md px-3 py-2">
      <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className="text-sm font-medium text-foreground min-w-[90px]">{label}</span>
      <div className="flex items-center gap-1 ml-auto">
        {!readOnly && (
          <>
            <button
              type="button"
              onClick={onIncrement}
              className="w-7 h-7 rounded-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onDecrement}
              className="w-7 h-7 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
          </>
        )}
        <span className="text-sm text-muted-foreground w-10 text-right">{value}%</span>
      </div>
    </div>
  );
}

// ─── LED Column Control ──────────────────────────────────────────────────────

function LedPercentRow({
  label,
  value,
  color,
  onIncrement,
  onDecrement,
  readOnly,
}: {
  label: string;
  value: number;
  color: string;
  onIncrement: () => void;
  onDecrement: () => void;
  readOnly?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 bg-muted/40 rounded-md px-2 py-2">
      <span className="text-xs font-semibold text-foreground min-w-[70px] leading-tight">{label}</span>
      {!readOnly && (
        <>
          <button
            type="button"
            onClick={onIncrement}
            className="w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0 transition-colors"
            style={{ backgroundColor: color }}
          >
            <Plus className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={onDecrement}
            className="w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shrink-0 transition-colors"
          >
            <Minus className="h-3 w-3" />
          </button>
        </>
      )}
      <span className="text-xs text-muted-foreground w-9 text-right shrink-0">{value}%</span>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: user, isLoading, error } = useUser(id);
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fullName = user
    ? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()
    : '';

  const [editing, setEditing] = useState(false);

  // Local state for all editable sections
  const [localCommPrefs, setLocalCommPrefs] = useState<Record<string, boolean>>({});
  const [subjectInterests, setSubjectInterests] = useState<Record<string, number>>({});
  const [ledElements, setLedElements] = useState<Record<string, number>>({});

  useEffect(() => {
    if (user) {
      setLocalCommPrefs((user.communication_preferences ?? {}) as Record<string, boolean>);
      setSubjectInterests((user.primary_interests ?? {}) as Record<string, number>);
      setLedElements((user.profile_features ?? {}) as Record<string, number>);
    }
  }, [user]);

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { first_name: '', last_name: '', title: '', phone: '' },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        first_name: user.first_name ?? '',
        last_name: user.last_name ?? '',
        title: user.title ?? '',
        phone: user.phone ?? '',
      });
    }
  }, [user, form]);

  const adjustSubject = useCallback((key: string, delta: number) => {
    setSubjectInterests((prev) => {
      const cur = prev[key] ?? 0;
      const next = Math.max(0, Math.min(100, cur + delta));
      return { ...prev, [key]: next };
    });
  }, []);

  const adjustLed = useCallback((key: string, delta: number) => {
    setLedElements((prev) => {
      const cur = prev[key] ?? 0;
      const next = Math.max(0, Math.min(100, cur + delta));
      return { ...prev, [key]: next };
    });
  }, []);

  const toggleCommPref = (key: string) => {
    setLocalCommPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const onSubmit = (values: EditFormValues) => {
    if (!id) return;
    updateUser.mutate(
      {
        userId: id,
        fields: {
          ...values,
          communication_preferences: localCommPrefs,
          primary_interests: subjectInterests,
          profile_features: ledElements,
        },
      },
      {
        onSuccess: () => setEditing(false),
      },
    );
  };

  const handleCancel = () => {
    if (user) {
      form.reset({
        first_name: user.first_name ?? '',
        last_name: user.last_name ?? '',
        title: user.title ?? '',
        phone: user.phone ?? '',
      });
      setLocalCommPrefs((user.communication_preferences ?? {}) as Record<string, boolean>);
      setSubjectInterests((user.primary_interests ?? {}) as Record<string, number>);
      setLedElements((user.profile_features ?? {}) as Record<string, number>);
    }
    setEditing(false);
  };

  const handleDelete = () => {
    if (!id) return;
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    deleteUser.mutate(id, {
      onSuccess: () => navigate('/users'),
    });
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  const headerActions = editing ? (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        onClick={handleCancel}
        disabled={updateUser.isPending}
      >
        <X className="mr-2 h-4 w-4" />
        Cancel
      </Button>
      <Button
        className="bg-green-600 hover:bg-green-700 text-white"
        onClick={form.handleSubmit(onSubmit)}
        disabled={updateUser.isPending}
      >
        <Save className="mr-2 h-4 w-4" />
        {updateUser.isPending ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
  ) : (
    <Button
      className="bg-orange-400 hover:bg-orange-500 text-white"
      onClick={() => setEditing(true)}
    >
      <Pencil className="mr-2 h-4 w-4" />
      Edit Details
    </Button>
  );

  return (
    <DashboardLayout
      title={`Users / ${fullName || 'User Detail'}`}
      actions={headerActions}
    >
      {isLoading && (
        <div className="space-y-4 max-w-5xl mx-auto">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      )}

      {error && (
        <p className="text-destructive">
          Failed to load user: {(error as Error).message}
        </p>
      )}

      {user && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-5xl mx-auto space-y-0">
            {/* ── Profile Header ─────────────────────────────────────────── */}
            <div className="flex items-start gap-6 py-8 px-2">
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                {user.avatar ? (
                  <img src={user.avatar} alt={fullName} className="w-full h-full object-cover" />
                ) : (
                  <svg viewBox="0 0 80 80" className="w-full h-full text-muted-foreground/40">
                    <circle cx="40" cy="30" r="14" fill="currentColor" />
                    <ellipse cx="40" cy="68" rx="24" ry="18" fill="currentColor" />
                  </svg>
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">{fullName}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
                {editing && (
                  <div className="flex items-center gap-3 mt-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="border-primary text-primary hover:bg-primary/10"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload New Photo
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={deleteUser.isPending}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete User
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* ── Form Fields ────────────────────────────────────────────── */}
            <div className="py-8 px-2 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-primary font-medium">First Name:</FormLabel>
                      <FormControl>
                        <Input {...field} readOnly={!editing} className={!editing ? 'bg-muted border-border' : ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-primary font-medium">Last Name:</FormLabel>
                      <FormControl>
                        <Input {...field} readOnly={!editing} className={!editing ? 'bg-muted border-border' : ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-primary font-medium">Title:</FormLabel>
                      <FormControl>
                        <Input {...field} readOnly={!editing} className={!editing ? 'bg-muted border-border' : ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-2">
                  <Label className="text-primary font-medium">Company:</Label>
                  <div className="relative">
                    <Input readOnly value={user.company?.name ?? ''} className="bg-muted border-border pr-10" />
                    {user.company && (
                      <button
                        type="button"
                        onClick={() => navigate(`/companies/${user.company!.id}`)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-primary font-medium">Email:</Label>
                  <Input readOnly value={user.email ?? ''} className="bg-muted border-border" />
                </div>
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-primary font-medium">Phone Number:</FormLabel>
                      <FormControl>
                        <Input {...field} readOnly={!editing} className={!editing ? 'bg-muted border-border' : ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-primary font-medium">Projects:</Label>
                <Select disabled={!editing}>
                  <SelectTrigger className={`w-full ${!editing ? 'bg-muted border-border' : ''}`}>
                    <SelectValue placeholder="Select projects..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No projects</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* ── Subject Interests ───────────────────────────────────────── */}
            <div className="py-8 px-2 space-y-6">
              <div>
                <h3 className="text-lg font-bold text-foreground">Which Subjects Interest You?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Add/subtract 5% increments to build a pie chart profile of your subject matter focus. Focus Earth will share news and reports based on your priorities.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SUBJECT_INTERESTS.map((subject) => (
                  <PercentControl
                    key={subject.key}
                    label={subject.label}
                    value={subjectInterests[subject.key] ?? 0}
                    color={subject.color}
                    onIncrement={() => adjustSubject(subject.key, 5)}
                    onDecrement={() => adjustSubject(subject.key, -5)}
                    readOnly={!editing}
                  />
                ))}
              </div>
            </div>

            {editing && (
              <>
                <Separator />

                {/* ── LED Lighting Elements ───────────────────────────────────── */}
                <div className="py-8 px-2 space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">
                      Which Elements Of LED Lighting Would You Like To Learn More About?
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Add/subtract 5% increments to build a bubble chart of your broader LED interests. In which areas would you most like to contribute or expand your understanding?
                    </p>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {LED_CATEGORIES.map((cat) => (
                      <div key={cat.name}>
                        <p className="text-center text-sm font-semibold text-foreground mb-3">
                          {cat.name}
                        </p>
                        <div className="space-y-2">
                          {cat.items.map((item) => (
                            <LedPercentRow
                              key={item.key}
                              label={item.label}
                              value={ledElements[item.key] ?? 0}
                              color={cat.color}
                              onIncrement={() => adjustLed(item.key, 5)}
                              onDecrement={() => adjustLed(item.key, -5)}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <BubbleChart categories={LED_CATEGORIES} values={ledElements} />
                </div>
              </>
            )}

            <Separator />

            {/* ── Communication Preferences ───────────────────────────────── */}
            <div className="py-8 px-2 space-y-6">
              <div>
                <h3 className="text-lg font-bold text-foreground">Communication Preferences</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose when you'd like Focus Earth to send you an email notification:
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {['Messages', 'Bids', 'Orders', 'Shipping'].map((pref) => (
                  <div
                    key={pref}
                    className="flex items-center justify-between gap-3 rounded-md border border-border px-4 py-3"
                  >
                    <span className="text-sm font-medium">{pref}</span>
                    <Switch
                      checked={!!localCommPrefs[pref.toLowerCase()]}
                      onCheckedChange={() => toggleCommPref(pref.toLowerCase())}
                      disabled={!editing}
                    />
                  </div>
                ))}
              </div>
            </div>
          </form>
        </Form>
      )}
    </DashboardLayout>
  );
}
