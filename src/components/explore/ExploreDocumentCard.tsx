import { Link } from "react-router-dom";
import { Eye, Download, MapPin, TrendingUp } from "lucide-react";
import DocumentThumbnail from "@/components/document/DocumentThumbnail";

interface ExploreDocumentCardProps {
  document: {
    id: string;
    title: string;
    description: string | null;
    file_url: string;
    slug: string | null;
    view_count: number;
    download_count: number;
    country: string | null;
    city: string | null;
    document_type: string;
    thumbnail_url: string | null;
  };
}

const ExploreDocumentCard = ({ document }: ExploreDocumentCardProps) => {
  const location = [document.city, document.country].filter(Boolean).join(", ");

  return (
    <Link
      to={`/d/${document.slug || document.id}`}
      className="group bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
    >
      <div className="aspect-square bg-muted relative overflow-hidden">
        <DocumentThumbnail
          fileUrl={document.file_url}
          title={document.title}
          thumbnailUrl={document.thumbnail_url}
          className="w-full h-full transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      <div className="p-5">
        <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors truncate">
          {document.title}
        </h3>
        {document.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {document.description}
          </p>
        )}

        {location && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <MapPin className="h-4 w-4 shrink-0" />
            {location}
          </div>
        )}

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            {document.view_count.toLocaleString()}
          </div>
          <div className="flex items-center gap-1">
            <Download className="h-4 w-4" />
            {document.download_count.toLocaleString()}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ExploreDocumentCard;
