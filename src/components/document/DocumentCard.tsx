import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Eye,
  Download,
  QrCode,
  Link2,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DocumentThumbnail from "./DocumentThumbnail";

interface DocumentCardProps {
  doc: {
    id: string;
    title: string;
    file_url: string;
    is_public: boolean;
    view_count: number;
    download_count: number;
    thumbnail_url?: string | null;
    slug?: string | null;
  };
  onCopyLink: (slug: string) => void;
  onOpenQR: (doc: { id: string; title: string }) => void;
  onEdit: (doc: any) => void;
  onDelete: (doc: { id: string; title: string }) => void;
}

const DocumentCard = ({ doc, onCopyLink, onOpenQR, onEdit, onDelete }: DocumentCardProps) => {
  return (
    <Link
      to={`/d/${doc.slug || doc.id}`}
      className="group bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-fade-in"
    >
      {/* Thumbnail */}
      <div className="aspect-[4/3] bg-muted relative overflow-hidden">
        <DocumentThumbnail
          fileUrl={doc.file_url}
          title={doc.title}
          thumbnailUrl={doc.thumbnail_url}
          className="w-full h-full transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute top-3 right-3">
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${
              doc.is_public
                ? "bg-primary/80 text-primary-foreground"
                : "bg-muted/80 text-muted-foreground"
            }`}
          >
            {doc.is_public ? "Public" : "Private"}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-base mb-2 truncate group-hover:text-primary transition-colors">
          {doc.title}
        </h3>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
          <span className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {doc.view_count.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <Download className="h-3.5 w-3.5" />
            {doc.download_count.toLocaleString()}
          </span>
        </div>

        {/* Actions */}
        <div
          className="flex items-center gap-1 pt-2 border-t border-border"
          onClick={(e) => e.preventDefault()}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onCopyLink(doc.slug || doc.id)}
          >
            <Link2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onOpenQR({ id: doc.id, title: doc.title })}
          >
            <QrCode className="h-4 w-4" />
          </Button>
          <div className="flex-1" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(doc)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete({ id: doc.id, title: doc.title })}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Link>
  );
};

export default DocumentCard;
