"use client";
import React, { useTransition } from "react";
import { Form } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Loader, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteForm } from "@/lib/actions/forms";
import { toast } from "sonner";

const DeleteFormModal = ({
  form,
  onDelete,
}: {
  form: Form;
  onDelete?: () => void;
}) => {
  const [isPending, startTransition] = useTransition();

  const handleDeleteForm = async () => {
    startTransition(async () => {
      const result = await deleteForm(form.id);

      if (result.success) {
        toast.success("Form deleted successfully");
        onDelete?.();
      } else {
        toast.error("Error deleting form", {
          description: `Error: ${result.error}`,
        });
      }
    });
  };
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size={"icon"}>
          <Trash2 />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Are you sure you want to delete this form?
          </AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDeleteForm} disabled={isPending}>
            {isPending ? <Loader className="animate-spin" /> : <p>Delete</p>}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteFormModal;
