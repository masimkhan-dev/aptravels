import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Loader2, Mail, MailOpen, Eye, UserPlus } from "lucide-react";
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

interface Inquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  package_interest: string | null;
  is_read: boolean;
  created_at: string;
}

type Filter = "all" | "read" | "unread";

export default function AdminInquiries() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [viewing, setViewing] = useState<Inquiry | null>(null);
  const [converting, setConverting] = useState(false);

  const fetchInquiries = async () => {
    let query = supabase.from("inquiries").select("*").order("created_at", { ascending: false });
    if (filter === "read") query = query.eq("is_read", true);
    if (filter === "unread") query = query.eq("is_read", false);
    const { data } = await query;
    setInquiries(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchInquiries();

    const channel = supabase
      .channel("admin-inquiries-list")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inquiries",
        },
        () => {
          fetchInquiries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filter]);

  const markRead = async (inq: Inquiry) => {
    await supabase.from("inquiries").update({ is_read: true }).eq("id", inq.id);
    setViewing({ ...inq, is_read: true });
    fetchInquiries();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("inquiries").delete().eq("id", id);
    if (viewing?.id === id) setViewing(null);
    fetchInquiries();
  };

  const openView = (inq: Inquiry) => {
    setViewing(inq);
    if (!inq.is_read) markRead(inq);
  };

  const convertToCustomer = async (inq: Inquiry) => {
    setConverting(true);
    const { error } = await supabase.from("customers").insert([{
      full_name: inq.name,
      phone: inq.phone,
      email: inq.email,
    }]);
    if (error) {
      if (error.code === '23505') {
        toast.error("A customer with this phone number may already exist.");
      } else {
        toast.error(error.message || "Failed to create customer.");
      }
    } else {
      toast.success(`Customer profile created for ${inq.name}.`);
      if (!inq.is_read) markRead(inq);
    }
    setConverting(false);
  };

  const filters: { label: string; value: Filter }[] = [
    { label: "All", value: "all" },
    { label: "Unread", value: "unread" },
    { label: "Read", value: "read" },
  ];

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === f.value
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-muted-foreground text-sm">{inquiries.length} results</span>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* List */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="divide-y divide-border max-h-[70vh] overflow-y-auto">
            {inquiries.length === 0 && (
              <p className="text-center text-muted-foreground py-12 text-sm">No inquiries found.</p>
            )}
            {inquiries.map((inq) => (
              <div
                key={inq.id}
                onClick={() => openView(inq)}
                className={`group cursor-pointer w-full text-left p-4 hover:bg-muted/50 transition-colors ${viewing?.id === inq.id ? "bg-muted/50" : ""
                  } ${!inq.is_read ? "border-l-4 border-l-gold" : ""}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium ${!inq.is_read ? "text-card-foreground" : "text-muted-foreground"}`}>
                    {inq.name}
                  </span>
                  <div className="flex items-center gap-2">
                    {!inq.is_read ? (
                      <Mail className="w-3.5 h-3.5 text-gold" />
                    ) : (
                      <MailOpen className="w-3.5 h-3.5 text-muted-foreground/50" />
                    )}

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 rounded hover:bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Inquiry?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the inquiry from {inq.name}.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(inq.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">{inq.message}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  {new Date(inq.created_at).toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div className="bg-card rounded-xl border border-border p-6">
          {viewing ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-display text-lg font-bold text-card-foreground">{viewing.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full inline-block mt-1 ${viewing.is_read ? "bg-muted text-muted-foreground" : "bg-gold/10 text-gold"}`}>
                    {viewing.is_read ? "Read" : "Unread"}
                  </span>
                </div>
                <button
                  onClick={() => convertToCustomer(viewing)}
                  disabled={converting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-600 text-xs font-bold hover:bg-green-500/20 transition-all disabled:opacity-50 border border-green-500/20 shrink-0"
                >
                  {converting ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                  Convert to Customer
                </button>
              </div>
              <div className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Email:</span> <a href={`mailto:${viewing.email}`} className="text-primary hover:underline">{viewing.email}</a></p>
                <p><span className="text-muted-foreground">Phone:</span> <a href={`tel:${viewing.phone}`} className="text-primary hover:underline">{viewing.phone}</a></p>
                {viewing.package_interest && (
                  <p><span className="text-muted-foreground">Package Interest:</span> <span className="text-card-foreground">{viewing.package_interest}</span></p>
                )}
                <p><span className="text-muted-foreground">Date:</span> <span className="text-card-foreground">{new Date(viewing.created_at).toLocaleString()}</span></p>
              </div>
              <div className="pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground mb-1">Message</p>
                <p className="text-sm text-card-foreground whitespace-pre-wrap">{viewing.message}</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <Eye className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">Select an inquiry to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
