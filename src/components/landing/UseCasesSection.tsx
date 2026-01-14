import { UtensilsCrossed, Building2, Calendar, FileText } from "lucide-react";

const useCases = [
  {
    icon: UtensilsCrossed,
    title: "Restaurants & Hotels",
    description: "Digital menus with QR codes on tables. Update prices instantly without reprinting.",
    color: "bg-orange-500/10 text-orange-600",
  },
  {
    icon: Building2,
    title: "Real Estate",
    description: "Property brochures and floor plans. Track which listings get the most interest.",
    color: "bg-blue-500/10 text-blue-600",
  },
  {
    icon: Calendar,
    title: "Events & Conferences",
    description: "Event programs and schedules. QR codes on badges for instant access.",
    color: "bg-purple-500/10 text-purple-600",
  },
  {
    icon: FileText,
    title: "Authors & Creators",
    description: "Share samples, accept donations, and build an audience for your content.",
    color: "bg-green-500/10 text-green-600",
  },
];

const UseCasesSection = () => {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Built for every industry
          </h2>
          <p className="text-lg text-muted-foreground">
            From hospitality to publishing, see how businesses use PDFShare to connect with their audience.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {useCases.map((useCase, index) => (
            <div
              key={useCase.title}
              className="flex gap-5 p-6 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md transition-shadow"
            >
              <div className={`flex-shrink-0 w-14 h-14 rounded-xl ${useCase.color} flex items-center justify-center`}>
                <useCase.icon className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">{useCase.title}</h3>
                <p className="text-muted-foreground">{useCase.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default UseCasesSection;
