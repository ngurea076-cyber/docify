import { useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, MapPin, Eye, Download, UtensilsCrossed, Building2, Calendar, FileText, Star, TrendingUp } from "lucide-react";

const categories = [
  { id: "all", label: "All", icon: FileText },
  { id: "restaurant", label: "Restaurants", icon: UtensilsCrossed },
  { id: "hotel", label: "Hotels", icon: Building2 },
  { id: "events", label: "Events", icon: Calendar },
  { id: "brochures", label: "Brochures", icon: FileText },
];

const mockDocuments = [
  {
    id: "1",
    title: "Grand Hotel Menu 2024",
    description: "Full breakfast, lunch, and dinner menu",
    category: "hotel",
    location: "Nairobi, Kenya",
    views: 12453,
    downloads: 3291,
    featured: true,
    trending: true,
    thumbnail: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop",
  },
  {
    id: "2",
    title: "Safari Lodge Price List",
    description: "Accommodation and activity pricing",
    category: "hotel",
    location: "Masai Mara, Kenya",
    views: 8234,
    downloads: 1256,
    featured: true,
    trending: false,
    thumbnail: "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=400&h=300&fit=crop",
  },
  {
    id: "3",
    title: "Coffee House Menu",
    description: "Specialty coffee and pastries",
    category: "restaurant",
    location: "Kampala, Uganda",
    views: 5621,
    downloads: 892,
    featured: false,
    trending: true,
    thumbnail: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=300&fit=crop",
  },
  {
    id: "4",
    title: "Tech Summit 2024 Program",
    description: "Schedule and speaker information",
    category: "events",
    location: "Lagos, Nigeria",
    views: 15678,
    downloads: 4523,
    featured: true,
    trending: true,
    thumbnail: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=300&fit=crop",
  },
  {
    id: "5",
    title: "Beachfront Resort Brochure",
    description: "Facilities and amenities guide",
    category: "brochures",
    location: "Zanzibar, Tanzania",
    views: 6789,
    downloads: 1567,
    featured: false,
    trending: false,
    thumbnail: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&h=300&fit=crop",
  },
  {
    id: "6",
    title: "Italian Bistro Menu",
    description: "Authentic Italian cuisine",
    category: "restaurant",
    location: "Cape Town, South Africa",
    views: 4321,
    downloads: 678,
    featured: false,
    trending: false,
    thumbnail: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop",
  },
];

const Explore = () => {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filteredDocuments = mockDocuments.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(search.toLowerCase()) ||
      doc.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "all" || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredDocs = filteredDocuments.filter(doc => doc.featured);
  const trendingDocs = filteredDocuments.filter(doc => doc.trending);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Hero */}
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Explore Public Documents
            </h1>
            <p className="text-lg text-muted-foreground">
              Discover menus, brochures, guides, and more from businesses around the world.
            </p>
          </div>

          {/* Search & Filters */}
          <div className="max-w-4xl mx-auto mb-12">
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search documents..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-12 h-12 text-base"
                />
              </div>
              <Button variant="outline" size="lg" className="gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </Button>
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <category.icon className="h-4 w-4" />
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          {/* Featured Section */}
          {featuredDocs.length > 0 && (
            <section className="mb-16">
              <div className="flex items-center gap-2 mb-6">
                <Star className="h-5 w-5 text-yellow-500" />
                <h2 className="text-2xl font-bold">Featured</h2>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredDocs.slice(0, 3).map((doc) => (
                  <DocumentCard key={doc.id} document={doc} />
                ))}
              </div>
            </section>
          )}

          {/* Trending Section */}
          {trendingDocs.length > 0 && (
            <section className="mb-16">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="h-5 w-5 text-accent" />
                <h2 className="text-2xl font-bold">Trending</h2>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {trendingDocs.slice(0, 3).map((doc) => (
                  <DocumentCard key={doc.id} document={doc} />
                ))}
              </div>
            </section>
          )}

          {/* All Documents */}
          <section>
            <h2 className="text-2xl font-bold mb-6">All Documents</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDocuments.map((doc) => (
                <DocumentCard key={doc.id} document={doc} />
              ))}
            </div>
            
            {filteredDocuments.length === 0 && (
              <div className="text-center py-16">
                <FileText className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-semibold mb-2">No documents found</h3>
                <p className="text-muted-foreground">Try adjusting your search or filters.</p>
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

interface DocumentCardProps {
  document: typeof mockDocuments[0];
}

const DocumentCard = ({ document }: DocumentCardProps) => {
  return (
    <a
      href={`/d/${document.id}`}
      className="group bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
    >
      {/* Thumbnail */}
      <div className="aspect-[4/3] bg-muted relative overflow-hidden">
        <img
          src={document.thumbnail}
          alt={document.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {document.trending && (
          <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium">
            <TrendingUp className="h-3 w-3" />
            Trending
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-semibold text-lg mb-1 group-hover:text-accent transition-colors">
          {document.title}
        </h3>
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {document.description}
        </p>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <MapPin className="h-4 w-4" />
          {document.location}
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            {document.views.toLocaleString()}
          </div>
          <div className="flex items-center gap-1">
            <Download className="h-4 w-4" />
            {document.downloads.toLocaleString()}
          </div>
        </div>
      </div>
    </a>
  );
};

export default Explore;
