import { useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import raynLogo from '@/assets/rayn-logo.png';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';

export default function Auth() {
  const inviteParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const inviteEmail = inviteParams.get('email') ?? '';
  const inviteMode = inviteParams.get('mode') === 'signup';

  const [isSignUp, setIsSignUp] = useState(inviteMode);
  const [email, setEmail] = useState(inviteEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success('Check your email for a confirmation link!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Signed in!');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-[400px]">
        {/* Card */}
        <div className="rounded-xl border bg-card p-8 invoice-shadow-lg">
          <div className="flex flex-col items-center gap-3 mb-8">
            <img src={raynLogo} alt="RayVo" className="h-20 w-auto" />
            <div className="text-center">
              <h1 className="text-xl font-semibold text-foreground">
                {isSignUp ? 'Create your account' : 'Welcome back'}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {isSignUp
                  ? inviteEmail
                    ? 'Complete your sign up to join your team on RayVo'
                    : 'Get started with RayVo invoicing'
                  : 'Sign in to manage your invoices'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Email</Label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Password</Label>
                {!isSignUp && (
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={async () => {
                      if (!email) { toast.error('Enter your email first'); return; }
                      const { error } = await supabase.auth.resetPasswordForEmail(email, {
                        redirectTo: window.location.origin,
                      });
                      if (error) toast.error(error.message);
                      else toast.success('Password reset email sent! Check your inbox.');
                    }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full h-10" disabled={loading}>
              {loading ? 'Loading...' : isSignUp ? 'Create account' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-primary font-medium hover:underline"
              >
                {isSignUp ? 'Sign in' : 'Sign up'}
              </button>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © {new Date().getFullYear()} RayVo. Professional invoicing made simple.
        </p>
      </div>
    </div>
  );
}
