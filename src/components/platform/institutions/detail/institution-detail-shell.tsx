"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InstitutionProfileTab from "./institution-profile-tab";
import InstitutionThemeTab from "./institution-theme-tab";
import InstitutionUsersTab from "./institution-users-tab";
import InstitutionDataTab from "./institution-data-tab";

export interface InstitutionDetail {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  street_address: string;
  extended_address: string | null;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  time_zone: string | null;
  email_address: string | null;
  phone_number: string | null;
  website_url: string | null;
  logo_url: string | null;
  facility_image_url: string | null;
  social_links: Record<string, string> | null;
  theme_colors: string[] | null;
  stats_active: boolean;
  iabes_member: boolean;
}

export interface InstitutionUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface Props {
  institution: InstitutionDetail;
  users: InstitutionUser[];
}

export default function InstitutionDetailShell({ institution, users }: Props) {
  const router = useRouter();
  const [currentInstitution, setCurrentInstitution] = useState(institution);
  const [isDeletingInstitution, setIsDeletingInstitution] = useState(false);

  useEffect(() => {
    setCurrentInstitution(institution);
  }, [institution]);

  async function handleDeleteInstitution() {
    setIsDeletingInstitution(true);

    const res = await fetch(`/api/platform/institutions/${currentInstitution.id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      toast.success("Institution deleted.");
      router.push("/platform/institutions");
      return;
    }

    const data = await res.json().catch(() => ({}));
    toast.error(data?.message ?? "Failed to delete institution.");
    setIsDeletingInstitution(false);
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Button variant="ghost" size="sm" className="-ml-2 w-fit" asChild>
            <Link href="/platform/institutions">
              <ArrowLeft className="mr-1 size-4" aria-hidden="true" />
              Institutions
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{currentInstitution.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/${currentInstitution.slug}/dashboard`}>View as Admin</Link>
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete Institution</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete institution?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove {currentInstitution.name} and all tenant-scoped data
                  tied to it. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeletingInstitution}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  disabled={isDeletingInstitution}
                  onClick={handleDeleteInstitution}
                >
                  {isDeletingInstitution ? "Deleting…" : "Delete institution"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile">
        <TabsList aria-label="Institution settings">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="theme">Theme</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <InstitutionProfileTab institution={currentInstitution} onSaved={setCurrentInstitution} />
        </TabsContent>

        <TabsContent value="theme">
          <InstitutionThemeTab institution={currentInstitution} />
        </TabsContent>

        <TabsContent value="users">
          <InstitutionUsersTab institution={currentInstitution} initialUsers={users} />
        </TabsContent>

        <TabsContent value="data">
          <InstitutionDataTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
