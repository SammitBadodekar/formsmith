"use client";
import { UploadDropzone } from "@/components/ui/upload-dropzone";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export function Uploader({
  children,
  callback,
  // deleteCallback,
  maxSize = "10 MB",
  recommendedDimensions = "minimum 1500 pixels wide",
}: {
  children: React.ReactNode;
  callback?: (url: string) => void;
  deleteCallback?: () => void;
  maxSize?: string;
  recommendedDimensions?: string;
}) {
  const [open, setOpen] = useState(false);
  const [imgLink, setImgLink] = useState("");
  const [isUploading, setIsUploading] = useState(false);

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
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
