import { useNavigate } from 'react-router-dom';
import { Lightbulb, Star, GripVertical, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Project } from '@/types/database';

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const navigate = useNavigate();
  const hasImage = !!project.image;
  const status = project.status ?? 'new';

  // Status label formatting
  const getStatusLabel = (s: string) => {
    switch (s) {
      case 'new': return 'New';
      case 'in_progress': return 'In Progress';
      case 'proposal': return 'Proposal';
      case 'approved': return 'Approved';
      case 'completed': return 'Completed';
      default: return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
    }
  };

  // Determine badge color and button based on status
  const getStatusConfig = () => {
    switch (status) {
      case 'approved':
        return {
          badgeColor: 'bg-green-500 text-white',
          button: 'Estimate',
          buttonStyle: 'bg-green-500 hover:bg-green-600 text-white border-green-500',
        };
      case 'proposal':
        return {
          badgeColor: 'bg-green-500 text-white',
          button: 'View Proposal',
          buttonStyle: 'bg-white hover:bg-gray-50 text-green-600 border-green-500',
        };
      case 'in_progress':
        return {
          badgeColor: 'bg-blue-500 text-white',
          button: 'View Details',
          buttonStyle: 'bg-white hover:bg-gray-50 text-blue-600 border-blue-500',
        };
      case 'completed':
        return {
          badgeColor: 'bg-gray-500 text-white',
          button: 'View Details',
          buttonStyle: 'bg-white hover:bg-gray-50 text-gray-600 border-gray-400',
        };
      default: // 'new' or any other
        return {
          badgeColor: 'bg-yellow-400 text-yellow-900',
          button: 'Property Info',
          buttonStyle: 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300',
        };
    }
  };

  const config = getStatusConfig();
  const statusLabel = getStatusLabel(status);

  // Format address
  const streetAddress = project.address || '';
  const cityStateZip = [
    project.city,
    project.state,
    project.zip_code,
  ].filter(Boolean).join(', ');

  return (
    <div
      className="rounded-lg border border-gray-200 overflow-hidden cursor-pointer hover:shadow-md transition-shadow bg-white"
      onClick={() => navigate(`/projects/${project.id}`)}
    >
      {/* Image area with status badge */}
      <div className="relative h-36 bg-gray-100 flex items-center justify-center overflow-hidden">
        {/* Status Badge */}
        <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold ${config.badgeColor}`}>
          {statusLabel}
        </div>

        {hasImage ? (
          <img
            src={project.image!}
            alt={project.title ?? ''}
            className="h-full w-full object-cover"
          />
        ) : (
          <Lightbulb className="h-16 w-16 text-gray-300" strokeWidth={1} />
        )}
      </div>

      {/* Info Section */}
      <div className="px-4 py-3 space-y-2">
        {/* Address */}
        <div className="flex items-start gap-2">
          <Star className="h-4 w-4 text-yellow-400 fill-yellow-400 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {streetAddress || 'No address'}
            </p>
            {cityStateZip && (
              <p className="text-xs text-gray-500 truncate">{cityStateZip}</p>
            )}
          </div>
        </div>

        {/* Project name and button */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <GripVertical className="h-4 w-4 text-gray-400 shrink-0" />
            <p className="text-sm text-gray-600 truncate">
              {project.title || 'Untitled Project'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className={`shrink-0 text-xs px-3 py-1 h-auto ${config.buttonStyle}`}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/projects/${project.id}`);
            }}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            {config.button}
          </Button>
        </div>
      </div>
    </div>
  );
}
