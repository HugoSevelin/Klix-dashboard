"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PhoneCall } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function handleSignUp() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Compte créé.");
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PhoneCall className="size-5 text-primary" />
            Klix — Prospection
          </CardTitle>
        </CardHeader>
        <Tabs defaultValue="signin">
          <CardContent>
            <TabsList className="mb-4 w-full">
              <TabsTrigger value="signin" className="flex-1">
                Connexion
              </TabsTrigger>
              <TabsTrigger value="signup" className="flex-1">
                Inscription
              </TabsTrigger>
            </TabsList>
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-2">
            <TabsContent value="signin" className="w-full">
              <Button className="w-full" disabled={loading} onClick={handleSignIn}>
                Se connecter
              </Button>
            </TabsContent>
            <TabsContent value="signup" className="w-full">
              <Button className="w-full" disabled={loading} onClick={handleSignUp}>
                Créer un compte
              </Button>
            </TabsContent>
          </CardFooter>
        </Tabs>
      </Card>
    </div>
  );
}
