import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation } from "lucide-react";
import StarRating from "./StarRating";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface DocumentOwnerSectionProps {
  documentId: string;
  owner: {
    username: string | null;
    avatar_url: string | null;
    bio?: string | null;
  } | null;
  documentType: string;
  description?: string | null;
  country?: string | null;
  city?: string | null;
  area?: string | null;
  googleMapsUrl?: string | null;
}

const DocumentOwnerSection = ({
  documentId,
  owner,
  documentType,
  description,
  country,
  city,
  area,
  googleMapsUrl,
}: DocumentOwnerSectionProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const hasLocation = country || city || area;
  const isHotelOrRestaurant = documentType === "menu";

  const [averageRating, setAverageRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);

  useEffect(() => {
    fetchRatingStats();
    if (user) {
      fetchUserRating();
    }
  }, [documentId, user]);

  const fetchRatingStats = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_document_rating_stats', { doc_id: documentId });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setAverageRating(Number(data[0].average_rating) || 0);
        setTotalRatings(Number(data[0].total_ratings) || 0);
      }
    } catch (error) {
      console.error("Error fetching rating stats:", error);
    }
  };

  const fetchUserRating = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("ratings")
        .select("rating")
        .eq("document_id", documentId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setUserRating(data.rating);
      }
    } catch (error) {
      console.error("Error fetching user rating:", error);
    }
  };

  const handleRate = async (rating: number) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to rate this document",
        variant: "destructive",
      });
      return;
    }

    setSubmittingRating(true);
    try {
      const { error } = await supabase
        .from("ratings")
        .upsert({
          document_id: documentId,
          user_id: user.id,
          rating,
        }, {
          onConflict: 'document_id,user_id'
        });

      if (error) throw error;

      setUserRating(rating);
      fetchRatingStats();
      
      toast({
        title: "Rating submitted",
        description: `You rated this ${rating} star${rating > 1 ? 's' : ''}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit rating",
        variant: "destructive",
      });
    } finally {
      setSubmittingRating(false);
    }
  };

  const getLocationString = () => {
    const parts = [area, city, country].filter(Boolean);
    return parts.join(", ");
  };

  const handleGetDirections = () => {
    if (googleMapsUrl) {
      window.open(googleMapsUrl, "_blank");
    }
  };

  const getOwnerInitials = () => {
    if (owner?.username) {
      return owner.username.slice(0, 2).toUpperCase();
    }
    return "AN";
  };

  // Use owner bio if available, otherwise fall back to document description
  const displayDescription = owner?.bio || description;

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
          
          {/* Description/Bio */}
          {displayDescription && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {displayDescription}
            </p>
          )}

          {/* Location - only show if Google Maps URL is provided */}
          {googleMapsUrl && hasLocation && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-2">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="truncate">{getLocationString()}</span>
            </div>
          )}

          {/* Star Rating for Hotels/Restaurants - Interactive */}
          {isHotelOrRestaurant && (
            <div className="mt-3 space-y-2">
              {/* Average Rating Display */}
              <div className="flex items-center gap-2">
                <StarRating rating={averageRating} size="md" />
                <span className="text-sm font-medium">
                  {averageRating > 0 ? averageRating.toFixed(1) : "No ratings"}
                </span>
                {totalRatings > 0 && (
                  <span className="text-sm text-muted-foreground">
                    ({totalRatings} review{totalRatings !== 1 ? 's' : ''})
                  </span>
                )}
              </div>
              
              {/* User Rating Input */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-muted-foreground">Your rating:</span>
                <StarRating 
                  rating={userRating} 
                  size="sm" 
                  interactive={!submittingRating}
                  onRate={handleRate}
                />
                {!user && (
                  <span className="text-xs text-muted-foreground">(sign in to rate)</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Get Directions Button - only show if googleMapsUrl is provided */}
        {googleMapsUrl && (
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