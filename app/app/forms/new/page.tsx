"use client";

import { useFormState } from "react-dom";
import { createForm } from "@/lib/actions/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Create Form Page - Example of Server Actions with Client Components
 *
 * This page demonstrates:
 * 1. Server Actions with useFormState
 * 2. Progressive enhancement (works without JS)
 * 3. Client-side feedback and error handling
 * 4. Automatic navigation after success
 */

export default function NewFormPage() {
  const router = useRouter();
  const [state, formAction, isPending] = useFormState(createForm, {
    success: false,
  });

  // Redirect on success
  useEffect(() => {
    if (state.success && state.id) {
      router.push(`/app/forms/${state.id}`);
    }
  }, [state.success, state.id, router]);

  return (
    <div className="container max-w-2xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Create New Form</h1>

      <form action={formAction} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Form Name</Label>
          <Input
            id="name"
            name="name"
            placeholder="My Awesome Form"
            required
            disabled={isPending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (Optional)</Label>
          <Input
            id="description"
            name="description"
            placeholder="What is this form for?"
            disabled={isPending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="workspaceId">Workspace</Label>
          <Input
            id="workspaceId"
            name="workspaceId"
            placeholder="workspace-id"
            required
            disabled={isPending}
          />
          <p className="text-sm text-muted-foreground">
            You'll select from your workspaces in the actual implementation
          </p>
        </div>

        {state.error && (
          <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
            <p className="text-sm text-destructive">{state.error}</p>
          </div>
        )}

        <div className="flex gap-4">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Creating..." : "Create Form"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isPending}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
