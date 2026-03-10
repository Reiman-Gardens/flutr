"use client";

import { type FormEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type InstitutionUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  institutionId: number;
};

type UsersTableClientProps = {
  initialUsers: InstitutionUser[];
  institutionId: number;
};

const roleOptions = ["EMPLOYEE", "ADMIN", "ORG_SUPERUSER", "SUPERUSER"];
const createRoleOptions = ["EMPLOYEE", "ADMIN", "ORG_SUPERUSER"];

type ApiErrorBody = {
  error?: string;
  details?: Array<{ path?: string; message?: string }>;
};

function getErrorMessage(body: ApiErrorBody | null, fallback: string) {
  if (body?.error === "Invalid request" && Array.isArray(body.details) && body.details.length > 0) {
    return (
      body.details
        .map((detail) => detail.message)
        .filter(Boolean)
        .join(" ") || fallback
    );
  }

  return body?.error ?? fallback;
}

export default function UsersTableClient({ initialUsers, institutionId }: UsersTableClientProps) {
  const [users, setUsers] = useState<InstitutionUser[]>(initialUsers);
  const [draftRoles, setDraftRoles] = useState<Record<number, string>>({});
  const [rowMessages, setRowMessages] = useState<Record<number, string>>({});
  const [savingUserId, setSavingUserId] = useState<number | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState("EMPLOYEE");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createFieldErrors, setCreateFieldErrors] = useState<Record<string, string[]>>({});

  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);

  const clearRowMessage = (userId: number) => {
    setRowMessages((prev) => {
      if (!(userId in prev)) return prev;
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  };

  const setRowMessage = (userId: number, message: string) => {
    setRowMessages((prev) => ({ ...prev, [userId]: message }));
  };

  const getCreateFieldError = (field: string) => createFieldErrors[field]?.[0] ?? null;

  const handleRoleChange = (userId: number, value: string) => {
    setDraftRoles((prev) => ({ ...prev, [userId]: value }));
    clearRowMessage(userId);
  };

  const handleSaveRole = async (userId: number) => {
    const user = usersById.get(userId);
    if (!user) return;

    const nextRole = draftRoles[userId] ?? user.role;
    if (nextRole === user.role) return;

    setSavingUserId(userId);
    clearRowMessage(userId);

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: nextRole,
          institutionId,
        }),
      });

      const body = (await response.json().catch(() => null)) as ApiErrorBody | null;

      if (!response.ok) {
        setRowMessage(userId, getErrorMessage(body, "Unable to update role."));
        return;
      }

      setUsers((prev) => prev.map((row) => (row.id === userId ? { ...row, role: nextRole } : row)));
      setDraftRoles((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      setRowMessage(userId, "Role updated.");
    } catch {
      setRowMessage(userId, "Unable to update role.");
    } finally {
      setSavingUserId(null);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    setDeletingUserId(userId);
    clearRowMessage(userId);

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institutionId }),
      });

      const body = (await response.json().catch(() => null)) as ApiErrorBody | null;

      if (!response.ok) {
        setRowMessage(userId, getErrorMessage(body, "Unable to delete user."));
        return;
      }

      setUsers((prev) => prev.filter((user) => user.id !== userId));
    } catch {
      setRowMessage(userId, "Unable to delete user.");
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCreating(true);
    setCreateError(null);
    setCreateFieldErrors({});

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName,
          email: createEmail,
          password: createPassword,
          role: createRole,
          institutionId,
        }),
      });

      const body = (await response.json().catch(() => null)) as
        | ApiErrorBody
        | InstitutionUser
        | null;

      if (!response.ok) {
        if (
          response.status === 400 &&
          body &&
          typeof body === "object" &&
          "error" in body &&
          body.error === "Invalid request" &&
          Array.isArray(body.details)
        ) {
          const nextFieldErrors: Record<string, string[]> = {};
          body.details.forEach((detail) => {
            const key = detail.path && detail.path.length > 0 ? detail.path : "form";
            if (!nextFieldErrors[key]) nextFieldErrors[key] = [];
            nextFieldErrors[key].push(detail.message ?? "Invalid value");
          });
          setCreateFieldErrors(nextFieldErrors);
          setCreateError("Please correct the highlighted fields.");
          return;
        }

        if (response.status === 403) {
          setCreateError(
            body && typeof body === "object" && "error" in body
              ? (body.error ?? "Forbidden")
              : "Forbidden",
          );
          return;
        }

        setCreateError(
          body && typeof body === "object" && "error" in body
            ? (body.error ?? "Unable to create user.")
            : "Unable to create user.",
        );
        return;
      }

      const createdUser = body as InstitutionUser;
      setUsers((prev) => [...prev, createdUser]);
      setCreateName("");
      setCreateEmail("");
      setCreatePassword("");
      setCreateRole("EMPLOYEE");
      setCreateError(null);
      setCreateFieldErrors({});
      setShowCreateForm(false);
    } catch {
      setCreateError("Unable to create user.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" onClick={() => setShowCreateForm((prev) => !prev)}>
          {showCreateForm ? "Cancel" : "Add User"}
        </Button>
      </div>

      {showCreateForm ? (
        <form className="grid gap-4 rounded-md border p-4" onSubmit={handleCreateUser}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="create-name">Name *</Label>
              <Input
                id="create-name"
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
                required
              />
              {getCreateFieldError("name") ? (
                <p className="text-destructive text-xs">{getCreateFieldError("name")}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-email">Email *</Label>
              <Input
                id="create-email"
                type="email"
                value={createEmail}
                onChange={(event) => setCreateEmail(event.target.value)}
                required
              />
              {getCreateFieldError("email") ? (
                <p className="text-destructive text-xs">{getCreateFieldError("email")}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-password">Password *</Label>
              <Input
                id="create-password"
                type="password"
                value={createPassword}
                onChange={(event) => setCreatePassword(event.target.value)}
                required
              />
              {getCreateFieldError("password") ? (
                <p className="text-destructive text-xs">{getCreateFieldError("password")}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-role">Role *</Label>
              <Select value={createRole} onValueChange={setCreateRole}>
                <SelectTrigger id="create-role" className="w-full">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {createRoleOptions.map((roleOption) => (
                    <SelectItem key={roleOption} value={roleOption}>
                      {roleOption}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {getCreateFieldError("role") ? (
                <p className="text-destructive text-xs">{getCreateFieldError("role")}</p>
              ) : null}
            </div>
          </div>

          {createError ? (
            <p className="text-destructive text-sm" role="status" aria-live="polite">
              {createError}
            </p>
          ) : null}
          {createFieldErrors.form?.length ? (
            <ul
              className="text-destructive list-disc space-y-1 pl-5 text-xs"
              role="status"
              aria-live="polite"
            >
              {createFieldErrors.form.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          ) : null}

          <div className="flex justify-end">
            <Button type="submit" disabled={isCreating}>
              {isCreating ? "Creating..." : "Create User"}
            </Button>
          </div>
        </form>
      ) : null}

      {users.length === 0 ? (
        <div className="text-muted-foreground text-sm" role="status" aria-live="polite">
          No users found for this institution.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const selectedRole = draftRoles[user.id] ?? user.role;
              const isDirty = selectedRole !== user.role;
              const isSaving = savingUserId === user.id;
              const isDeleting = deletingUserId === user.id;
              const message = rowMessages[user.id];

              return (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.id}</TableCell>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <div className="flex min-w-52 flex-col gap-2">
                      <Select
                        value={selectedRole}
                        onValueChange={(value) => handleRoleChange(user.id, value)}
                      >
                        <SelectTrigger size="sm" className="w-full">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          {roleOptions.map((roleOption) => (
                            <SelectItem key={roleOption} value={roleOption}>
                              {roleOption}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {message ? (
                        <p
                          className="text-muted-foreground text-xs"
                          role="status"
                          aria-live="polite"
                        >
                          {message}
                        </p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {isDirty ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void handleSaveRole(user.id)}
                          disabled={isSaving || isDeleting}
                        >
                          {isSaving ? "Saving..." : "Save"}
                        </Button>
                      ) : (
                        <Button type="button" variant="outline" size="sm" disabled>
                          Save
                        </Button>
                      )}

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isSaving || isDeleting}
                          >
                            {isDeleting ? "Deleting..." : "Delete"}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent size="sm">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete user?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. The backend will enforce self-delete and
                              role restrictions.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => void handleDeleteUser(user.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
