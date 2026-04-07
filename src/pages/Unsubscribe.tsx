import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

type Status = "loading" | "valid" | "already" | "invalid" | "done" | "error";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${token}`;
    fetch(url, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } })
      .then(r => r.json())
      .then(d => {
        if (d.valid === false && d.reason === "already_unsubscribed") setStatus("already");
        else if (d.valid) setStatus("valid");
        else setStatus("invalid");
      })
      .catch(() => setStatus("invalid"));
  }, [token]);

  const handleUnsubscribe = async () => {
    if (!token) return;
    setSubmitting(true);
    try {
      const { data } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
      setStatus(data?.success ? "done" : data?.reason === "already_unsubscribed" ? "already" : "error");
    } catch { setStatus("error"); }
    setSubmitting(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          {status === "loading" && <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />}
          {status === "valid" && (
            <>
              <h1 className="text-xl font-semibold text-foreground">Unsubscribe</h1>
              <p className="text-muted-foreground text-sm">Are you sure you want to unsubscribe from these emails?</p>
              <Button onClick={handleUnsubscribe} disabled={submitting} className="w-full">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirm Unsubscribe
              </Button>
            </>
          )}
          {status === "done" && (
            <>
              <CheckCircle className="mx-auto h-10 w-10 text-green-500" />
              <h1 className="text-xl font-semibold text-foreground">Unsubscribed</h1>
              <p className="text-muted-foreground text-sm">You've been successfully unsubscribed.</p>
            </>
          )}
          {status === "already" && (
            <>
              <CheckCircle className="mx-auto h-10 w-10 text-muted-foreground" />
              <h1 className="text-xl font-semibold text-foreground">Already Unsubscribed</h1>
              <p className="text-muted-foreground text-sm">You've already unsubscribed from these emails.</p>
            </>
          )}
          {status === "invalid" && (
            <>
              <XCircle className="mx-auto h-10 w-10 text-destructive" />
              <h1 className="text-xl font-semibold text-foreground">Invalid Link</h1>
              <p className="text-muted-foreground text-sm">This unsubscribe link is invalid or has expired.</p>
            </>
          )}
          {status === "error" && (
            <>
              <XCircle className="mx-auto h-10 w-10 text-destructive" />
              <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
              <p className="text-muted-foreground text-sm">Please try again later.</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
