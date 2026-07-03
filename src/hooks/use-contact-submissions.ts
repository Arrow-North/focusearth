import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { ContactSubmission, PaginatedResult } from '@/types/database';

export interface ContactSubmissionInput {
  name: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
  companyName?: string | null;
}

export function useSubmitContactSubmission() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (values: ContactSubmissionInput) => {
      const { data, error } = await supabase.rpc('fn_submit_contact_request', {
        p_name: values.name,
        p_phone: values.phone,
        p_email: values.email,
        p_subject: values.subject,
        p_message: values.message,
        p_company_name: values.companyName ?? null,
      });

      if (error) throw error;
      return data as unknown as ContactSubmission;
    },
    onSuccess: () => {
      toast.success('Contact form submitted');
      qc.invalidateQueries({ queryKey: ['contact-submissions'] });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to submit contact form');
    },
  });
}

export function useContactSubmissions() {
  return useQuery({
    queryKey: ['contact-submissions'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('fn_list_contact_submissions', {
        p_page: 1,
        p_page_size: 100,
      });

      if (error) throw error;
      return data as unknown as PaginatedResult<ContactSubmission>;
    },
  });
}
