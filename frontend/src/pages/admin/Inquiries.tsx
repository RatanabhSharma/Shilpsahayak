import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, updateDoc, doc, Timestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { PageHeader, DataTable, StatusBadge } from "../../components/admin/shared";
import { Mail, X } from "lucide-react";
import { toast } from "react-hot-toast";

function formatInquiryDate(value: unknown): string {
  const date =
    value instanceof Timestamp
      ? value.toDate()
      : value instanceof Date
        ? value
        : typeof value === "string" || typeof value === "number"
          ? new Date(value)
          : null;

  return date && Number.isFinite(date.getTime())
    ? date.toLocaleDateString()
    : "—";
}

export function Inquiries() {
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);

  useEffect(() => {
    const q = query(collection(db, "inquiries"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setInquiries(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!selectedInquiry) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedInquiry(null);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedInquiry]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, "inquiries", id), { status: "read" });
    } catch (error) {
      console.error("Failed to mark inquiry as read:", error);
      toast.error("Could not mark this inquiry as read. Please try again.");
    }
  };

  const columns = [
    {
      header: "Status",
      key: "status",
      render: (item: any) => (
        <StatusBadge
          status={item.status === "unread" ? "New" : "Read"}
        />
      ),
    },
    {
      header: "Date",
      key: "date",
      render: (item: any) => (
        <span className="text-xs text-muted">
          {formatInquiryDate(item.createdAt)}
        </span>
      ),
    },
    {
      header: "Customer",
      key: "customer",
      render: (item: any) => (
        <div>
          <p className="font-bold text-ink">{item.name}</p>
          <p className="text-muted text-[10px]">{item.email}</p>
        </div>
      ),
    },
    {
      header: "Subject",
      key: "subject",
      render: (item: any) => (
        <span className="text-sm font-medium text-ink max-w-[200px] truncate block">
          {item.subject}
        </span>
      ),
    },
    {
      header: "Action",
      key: "action",
      render: (item: any) => (
        <button
          onClick={() => {
            setSelectedInquiry(item);
            if (item.status === "unread") markAsRead(item.id);
          }}
          className="text-xs font-bold text-accent hover:underline"
        >
          View Message
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Inquiries"
        description="View messages submitted via the Contact Us form."
      />

      <div className="bg-white border border-line rounded-2xl shadow-2xs overflow-hidden">
        <DataTable
          columns={columns}
          data={inquiries}
          keyExtractor={(item) => item.id}
          isLoading={loading}
          emptyMessage="No customer inquiries found."
        />
      </div>

      {selectedInquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="inquiry-dialog-title"
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between p-5 border-b border-line">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-accent" />
                <h3 id="inquiry-dialog-title" className="font-display font-bold text-ink text-lg">Inquiry Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInquiry(null)}
                className="p-2 hover:bg-shell rounded-full text-muted transition-colors"
                aria-label="Close inquiry details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted block mb-1">
                    From
                  </label>
                  <p className="text-sm font-medium text-ink">{selectedInquiry.name}</p>
                  <a href={`mailto:${selectedInquiry.email}`} className="text-xs text-accent hover:underline">
                    {selectedInquiry.email}
                  </a>
                </div>
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted block mb-1">
                    Phone
                  </label>
                  <p className="text-sm font-medium text-ink">{selectedInquiry.phone || "Not provided"}</p>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted block mb-1">
                  Subject
                </label>
                <p className="text-sm font-bold text-ink">{selectedInquiry.subject}</p>
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted block mb-1">
                  Message
                </label>
                <div className="p-4 bg-shell rounded-xl text-sm text-ink whitespace-pre-wrap border border-line">
                  {selectedInquiry.message}
                </div>
              </div>
            </div>
            <div className="p-4 bg-shell border-t border-line flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedInquiry(null)}
                className="px-4 py-2 bg-white border border-line rounded-xl text-xs font-bold text-ink hover:border-accent transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
