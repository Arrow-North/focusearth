import { useNavigate } from 'react-router-dom';
import { Lightbulb } from 'lucide-react';
import type { Project } from '@/types/database';

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const navigate = useNavigate();
  const hasImage = !!project.image;

  return (
    <div
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(`/projects/${project.id}`)}
    >
      {/* Image area */}
      <div className="h-36 bg-white flex items-center justify-center overflow-hidden">
        {hasImage ? (
          <img
            src={project.image!}
            alt={project.title ?? ''}
            className="h-full w-auto object-contain rounded"
          />
        ) : (
          <div className="flex flex-col items-center justify-center">
            <Lightbulb className="h-20 w-20 text-gray-300" strokeWidth={1} />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-100 px-4 py-3 rounded-b-lg">
        <p className="font-bold text-sm text-gray-900 truncate">
          {project.title || 'Untitled Project'}
        </p>
        <p className="text-sm text-gray-600">
          Products QTY:
        </p>
      </div>
    </div>
  );
}
