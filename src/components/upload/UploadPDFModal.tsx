import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Loader2, X, Save } from "lucide-react";

export interface DocumentData {
  id: string;
  title: string;
  description: string | null;
  allow_downloads: boolean;
  allow_donations: boolean;
  allow_comments: boolean;
  is_public: boolean;
  document_type: DocumentType;
  country: string | null;
  city: string | null;
  area: string | null;
  google_maps_url: string | null;
  file_name: string | null;
  file_size: number | null;
  file_url: string | null;
}

interface UploadPDFModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  hasPaymentMethod?: boolean;
  editMode?: boolean;
  documentData?: DocumentData | null;
}

type DocumentType = "menu" | "brochure" | "pricelist" | "event" | "notice" | "other";

const documentTypeLabels: Record<DocumentType, string> = {
  menu: "Restaurant/Hotel Menu",
  brochure: "Brochure",
  pricelist: "Price List",
  event: "Event Program",
  notice: "Public Notice",
  other: "Other",
};

const UploadPDFModal = ({ 
  open, 
  onOpenChange, 
  onSuccess, 
  hasPaymentMethod = false,
  editMode = false,
  documentData = null
}: UploadPDFModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Form state
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [allowDownloads, setAllowDownloads] = useState(true);
  const [allowDonations, setAllowDonations] = useState(false);
  const [allowComments, setAllowComments] = useState(true);
  const [isPublic, setIsPublic] = useState(false);
  const [documentType, setDocumentType] = useState<DocumentType>("other");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const resetForm = () => {
    setFile(null);
    setTitle("");
    setDescription("");
    setAllowDownloads(true);
    setAllowDonations(false);
    setAllowComments(true);
    setIsPublic(false);
    setDocumentType("other");
    setCountry("");
    setCity("");
    setArea("");
    setGoogleMapsUrl("");
  };

  // Populate form when in edit mode
  useEffect(() => {
    if (editMode && documentData && open) {
      setTitle(documentData.title);
      setDescription(documentData.description || "");
      setAllowDownloads(documentData.allow_downloads);
      setAllowDonations(documentData.allow_donations);
      setAllowComments(documentData.allow_comments);
      setIsPublic(documentData.is_public);
      setDocumentType(documentData.document_type);
      setCountry(documentData.country || "");
      setCity(documentData.city || "");
      setArea(documentData.area || "");
      setGoogleMapsUrl(documentData.google_maps_url || "");
    } else if (!open) {
      resetForm();
    }
  }, [editMode, documentData, open]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf") {
        setFile(droppedFile);
      } else {
        toast({
          title: "Invalid file",
          description: "Please upload a PDF file",
          variant: "destructive",
        });
      }
    }
  }, [toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === "application/pdf") {
        setFile(selectedFile);
      } else {
        toast({
          title: "Invalid file",
          description: "Please upload a PDF file",
          variant: "destructive",
        });
      }
    }
  };

  const handleUpload = async () => {
    if (!user) return;
    
    // For edit mode, file is optional
    if (!editMode && !file) return;
    
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your document",
        variant: "destructive",
      });
      return;
    }

    if (isPublic && documentType === "menu" && (!country.trim() || !city.trim())) {
      toast({
        title: "Location required",
        description: "Please enter the country and city for menu documents",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    
    try {
      if (editMode && documentData) {
        // Update existing document
        let updateData: any = {
          title: title.trim(),
          description: description.trim() || null,
          allow_downloads: allowDownloads,
          allow_donations: allowDonations,
          allow_comments: allowComments,
          is_public: isPublic,
          document_type: documentType,
          country: isPublic ? country.trim() || null : null,
          city: isPublic ? city.trim() || null : null,
          area: isPublic ? area.trim() || null : null,
          google_maps_url: googleMapsUrl.trim() || null,
        };

        // If a new file is uploaded, handle file replacement
        if (file && user) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from("pdfs")
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          // Add file info to update data
          updateData = {
            ...updateData,
            file_url: fileName,
            file_name: file.name,
            file_size: file.size,
          };
        }

        const { error: dbError } = await supabase
          .from("documents")
          .update(updateData)
          .eq("id", documentData.id);

        if (dbError) throw dbError;

        toast({
          title: "Success",
          description: file ? "Document and file updated successfully" : "Document updated successfully",
        });
      } else {
        // Create new document (existing logic)
        // Ensure profile exists before creating document (foreign key requirement)
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        if (!existingProfile) {
          const { error: profileError } = await supabase
            .from("profiles")
            .insert({ id: user.id });
          
          if (profileError) throw profileError;
        }

        // Upload file to storage
        const fileExt = file!.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("pdfs")
          .upload(fileName, file!);

        if (uploadError) throw uploadError;

        // Create document record
        const { error: dbError } = await supabase
          .from("documents")
          .insert({
            user_id: user.id,
            title: title.trim(),
            description: description.trim() || null,
            file_url: fileName,
            file_name: file!.name,
            file_size: file!.size,
            allow_downloads: allowDownloads,
            allow_donations: allowDonations,
            allow_comments: allowComments,
            is_public: isPublic,
            document_type: documentType,
            country: isPublic ? country.trim() || null : null,
            city: isPublic ? city.trim() || null : null,
            area: isPublic ? area.trim() || null : null,
            google_maps_url: googleMapsUrl.trim() || null,
          });

        if (dbError) throw dbError;

        toast({
          title: "Success",
          description: "Document uploaded successfully",
        });
      }

      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: editMode ? "Update failed" : "Upload failed",
        description: error.message || `Failed to ${editMode ? 'update' : 'upload'} document`,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editMode ? "Edit Document" : "Upload PDF Document"}</DialogTitle>
          <DialogDescription>
            {editMode ? "Update your document settings" : "Upload a PDF file and configure its settings"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* File Upload Area - only show for new uploads */}
          {!editMode && (
            <div
              className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : file
                  ? "border-accent bg-accent/10"
                  : "border-border hover:border-primary/50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {file ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-foreground font-medium mb-1">
                    Drag and drop your PDF here
                  </p>
                  <p className="text-sm text-muted-foreground mb-3">
                    or click to browse
                  </p>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              )}
            </div>
          )}

          {/* File replacement area in edit mode */}
          {editMode && (
            <div className="space-y-3">
              {/* Current file info */}
              {documentData?.file_name && !file && (
                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border">
                  <FileText className="h-8 w-8 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{documentData.file_name}</p>
                    {documentData.file_size && (
                      <p className="text-sm text-muted-foreground">
                        {(documentData.file_size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Replace file drop zone */}
              <div
                className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
                  dragActive
                    ? "border-primary bg-primary/5"
                    : file
                    ? "border-accent bg-accent/10"
                    : "border-border hover:border-primary/50"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {file ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-6 w-6 text-primary" />
                      <div>
                        <p className="font-medium text-foreground text-sm">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB (new file)
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setFile(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-1">
                      Drop a new PDF here to replace the current file
                    </p>
                    <p className="text-xs text-muted-foreground">or click to browse</p>
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Enter document title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of your document"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Toggle Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="downloads">Allow Downloads</Label>
                <p className="text-xs text-muted-foreground">
                  Let viewers download the PDF
                </p>
              </div>
              <Switch
                id="downloads"
                checked={allowDownloads}
                onCheckedChange={setAllowDownloads}
              />
            </div>

            <div className={`flex items-center justify-between ${!hasPaymentMethod ? 'opacity-50' : ''}`}>
              <div>
                <Label htmlFor="donations">Enable Donations</Label>
                <p className="text-xs text-muted-foreground">
                  {hasPaymentMethod 
                    ? "Allow viewers to support you" 
                    : "Set up payment method in Profile first"}
                </p>
              </div>
              <Switch
                id="donations"
                checked={allowDonations}
                onCheckedChange={setAllowDonations}
                disabled={!hasPaymentMethod}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="comments">Allow Comments</Label>
                <p className="text-xs text-muted-foreground">
                  Enable comments on your document
                </p>
              </div>
              <Switch
                id="comments"
                checked={allowComments}
                onCheckedChange={setAllowComments}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="public">Publish to Explore</Label>
                <p className="text-xs text-muted-foreground">
                  Make discoverable on Explore page
                </p>
              </div>
              <Switch
                id="public"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
            </div>
          </div>

          {/* Public Document Settings */}
          {isPublic && (
            <div className="space-y-4 p-4 bg-accent/30 rounded-lg border border-accent">
              <div className="space-y-2">
                <Label htmlFor="docType">Document Type *</Label>
                <Select
                  value={documentType}
                  onValueChange={(value: DocumentType) => setDocumentType(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(documentTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {documentType === "menu" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country *</Label>
                    <Input
                      id="country"
                      placeholder="e.g., Kenya"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      placeholder="e.g., Nairobi"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="area">Area/Neighborhood</Label>
                    <Input
                      id="area"
                      placeholder="e.g., Westlands"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="googleMapsUrl">Google Maps Link</Label>
                    <Input
                      id="googleMapsUrl"
                      placeholder="Paste Google Maps URL here"
                      value={googleMapsUrl}
                      onChange={(e) => setGoogleMapsUrl(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Open Google Maps, find your location, and copy the share link
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Upload/Save Button */}
          <Button
            onClick={handleUpload}
            disabled={(!editMode && !file) || uploading}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {editMode ? "Saving..." : "Uploading..."}
              </>
            ) : (
              <>
                {editMode ? <Save className="h-4 w-4 mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                {editMode ? "Save Changes" : "Upload Document"}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UploadPDFModal;
