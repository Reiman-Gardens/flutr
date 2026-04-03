"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import type { InstitutionUser } from "./institution-detail-shell";

const ROLE_LABELS: Record<string, string> = {
  EMPLOYEE: "Employee",
  ADMIN: "Admin",
  SUPERUSER: "Superuser",
};

interface Props {
  users: InstitutionUser[];
  onEdit: (user: InstitutionUser) => void;
  renderDeleteAction: (user: InstitutionUser) => React.ReactNode;
}

export default function InstitutionUsersCards({ users, onEdit, renderDeleteAction }: Props) {
  if (users.length === 0) {
    return (
      <Card className="md:hidden">
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground text-sm">No users found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4 md:hidden">
      {users.map((user) => (
        <Card key={user.id}>
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-base font-medium break-words">{user.name}</p>
                <p className="text-muted-foreground text-sm break-all">{user.email}</p>
              </div>

              <Badge variant="outline">{ROLE_LABELS[user.role] ?? user.role}</Badge>
            </div>

            <div className="xs:flex-row flex flex-col gap-2">
              <Button variant="outline" onClick={() => onEdit(user)} className="xs:flex-1">
                Edit
              </Button>
              <div className="xs:flex-1">{renderDeleteAction(user)}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
