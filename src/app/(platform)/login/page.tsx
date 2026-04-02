"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

type PublicInstitutionSummary = {
  facility_image_url: string | null;
};

type PublicInstitutionsResponse = {
  institutions?: PublicInstitutionSummary[];
};

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadBackgroundImage() {
      try {
        const response = await fetch("/api/public/institutions", {
          signal: controller.signal,
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as PublicInstitutionsResponse;
        const institutions = payload?.institutions ?? [];
        const firstWithImage = institutions.find((inst) => Boolean(inst.facility_image_url));

        setBackgroundImageUrl(firstWithImage?.facility_image_url ?? null);
      } catch {
        // Keep default background when the image cannot be loaded.
      }
    }

    void loadBackgroundImage();

    return () => {
      controller.abort();
    };
  }, []);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginFormData) {
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (!result?.ok) {
        toast.error(result?.error || "Invalid email or password");
        return;
      }

      toast.success("Logged in successfully");

      // Get the session to retrieve institution information
      const sessionResponse = await fetch("/api/auth/session");
      const session = await sessionResponse.json();

      if (session?.user?.institutionSlug) {
        // Redirect to institution dashboard using slug (public tenant segment)
        router.push(`/${session.user.institutionSlug}/dashboard`);
      } else {
        // Fallback if institution slug is missing (e.g. SUPERUSER with no institution)
        router.push("/");
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.");
      logger.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {backgroundImageUrl ? (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${backgroundImageUrl})` }}
        />
      ) : (
        <div aria-hidden="true" className="bg-muted absolute inset-0" />
      )}

      <div aria-hidden="true" className="absolute inset-0 bg-black/50" />

      <div className="relative flex min-h-screen items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Institution Login</CardTitle>
            <CardDescription>Enter your credentials to access your institution</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="you@example.com"
                          disabled={isLoading}
                          autoComplete="email"
                        />
                      </FormControl>
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
                          {...field}
                          type="password"
                          placeholder="••••••••"
                          disabled={isLoading}
                          autoComplete="current-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Logging in..." : "Login"}
                </Button>
              </form>
            </Form>

            <div className="text-muted-foreground mt-4 text-center text-sm">
              <p>Demo credentials available in documentation</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
