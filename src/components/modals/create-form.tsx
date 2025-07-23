"use client";
import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader, Plus } from "lucide-react";
import { Textarea } from "../ui/textarea";
// import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
// import { toast } from "sonner";
// import { createForm } from "@/lib/mutations";
// import { useRouter } from "next/navigation";

export const CreateFormSchema = z.object({
  formName: z.string().min(2, {
    message: "From name is required",
  }),
  formDescription: z.string().optional(),
  workspaceId: z.string().optional(),
});

function CreateForm({
  // workspaceId,
  customTriggerElement,
}: {
  workspaceId: string;
  customTriggerElement?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const form = useForm<z.infer<typeof CreateFormSchema>>({
    // @ts-ignore
    resolver: zodResolver(CreateFormSchema),
    defaultValues: {
      formName: "",
      formDescription: "",
    },
  });
  // const queryClient = useQueryClient();
  // const router = useRouter();
  // const { isPending, mutate } = useMutation({
  //   mutationFn: createForm,
  //   onSuccess: (data) => {
  //     queryClient.invalidateQueries({ queryKey: ["getForms"] });
  //     queryClient.invalidateQueries({ queryKey: ["getWorkspaces"] });
  //     toast.success("Form created successfully");
  //     setOpen(false);
  //     form.reset();
  //     router.push(`/forms/${data.id}/edit`);
  //   },
  //   onError: (error) => {
  //     toast.error("Error creating form", {
  //       description: `Error: ${error.message}`,
  //     });
  //   },
  // });

  function onSubmit(data: z.infer<typeof CreateFormSchema>) {
    console.log(data);
    // mutate({
    //   formName: data.formName.toLowerCase().trim(),
    //   formDescription: data.formDescription?.trim(),
    //   workspaceId: workspaceId,
    // });
  }

  const isPending = false;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {customTriggerElement ? (
          customTriggerElement
        ) : (
          <Button
            className="flex items-center gap-2 rounded-lg text-base font-semibold"
            size="sm"
            variant="accent"
          >
            <Plus /> <p>New Form</p>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create a new form</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="formName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>name</FormLabel>
                  <FormControl>
                    <Input placeholder="form name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="formDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>description {"(optional)"}</FormLabel>
                  <FormControl>
                    <Textarea placeholder="form description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader className="animate-spin" /> : <p>Create</p>}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateForm;
