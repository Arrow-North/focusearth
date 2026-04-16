import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useUpdateUser } from '@/hooks/use-users';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { USER_TYPE_LABELS } from '@/lib/roles';
import { Pencil } from 'lucide-react';
import type { UserType } from '@/types/database';

// ─── Schemas ────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  title: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    old_password: z.string().min(1, 'Current password is required'),
    new_password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm_password: z.string(),
  })
  .refine((v) => v.new_password === v.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

// ─── Props ──────────────────────────────────────────────────────────────────

interface UserProfileProps {
  initialTab?: 'info' | 'company' | 'password';
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function UserProfile({ initialTab = 'info' }: UserProfileProps) {
  const { profile, user, refreshProfile } = useAuth();
  const updateUser = useUpdateUser();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [editing, setEditing] = useState(false);

  // ── Info form ─────────────────────────────────────────────────────────────

  const infoForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: profile?.first_name ?? '',
      last_name: profile?.last_name ?? '',
      phone: profile?.phone ?? '',
      title: profile?.title ?? '',
    },
  });

  // Reset form values when profile changes or when entering edit mode
  useEffect(() => {
    if (profile) {
      infoForm.reset({
        first_name: profile.first_name ?? '',
        last_name: profile.last_name ?? '',
        phone: profile.phone ?? '',
        title: profile.title ?? '',
      });
    }
  }, [profile, infoForm]);

  const onInfoSubmit = (values: ProfileFormValues) => {
    if (!user) return;
    updateUser.mutate(
      { userId: user.id, fields: values },
      {
        onSuccess: () => {
          refreshProfile();
          setEditing(false);
        },
      },
    );
  };

  const handleCancelEdit = () => {
    infoForm.reset({
      first_name: profile?.first_name ?? '',
      last_name: profile?.last_name ?? '',
      phone: profile?.phone ?? '',
      title: profile?.title ?? '',
    });
    setEditing(false);
  };

  // ── Password form ─────────────────────────────────────────────────────────

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { old_password: '', new_password: '', confirm_password: '' },
  });

  const [passwordLoading, setPasswordLoading] = useState(false);

  const onPasswordSubmit = async (values: PasswordFormValues) => {
    setPasswordLoading(true);
    try {
      const { error } = await supabase.rpc('fn_change_password', {
        p_old_password: values.old_password,
        p_new_password: values.new_password,
      });
      if (error) throw error;
      toast.success('Password changed successfully');
      passwordForm.reset();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to change password';
      toast.error(message);
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!profile) {
    return (
      <DashboardLayout title="My Profile">
        <p className="text-muted-foreground">Loading profile...</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Profile">
      <div className="max-w-2xl">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="mb-6">
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="company">Company</TabsTrigger>
            <TabsTrigger value="password">Change Password</TabsTrigger>
          </TabsList>

          {/* ── Info Tab ─────────────────────────────────────────────── */}
          <TabsContent value="info">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Personal Information</CardTitle>
                {!editing && (
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {editing ? (
                  <Form {...infoForm}>
                    <form onSubmit={infoForm.handleSubmit(onInfoSubmit)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={infoForm.control}
                          name="first_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>First Name</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={infoForm.control}
                          name="last_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Last Name</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={infoForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={infoForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex items-center gap-2 pt-2 text-sm text-muted-foreground">
                        <span>Email:</span>
                        <span>{profile.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Type:</span>
                        <Badge variant="secondary">
                          {USER_TYPE_LABELS[profile.type as UserType] ?? profile.type}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <Button type="submit" disabled={updateUser.isPending}>
                          {updateUser.isPending ? 'Saving...' : 'Save Changes'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCancelEdit}
                          disabled={updateUser.isPending}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </Form>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">First Name</p>
                        <p className="text-sm mt-1">{profile.first_name || '—'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Last Name</p>
                        <p className="text-sm mt-1">{profile.last_name || '—'}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Phone</p>
                      <p className="text-sm mt-1">{profile.phone || '—'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Title</p>
                      <p className="text-sm mt-1">{profile.title || '—'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Email</p>
                      <p className="text-sm mt-1">{profile.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-muted-foreground">Type</p>
                      <Badge variant="secondary">
                        {USER_TYPE_LABELS[profile.type as UserType] ?? profile.type}
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Company Tab ──────────────────────────────────────────── */}
          <TabsContent value="company">
            <Card>
              <CardHeader>
                <CardTitle>Company</CardTitle>
              </CardHeader>
              <CardContent>
                {profile.associated_to_company_id ? (
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="font-medium text-muted-foreground">Company ID: </span>
                      {profile.associated_to_company_id}
                    </p>
                    {(profile as unknown as { company?: { id: number; name: string; type: string } })
                      .company && (
                      <>
                        <p>
                          <span className="font-medium text-muted-foreground">Name: </span>
                          {
                            (
                              profile as unknown as {
                                company: { id: number; name: string; type: string };
                              }
                            ).company.name
                          }
                        </p>
                        <p>
                          <span className="font-medium text-muted-foreground">Type: </span>
                          {
                            (
                              profile as unknown as {
                                company: { id: number; name: string; type: string };
                              }
                            ).company.type
                          }
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    You are not currently associated with a company.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Password Tab ─────────────────────────────────────────── */}
          <TabsContent value="password">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...passwordForm}>
                  <form
                    onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={passwordForm.control}
                      name="old_password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Password</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="new_password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="confirm_password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" disabled={passwordLoading}>
                      {passwordLoading ? 'Changing...' : 'Change Password'}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
