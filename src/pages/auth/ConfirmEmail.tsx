import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useSupabase } from '@/hooks/useSupabase';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle } from 'lucide-react';

export default function ConfirmEmail() {
  const [params] = useSearchParams();
  const supabase = useSupabase();
  const token = params.get('token');
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>(token ? 'pending' : 'success');

  useEffect(() => {
    if (!token) return;

    supabase.rpc('fn_confirm_email', { p_token: token }).then(({ data, error }) => {
      if (error || !data) {
        setStatus('error');
      } else {
        setStatus('success');
      }
    });
  }, [token, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md text-center space-y-6 px-4">
        {status === 'pending' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="text-muted-foreground">Verifying your email...</p>
          </>
        )}

        {status === 'success' && !token && (
          <>
            <CheckCircle className="h-12 w-12 text-accent mx-auto" />
            <h2 className="text-xl font-semibold">Check your email</h2>
            <p className="text-muted-foreground">
              We've sent you a confirmation link. Please check your inbox and click the link to activate your account.
            </p>
            <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link to="/login">Go to Login</Link>
            </Button>
          </>
        )}

        {status === 'success' && token && (
          <>
            <CheckCircle className="h-12 w-12 text-accent mx-auto" />
            <h2 className="text-xl font-semibold">Email confirmed</h2>
            <p className="text-muted-foreground">Your email has been verified. You can now sign in.</p>
            <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link to="/login">Sign In</Link>
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold">Verification failed</h2>
            <p className="text-muted-foreground">
              The confirmation link is invalid or has expired.
            </p>
            <Button asChild variant="outline">
              <Link to="/login">Go to Login</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
