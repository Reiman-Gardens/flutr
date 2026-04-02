"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { InstitutionUser } from "./institution-detail-shell";

const userFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["EMPLOYEE", "ADMIN"]),
  // Empty string = no change (edit only). Min 8 enforced when non-empty.
  password: z
    .string()
    .max(200)
    .refine((v) => !v || v.length >= 8, "Password must be at least 8 characters"),
});

type UserFormValues = z.infer<typeof userFormSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  institutionSlug: string;
  editUser?: InstitutionUser;
  onSuccess: (user: InstitutionUser) => void;
}

export default function InstitutionUserForm({
  open,
  onOpenChange,
  institutionSlug,
  editUser,
  onSuccess,
}: Props) {
  const isEdit = !!editUser;

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "EMPLOYEE",
      password: "",
    },
  });

  // Reset form whenever the dialog opens or the target user changes
  useEffect(() => {
    if (open) {
      form.reset({
        name: editUser?.name ?? "",
        email: editUser?.email ?? "",
        role:
          editUser?.role === "ADMIN" || editUser?.role === "EMPLOYEE" ? editUser.role : "EMPLOYEE",
        password: "",
      });
    }
  }, [open, editUser, form]);

  async function onSubmit(values: UserFormValues) {
    // Password required for add
    if (!isEdit && !values.password) {
      form.setError("password", { message: "Password is required" });
      return;
    }

    const tenantHeaders = {
      "Content-Type": "application/json",
      "x-tenant-slug": institutionSlug,
    };

    if (isEdit) {
      const body: Record<string, unknown> = {
        name: values.name,
        email: values.email,
        role: values.role,
      };
      if (values.password) body.password = values.password;

      const res = await fetch(`/api/tenant/users/${editUser!.id}`, {
        method: "PATCH",
        headers: tenantHeaders,
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success("User updated.");
        onSuccess({
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role,
        });
        onOpenChange(false);
      } else if (res.status === 409) {
        form.setError("email", { message: "Email already in use." });
      } else {
        toast.error("Failed to update user.");
      }
    } else {
      const res = await fetch("/api/tenant/users", {
        method: "POST",
        headers: tenantHeaders,
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          role: values.role,
          password: values.password,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success("User added.");
        onSuccess({
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role,
        });
        onOpenChange(false);
      } else if (res.status === 409) {
        form.setError("email", { message: "Email already in use." });
      } else {
        toast.error("Failed to add user.");
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit User" : "Add User"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this institution user’s details and access level."
              : "Create a new institution user and choose their role."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-2 flex flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Jane Smith" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="jane@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger aria-label="Select role">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="EMPLOYEE">Employee</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={isEdit ? "Leave blank to keep current" : "Min. 8 characters"}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="mt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? isEdit
                    ? "Saving…"
                    : "Adding…"
                  : isEdit
                    ? "Save changes"
                    : "Add user"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
