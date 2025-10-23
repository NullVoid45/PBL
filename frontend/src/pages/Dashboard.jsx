import { useEffect, useRef, useState } from "react";
import api from "@/utils/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download } from "lucide-react";

const wsUrlFromHttp = (httpUrl) => {
  if (!httpUrl) return "";
  const u = new URL(httpUrl);
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  u.pathname = "/api/ws";
  return u.toString();
};

export default function Dashboard() {
  const [form, setForm] = useState({ reason:"", dateOut:"", returnTime:"" });
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const token = localStorage.getItem("token");
  const wsRef = useRef(null);

  const fetchItems = async () => {
    try {
      const { data } = await api.get("/outpass/myrequests");
      setItems(data);
    } catch (e) {
      // ignore
    }
  };

  useEffect(()=>{ fetchItems(); }, []);

  useEffect(()=>{
    if (!token) return;
    const url = wsUrlFromHttp(process.env.REACT_APP_BACKEND_URL);
    if (!url) return;
    const ws = new WebSocket(`${url}?token=${token}`);
    wsRef.current = ws;
    ws.onopen = () => { /* connected */ };
    ws.onmessage = (ev) => {
      try { const msg = JSON.parse(ev.data); if (msg?.type === 'refresh') fetchItems(); } catch {}
    };
    ws.onclose = () => { wsRef.current = null; };
    return () => { try { ws.close(); } catch {} };
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/outpass/create", form);
      setForm({ reason:"", dateOut:"", returnTime:"" });
      toast.success("Request submitted");
      await fetchItems();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to submit");
    } finally { setLoading(false); }
  };

  const badge = (status) => {
    const map = { PENDING: "bg-orange-100 text-orange-700 border-orange-300", APPROVED: "bg-green-100 text-green-700 border-green-300", REJECTED: "bg-red-100 text-red-700 border-red-300" };
    return <Badge data-testid={`status-badge-${status.toLowerCase()}`} className={`border ${map[status]||''}`}>{status}</Badge>;
  };

  return (
    <div className="bg-[#E8F5E9] min-h-[calc(100vh-64px)]">
      <div className="mx-auto max-w-6xl px-4 py-8 grid gap-6 md:grid-cols-2">
        <Card className="border-[#A5D6A7]" data-testid="outpass-form-card">
          <CardHeader><CardTitle className="text-[#2E7D32]">Request Out Pass</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4" data-testid="outpass-form">
              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea id="reason" data-testid="reason-input" value={form.reason} onChange={(e)=>setForm({...form, reason:e.target.value})} required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateOut">Date & Time Out</Label>
                  <Input id="dateOut" data-testid="dateout-input" type="datetime-local" value={form.dateOut} onChange={(e)=>setForm({...form, dateOut:e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="returnTime">Expected Return Time</Label>
                  <Input id="returnTime" data-testid="returntime-input" type="datetime-local" value={form.returnTime} onChange={(e)=>setForm({...form, returnTime:e.target.value})} required />
                </div>
              </div>
              <Button data-testid="submit-outpass-button" disabled={loading} type="submit" className="rounded-full bg-[#2E7D32] hover:bg-[#1B5E20] px-6 py-3 text-base">{loading?"Submitting...":"Submit Request"}</Button>
            </form>
          </CardContent>
        </Card>
        <div className="space-y-4">
          {items.map((it)=> (
            <Card key={it.id} className="border-[#A5D6A7]" data-testid={`request-card-${it.id}`}>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-[#1B1B1B]">{it.reason}</CardTitle>
                {badge(it.status)}
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <div data-testid="request-datetime">Out: <span className="font-medium">{it.dateOut}</span> · Return: <span className="font-medium">{it.returnTime}</span></div>
                {it.status === 'APPROVED' && it.qrCodeDataUrl ? (
                  <div className="mt-2">
                    <img data-testid="qr-image" src={it.qrCodeDataUrl} alt="QR Code" className="h-40 w-40 rounded-md border border-[#A5D6A7] bg-white p-2" />
                    <a data-testid="qr-download-button" href={it.qrCodeDataUrl} download={`outpass-${it.id}.png`} className="inline-flex items-center mt-2 text-[#2E7D32] hover:underline"><Download size={16} className="mr-1"/>Download QR</a>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
          {items.length === 0 && (
            <Card className="border-[#A5D6A7]">
              <CardContent className="py-6 text-gray-600" data-testid="empty-state">No requests yet. Submit your first out pass.</CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
