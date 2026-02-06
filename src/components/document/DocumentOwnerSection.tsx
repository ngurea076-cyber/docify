import { Button } from "@/components/ui/button";
import { MapPin, Navigation, User } from "lucide-react";
import StarRating from "./StarRating";

interface DocumentOwnerSectionProps {
  owner: {
    username: string | null;
    avatar_url: string | null;
  } | null;
  documentType: string;
  country?: string | null;
  city?: string | null;
  area?: string | null;
  rating?: number;
  reviewCount?: number;
}

const DocumentOwnerSection = ({
  owner,
  documentType,
  country,
  city,
  area,
  rating = 0,
  reviewCount = 0,
}: DocumentOwnerSectionProps) => {
  const hasLocation = country || city || area;
  const isHotelOrRestaurant = documentType === "menu";

  const getLocationString = () => {
    const parts = [area, city, country].filter(Boolean);
    return parts.join(", ");
  };

  const handleGetDirections = () => {
    const locationQuery = getLocationString();
    if (locationQuery) {
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationQuery)}`;
      window.open(mapsUrl, "_blank");
    }
  };

  const getOwnerInitials = () => {
    if (owner?.username) {
      return owner.username.slice(0, 2).toUpperCase();
    }
    return "AN";
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
      <div className="flex items-start gap-4">
        {/* Profile Picture */}
        <div className="shrink-0">
          {owner?.avatar_url ? (
            <img
              src={owner.avatar_url}
              alt={owner.username || "Owner"}
              className="w-16 h-16 rounded-xl object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="text-xl font-bold text-primary">
                {getOwnerInitials()}
              </span>
            </div>
          )}
        </div>

        {/* Owner Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold truncate">
            {owner?.username || "Anonymous"}
          </h3>
          
          {/* Location */}
          {hasLocation && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="truncate">{getLocationString()}</span>
            </div>
          )}

          {/* Star Rating for Hotels/Restaurants */}
          {isHotelOrRestaurant && (
            <div className="flex items-center gap-2 mt-2">
              <StarRating rating={rating} size="sm" />
              <span className="text-sm text-muted-foreground">
                {rating > 0 ? rating.toFixed(1) : "No ratings"} 
                {reviewCount > 0 && ` (${reviewCount} reviews)`}
              </span>
            </div>
          )}
        </div>

        {/* Get Directions Button */}
        {hasLocation && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-2"
            onClick={handleGetDirections}
          >
            <Navigation className="h-4 w-4" />
            <span className="hidden sm:inline">Get Directions</span>
          </Button>
        )}
      </div>
    </div>
  );
};

export default DocumentOwnerSection;
