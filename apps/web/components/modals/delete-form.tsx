"use client";
import React, { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Form } from "@formsmith/database";
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
import { deleteForm } from "@/lib/mutations";

const DeleteFormModal = ({
  form,
  onDelete,
}: {
  form: Form;
  onDelete?: () => void;
}) => {
  const queryClient = useQueryClient();
  const { isPending, mutate, isSuccess } = useMutation({
    mutationFn: deleteForm,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["getForms"] });
      queryClient.invalidateQueries({ queryKey: ["getWorkspaces"] });
    },
  });
  const handleDeleteForm = async () => {
    mutate(form.id);
  };

  useEffect(() => {
    if (isSuccess) {
      onDelete?.();
    }
  }, [isSuccess]);
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
