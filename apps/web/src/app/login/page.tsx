'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail } from 'lucide-react';
import { Button, Card, CardContent, Input, Label, toast } from '@govpurse/ui';
import { authClient } from '@/lib/auth-client';

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/dashboard';
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res =
        mode === 'signup'
          ? await authClient.signUp.email({ email, password, name: name || email })
          : await authClient.signIn.email({ email, password });
      if (res.error) throw new Error(res.error.message ?? 'Authentication failed');
      router.push(next);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function onMagicLink() {
    if (!email) {
      toast.error('Enter your email first');
      return;
    }
    setLoading(true);
    try {
      const res = await authClient.signIn.magicLink({ email, callbackURL: next });
      if (res.error) throw new Error(res.error.message ?? 'Could not send link');
      toast.success('Check your email for a sign-in link.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <Link href="/" className="text-ink mb-6 text-center text-xl font-semibold tracking-tight">
        Govpurse
      </Link>
      <Card>
        <CardContent className="pt-6">
          <h1 className="text-ink text-lg font-semibold">
            {mode === 'signup' ? 'Create your account' : 'Sign in'}
          </h1>
          <p className="text-muted mt-1 text-sm">
            {mode === 'signup'
              ? 'Save views and get alerts when spending changes.'
              : 'Welcome back.'}
          </p>

          <form onSubmit={onSubmit} className="mt-5 space-y-3">
            {mode === 'signup' ? (
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Working…' : mode === 'signup' ? 'Create account' : 'Sign in'}
            </Button>
          </form>

          <div className="my-4 flex items-center gap-3">
            <div className="border-line h-px flex-1 border-t" />
            <span className="text-faint text-xs uppercase">or</span>
            <div className="border-line h-px flex-1 border-t" />
          </div>
          <Button variant="secondary" className="w-full" onClick={onMagicLink} disabled={loading}>
            <Mail className="size-4" /> Email me a magic link
          </Button>

          <p className="text-muted mt-5 text-center text-sm">
            {mode === 'signup' ? 'Already have an account?' : 'New to Govpurse?'}{' '}
            <button
              type="button"
              className="text-primary-500 font-medium hover:underline"
              onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
            >
              {mode === 'signup' ? 'Sign in' : 'Create one'}
            </button>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
