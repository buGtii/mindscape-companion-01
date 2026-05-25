import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Leaf } from "lucide-react";

export function SiteHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground"><Leaf className="h-4 w-4" /></span>
          <span className="font-display text-xl font-semibold">Lumen</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <Link to="/search" className="hover:text-foreground">Browse DSM</Link>
          {user && <Link to="/dashboard" className="hover:text-foreground">Dashboard</Link>}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate({ to: "/" }); }}>Sign out</Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild><Link to="/login">Sign in</Link></Button>
              <Button size="sm" asChild><Link to="/login">Get started</Link></Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
