import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import raynLogo from '@/assets/rayn-logo.png';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('Password updated successfully!');
      await signOut();
      navigate('/auth');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-[400px]">
          <div className="rounded-xl border bg-card p-8 invoice-shadow-lg text-center">
            <img src={raynLogo} alt="RayVo" className="h-20 w-auto mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">This reset link is invalid or has expired.</p>
            <Button className="mt-4" onClick={() => navigate('/auth')}>Back to login</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-[400px]">
        <div className="rounded-xl border bg-card p-8 invoice-shadow-lg">
          <div className="flex flex-col items-center gap-3 mb-8">
            <img src={raynLogo} alt="RayVo" className="h-20 w-auto" />
            <div className="text-center">
              <h1 className="text-xl font-semibold text-foreground">Reset your password</h1>
              <p className="text-sm text-muted-foreground mt-1">Enter your new password below</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm">New Password</Label>
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
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Confirm Password</Label>
              <div className="relative">
                <Input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full h-10" disabled={loading}>
              {loading ? 'Updating…' : 'Change password'}
            </Button>
          </form>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">
          © {new Date().getFullYear()} RayVo. Professional invoicing made simple.
        </p>
      </div>
    </div>
  );
}
