import { useNavigate, Link } from 'react-router-dom';
import { Building2, Factory, Zap, UserCircle } from 'lucide-react';
import type { UserType } from '@/types/database';

const roles: { type: UserType; label: string; description: string; icon: React.ElementType }[] = [
  { type: 'Reu', label: 'Real Estate User', description: 'Manage commercial real estate properties and energy projects', icon: Building2 },
  { type: 'Su', label: 'Supplier User', description: 'Supply LED products, fixtures, and lighting solutions', icon: Factory },
  { type: 'Eu', label: 'Electrician User', description: 'Provide electrical installation and bid on projects', icon: Zap },
  { type: 'Gu', label: 'Guest User', description: 'Browse catalogues and explore the platform', icon: UserCircle },
];

export default function Register() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-2xl space-y-8 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-primary">F</span>
            <span className="text-accent">O</span>
            <span className="text-primary">CUS</span>
            {' '}
            <span className="text-primary">E</span>
            <span className="text-status-yellow">A</span>
            <span className="text-primary">RTH</span>
          </h1>
          <p className="text-muted-foreground mt-2">Select your account type to get started</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {roles.map(({ type, label, description, icon: Icon }) => (
            <button
              key={type}
              onClick={() => navigate(`/register/${type}`)}
              className="bg-card rounded-lg border border-border p-6 text-left hover:shadow-md hover:border-accent transition-all"
            >
              <Icon className="h-8 w-8 text-accent mb-3" />
              <h3 className="font-semibold text-foreground">{label}</h3>
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            </button>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
