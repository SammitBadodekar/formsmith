"use client";
import { UploadDropzone } from "@/components/ui/upload-dropzone";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useCallback } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Trash2, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { createApi } from "unsplash-js";
import { unsplashImages } from "@formsmith/shared";

type UnsplashPhoto = {
  id: string;
  urls: {
    regular: string;
    small: string;
  };
  alt_description: string | null;
  user: {
    name: string;
  };
  links: {
    download_location: string;
  };
};

export function Uploader({
  children,
  callback,
  deleteCallback,
  maxSize = "10 MB",
  recommendedDimensions = "minimum 1500 pixels wide",
  showUnsplash = false,
}: {
  children: React.ReactNode;
  callback?: (url: string) => void;
  deleteCallback?: () => void;
  maxSize?: string;
  recommendedDimensions?: string;
  showUnsplash?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [imgLink, setImgLink] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [unsplashPhotos, setUnsplashPhotos] =
    useState<UnsplashPhoto[]>(unsplashImages);
  const [isSearching, setIsSearching] = useState(false);
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);
  console.log(unsplashPhotos);

  const unsplash = createApi({
    accessKey: process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY || "",
  });

  const handleFileUpload = async (file: File) => {
    try {
      setIsUploading(true);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      const url = data.image.url;

      console.log("Upload complete:", url);
      callback?.(url);
      setOpen(false);
      toast.success("Image uploaded successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const searchUnsplash = useCallback(async () => {
    if (!searchQuery.trim() || !process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY) {
      return;
    }

    setIsSearching(true);
    try {
      const result = await unsplash.search.getPhotos({
        query: searchQuery,
        perPage: 12,
        orientation: "landscape",
      });

      if (result.type === "success") {
        setUnsplashPhotos(result.response.results as UnsplashPhoto[]);
      }
    } catch (error) {
      console.error("Error searching Unsplash:", error);
      toast.error("Failed to search Unsplash. Please try again.");
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, unsplash]);

  const handleUnsplashSelect = useCallback(
    async (photo: UnsplashPhoto) => {
      try {
        // Trigger download endpoint to comply with Unsplash API guidelines
        await unsplash.photos.trackDownload({
          downloadLocation: photo.links.download_location,
        });

        callback?.(photo.urls.regular);
        setOpen(false);
        toast.success("Unsplash image selected!");
      } catch (error) {
        console.error("Error selecting Unsplash photo:", error);
        toast.error("Failed to select image. Please try again.");
      }
    },
    [callback, unsplash],
  );

  const handleSearchKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        searchUnsplash();
      }
    },
    [searchUnsplash],
  );

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger>{children}</DialogTrigger>

        <DialogContent
          className="min-h-[380px] w-full p-4 pt-4"
          // @ts-ignore
          hideClose={true}
        >
          <Tabs defaultValue="upload" className="w-full">
            <div className="flex items-center gap-2">
              <TabsList>
                <TabsTrigger value="upload">Upload</TabsTrigger>
                <TabsTrigger value="link">Link</TabsTrigger>
                {showUnsplash && (
                  <TabsTrigger value="unsplash">Unsplash</TabsTrigger>
                )}
              </TabsList>
              <Button
                variant="secondary"
                className="ml-auto"
                onClick={() => {
                  callback?.("");
                  setOpen(false);
                }}
              >
                <Trash2 />
                <p>Remove</p>
              </Button>
            </div>

            <TabsContent value="upload">
              <UploadDropzone
                onFileSelect={handleFileUpload}
                isUploading={isUploading}
                accept="image/*"
                maxSize={maxSize}
                recommendedDimensions={recommendedDimensions}
              />
            </TabsContent>

            <TabsContent value="link" className="min-h-[292px] py-4">
              <Input
                placeholder="Image URL"
                className="w-full"
                onChange={(e) => setImgLink(e.target.value)}
              />
              <Button
                className="mt-4 w-full"
                onClick={() => {
                  callback?.(imgLink);
                  setOpen(false);
                }}
              >
                Save
              </Button>
            </TabsContent>

            {showUnsplash && (
              <TabsContent value="unsplash" className="min-h-[292px] py-4">
                <div className="flex h-full flex-col">
                  <div className="mb-4 flex gap-2">
                    <Input
                      type="text"
                      placeholder="Search Unsplash images..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={handleSearchKeyPress}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      onClick={searchUnsplash}
                      disabled={isSearching || !searchQuery.trim()}
                    >
                      {isSearching ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  <div className="min-h-[200px] flex-1 overflow-y-auto rounded-lg border border-gray-200">
                    {!process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY ? (
                      <div className="flex h-full items-center justify-center p-8 text-center">
                        <p className="text-gray-500">
                          Unsplash API key not configured. Please add
                          NEXT_PUBLIC_UNSPLASH_ACCESS_KEY to your environment
                          variables.
                        </p>
                      </div>
                    ) : isSearching ? (
                      <div className="flex h-full items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 p-3 md:grid-cols-3">
                        {unsplashPhotos.map((photo) => (
                          <div
                            key={photo.id}
                            className="group relative aspect-video cursor-pointer overflow-hidden rounded-lg transition-opacity hover:opacity-90"
                            onClick={() => handleUnsplashSelect(photo)}
                          >
                            <img
                              src={photo.urls.small}
                              alt={photo.alt_description || "Unsplash photo"}
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 flex items-end bg-black bg-opacity-0 p-2 transition-all group-hover:bg-opacity-30">
                              <p className="text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                                {photo.user.name}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <p className="mt-2 text-center text-xs text-gray-500">
                    Photos from{" "}
                    <a
                      href="https://unsplash.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      Unsplash
                    </a>
                  </p>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
