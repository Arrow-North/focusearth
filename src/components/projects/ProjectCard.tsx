import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lightbulb, Star, ExternalLink } from 'lucide-react';
import type { Project } from '@/types/database';

interface ProjectCardProps {
  project: Project;
}

// Drag handle icon (6 dots pattern)
function DragHandle() {
  return (
    <svg width="12" height="18" viewBox="0 0 12 18" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
      <ellipse cx="2.12" cy="2" rx="2.12" ry="2" fill="#5F5F5F" />
      <ellipse cx="9.36" cy="2" rx="2.12" ry="2" fill="#5F5F5F" />
      <ellipse cx="2.12" cy="9" rx="2.12" ry="2" fill="#5F5F5F" />
      <ellipse cx="9.36" cy="9" rx="2.12" ry="2" fill="#5F5F5F" />
      <ellipse cx="2.12" cy="16" rx="2.12" ry="2" fill="#5F5F5F" />
      <ellipse cx="9.36" cy="16" rx="2.12" ry="2" fill="#5F5F5F" />
    </svg>
  );
}

export function ProjectCard({ project }: ProjectCardProps) {
  const navigate = useNavigate();
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const hasImage = !!project.image && !imgError;
  const status = project.status ?? 'new';
  const isPriority = project.is_priority ?? false;

  // Status configuration matching the reference design
  const getStatusConfig = () => {
    switch (status) {
      case 'approved':
        return {
          label: 'Approved',
          badgeColor: 'bg-[#6B9B7A]', // Muted green
          button: 'Estimate',
          buttonStyle: 'bg-[#6B9B7A] hover:bg-[#5a8a69] text-white border-[#6B9B7A]',
        };
      case 'proposal':
        return {
          label: 'Proposal Review',
          badgeColor: 'bg-[#C8B44D]', // Yellow/gold
          button: 'View Proposal',
          buttonStyle: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300',
        };
      case 'in_progress':
      case 'new':
        return {
          label: 'Light Count',
          badgeColor: 'bg-[#5B9AA9]', // Teal/blue
          button: 'Property Info',
          buttonStyle: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300',
        };
      case 'completed':
        return {
          label: 'Fulfilled',
          badgeColor: 'bg-gray-500',
          button: 'View Details',
          buttonStyle: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300',
        };
      default:
        return {
          label: 'Light Count',
          badgeColor: 'bg-[#5B9AA9]',
          button: 'Property Info',
          buttonStyle: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300',
        };
    }
  };

  const config = getStatusConfig();

  // Format address
  const streetAddress = project.address || '';
  const cityStateZip = [project.city, project.state, project.zip_code]
    .filter(Boolean)
    .join(project.state && project.zip_code ? ', ' : ' ');

  return (
    <div
      className="rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow bg-white shadow-sm"
      onClick={() => navigate(`/projects/${project.id}`)}
    >
      {/* Image area with status badge */}
      <div className="relative h-40 bg-gray-200 flex items-center justify-center overflow-hidden">
        {/* Status Badge - positioned in top-left corner */}
        <div
          className={`absolute top-0 left-0 px-4 py-1.5 text-xs font-medium text-white ${config.badgeColor}`}
          style={{
            clipPath: 'polygon(0 0, 100% 0, 90% 100%, 0 100%)',
            paddingRight: '24px',
          }}
        >
          {config.label}
        </div>

        {hasImage ? (
          <>
            {!imgLoaded && (
              <div className="absolute inset-0 bg-gray-200 animate-pulse" />
            )}
            <img
              src={project.image!}
              alt={project.title ?? ''}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
              className={`h-full w-full object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
          </>
        ) : (
          <Lightbulb className="h-16 w-16 text-gray-300" strokeWidth={1} />
        )}
      </div>

      {/* Info Section */}
      <div className="px-4 py-3 space-y-2">
        {/* Address with star icon */}
        <div className="flex items-start gap-2">
          <Star
            className={`h-4 w-4 shrink-0 mt-0.5 ${
              isPriority ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
            }`}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 leading-tight">
              {streetAddress || 'No address'}
            </p>
            {cityStateZip && (
              <p className="text-sm text-gray-600">{cityStateZip}</p>
            )}
          </div>
        </div>

        {/* Project name and action button */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2 min-w-0">
            <DragHandle />
            <p className="text-sm text-gray-700 truncate font-medium">
              {project.title || 'Untitled Project'}
            </p>
          </div>
          <button
            className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${config.buttonStyle}`}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/projects/${project.id}`);
            }}
          >
            <ExternalLink className="h-3 w-3" />
            {config.button}
          </button>
        </div>
      </div>
    </div>
  );
}
