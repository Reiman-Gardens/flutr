"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import type { InstitutionDetail, InstitutionUser } from "./institution-detail-shell";
import InstitutionUsersCards from "./institution-users-cards";
import InstitutionUserForm from "./institution-user-form";

const ROLE_LABELS: Record<string, string> = {
  EMPLOYEE: "Employee",
  ADMIN: "Admin",
  SUPERUSER: "Superuser",
};

interface Props {
  institution: InstitutionDetail;
  initialUsers: InstitutionUser[];
}

export default function InstitutionUsersTab({ institution, initialUsers }: Props) {
  const [users, setUsers] = useState<InstitutionUser[]>(initialUsers);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<InstitutionUser | undefined>(undefined);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  function openAdd() {
    setEditingUser(undefined);
    setDialogOpen(true);
  }

  function openEdit(user: InstitutionUser) {
    setEditingUser(user);
    setDialogOpen(true);
  }

  function handleSuccess(user: InstitutionUser) {
    if (editingUser) {
      setUsers((prev) => prev.map((u) => (u.id === user.id ? user : u)));
    } else {
      setUsers((prev) => [...prev, user]);
    }
  }

  async function handleDelete(user: InstitutionUser) {
    setIsDeletingUser(true);

    const res = await fetch(`/api/tenant/users/${user.id}`, {
      method: "DELETE",
      headers: { "x-tenant-slug": institution.slug },
    });

    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      toast.success("User removed.");
    } else {
      toast.error("Failed to remove user.");
    }

    setIsDeletingUser(false);
  }

  const onlyOneUser = users.length === 1;

  function renderDeleteAction(user: InstitutionUser, fullWidth = false) {
    if (onlyOneUser) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={fullWidth ? "block w-full" : undefined}>
              <Button
                size="sm"
                variant="destructive"
                disabled
                className={fullWidth ? "w-full" : undefined}
              >
                Delete
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>At least one user is required</TooltipContent>
        </Tooltip>
      );
    }

    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm" variant="destructive" className={fullWidth ? "w-full" : undefined}>
            Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove {user.name} from {institution.name}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingUser}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeletingUser}
              onClick={() => handleDelete(user)}
            >
              {isDeletingUser ? "Deleting…" : "Delete user"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <TooltipProvider>
      <div className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-sm">
            {users.length} {users.length === 1 ? "user" : "users"}
          </p>
          <Button size="sm" onClick={openAdd} className="w-full sm:w-auto">
            Add User
          </Button>
        </div>

        <InstitutionUsersCards
          users={users}
          onEdit={openEdit}
          renderDeleteAction={(user) => renderDeleteAction(user, true)}
        />

        <div className="hidden rounded-md border md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground py-8 text-center text-sm">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="max-w-[18rem]">
                      <span className="break-all whitespace-normal">{user.email}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{ROLE_LABELS[user.role] ?? user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(user)}>
                          Edit
                        </Button>

                        {renderDeleteAction(user)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <InstitutionUserForm
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          institutionSlug={institution.slug}
          editUser={editingUser}
          onSuccess={handleSuccess}
        />
      </div>
    </TooltipProvider>
  );
}
