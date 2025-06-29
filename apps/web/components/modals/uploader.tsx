"use client";
import { useUploadFile } from "better-upload/client";
import { UploadDropzone } from "@/components/ui/upload-dropzone";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Trash2 } from "lucide-react";

export function Uploader({
  children,
  callback,
  deleteCallback,
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
  const [ImgLink, setImgLink] = useState("");
  const { control } = useUploadFile({
    route: "formsmithCdn",
    onUploadComplete: ({ file }) => {
      const url = `https://cdn.formsmith.in/${file?.objectKey}`;
      console.log("Upload complete:", url);
      callback?.(url);
      setOpen(false);
    },
    onUploadProgress: (data) => {
      console.log("Upload progress:", data);
    },
  });

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
                control={control}
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
                  callback?.(ImgLink);
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
