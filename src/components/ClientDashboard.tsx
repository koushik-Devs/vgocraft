/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, FormEvent, ChangeEvent } from "react";
import {
  LayoutDashboard,
  PlusCircle,
  FileText,
  LifeBuoy,
  Bell,
  User,
  LogOut,
  TrendingUp,
  FileUp,
  ArrowUpRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Download,
  Copy,
  Check,
  Send,
  UserCheck,
  ArrowLeft,
  GraduationCap
} from "lucide-react";

interface ClientDashboardProps {
  token: string;
  user: any;
  onLogout: () => void;
}

export default function ClientDashboard({ token, user, onLogout }: ClientDashboardProps) {
  const [activeTab, setActiveTab] = useState<"stats" | "new-order" | "orders" | "support" | "notifications" | "profile">("stats");

  // Loaded states
  const [orders, setOrders] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ activeOrders: 0, completedOrders: 0, totalSpent: 0, ticketsCount: 0 });
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Feedback states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Profile fields
  const [profileName, setProfileName] = useState(user.name);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // New Order fields
  const [serviceType, setServiceType] = useState("Assignment Writing");
  const [academicLevel, setAcademicLevel] = useState("University");
  const [pages, setPages] = useState(5);
  const [deadline, setDeadline] = useState("");
  const [details, setDetails] = useState("");
  const [requirements, setRequirements] = useState("");
  const [assignmentFiles, setAssignmentFiles] = useState<string[]>([]);
  const [upiTransactionId, setUpiTransactionId] = useState("");
  const [paymentScreenshot, setPaymentScreenshot] = useState("");
  const [uploading, setUploading] = useState(false);

  // Active Selected Order
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [revisionComment, setRevisionComment] = useState("");

  // Active Selected Support Ticket
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [ticketReply, setTicketReply] = useState("");

  // UPI copied state
  const [copied, setCopied] = useState(false);

  // Fetch client resources
  const fetchDashboardData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [ordersRes, ticketsRes, notifRes, statsRes] = await Promise.all([
        fetch("/api/orders", { headers }),
        fetch("/api/tickets", { headers }),
        fetch("/api/notifications", { headers }),
        fetch("/api/stats", { headers }),
      ]);

      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (ticketsRes.ok) setTickets(await ticketsRes.json());
      if (notifRes.ok) setNotifications(await notifRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (e) {
      console.error("Error loading dashboard data:", e);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Auto mark notifications read
    if (activeTab === "notifications") {
      fetch("/api/notifications/read", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  }, [activeTab]);

  // Handle uploading files and converting to base64
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isScreenshot = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      alert("File size exceeds the maximum 100MB limit.");
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Content = reader.result as string;
      try {
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            fileName: file.name,
            mimeType: file.type,
            fileContent: base64Content,
          }),
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.message || "Upload failed");

        if (isScreenshot) {
          setPaymentScreenshot(uploadData.secureUrl);
        } else {
          setAssignmentFiles((prev) => [...prev, uploadData.secureUrl]);
        }
      } catch (err: any) {
        alert(err.message || "Upload failed");
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Pricing calculations helper
  const getPricingInfo = () => {
    let perPage = 2;
    let fixed = 20;
    switch (academicLevel) {
      case "School": perPage = 2; fixed = 20; break;
      case "College": perPage = 5; fixed = 40; break;
      case "University": perPage = 7; fixed = 50; break;
      case "Masters": perPage = 11; fixed = 80; break;
      case "PhD": perPage = 20; fixed = 150; break;
    }
    return { perPage, fixed, total: perPage * pages + fixed };
  };

  const pricing = getPricingInfo();

  // Create Order Submission
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentScreenshot) {
      return setError("You MUST upload your UPI payment screenshot to create an order.");
    }
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          serviceType,
          academicLevel,
          pages,
          deadline,
          details,
          requirements,
          assignmentFiles,
          upiTransactionId,
          paymentScreenshot,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Order submission failed");

      setSuccess(`Order successfully submitted with invoice ID ${data.invoiceId}!`);
      // Reset fields
      setDetails("");
      setRequirements("");
      setAssignmentFiles([]);
      setUpiTransactionId("");
      setPaymentScreenshot("");
      fetchDashboardData();
      setTimeout(() => {
        setActiveTab("orders");
        setSuccess(null);
      }, 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Submit Support Ticket
  const handleOpenTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject || !ticketMessage) return setError("Subject and description are required");
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subject: ticketSubject, message: ticketMessage }),
      });

      if (!res.ok) throw new Error("Could not open support ticket");

      setSuccess("Support ticket opened! Admin will review and reply within 1 hour.");
      setTicketSubject("");
      setTicketMessage("");
      fetchDashboardData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Submit Reply to existing Support Ticket
  const handleTicketReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketReply) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: ticketReply }),
      });

      if (!res.ok) throw new Error("Reply submission failed");

      setTicketReply("");
      // Refresh active ticket view
      const updatedTicketRes = await fetch(`/api/tickets`, { headers: { Authorization: `Bearer ${token}` } });
      if (updatedTicketRes.ok) {
        const all = await updatedTicketRes.json();
        const active = all.find((t: any) => t.id === selectedTicket.id);
        if (active) setSelectedTicket(active);
      }
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Submit revision instructions
  const handleSubmitRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionComment) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}/revision`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ comment: revisionComment }),
      });

      if (!res.ok) throw new Error("Revision request failed");

      setSuccess("Revision instructions dispatched to Admin!");
      setRevisionComment("");
      // Refresh selection
      const updatedOrdRes = await fetch(`/api/orders/${selectedOrder.id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (updatedOrdRes.ok) setSelectedOrder(await updatedOrdRes.json());
      
      fetchDashboardData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Save profile updates
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: profileName,
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update profile");

      setSuccess("Your account details and password have been updated!");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="dashboard-wrapper" className="min-h-screen bg-slate-50/50 flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shrink-0">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <GraduationCap className="h-7 w-7 text-blue-500" />
          <span className="font-display font-bold text-xl tracking-tight text-white">VgoCraft</span>
        </div>
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center gap-3">
          <div className="bg-blue-600 h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm text-white">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-white truncate">{user.name}</span>
            <span className="text-[10px] text-slate-400 capitalize">Client Workspace</span>
          </div>
        </div>
        <nav className="flex-1 p-4 flex flex-col gap-1 text-sm font-medium">
          <button
            onClick={() => { setActiveTab("stats"); setSelectedOrder(null); setSelectedTicket(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "stats" ? "bg-blue-600 text-white shadow-sm" : "hover:bg-slate-800 hover:text-white"}`}
          >
            <LayoutDashboard className="h-4 w-4" /> Stats & Dashboard
          </button>
          <button
            onClick={() => { setActiveTab("new-order"); setSelectedOrder(null); setSelectedTicket(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "new-order" ? "bg-blue-600 text-white shadow-sm" : "hover:bg-slate-800 hover:text-white"}`}
          >
            <PlusCircle className="h-4 w-4" /> Place New Order
          </button>
          <button
            onClick={() => { setActiveTab("orders"); setSelectedOrder(null); setSelectedTicket(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "orders" ? "bg-blue-600 text-white shadow-sm" : "hover:bg-slate-800 hover:text-white"}`}
          >
            <FileText className="h-4 w-4" /> Track Active Orders
          </button>
          <button
            onClick={() => { setActiveTab("support"); setSelectedOrder(null); setSelectedTicket(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "support" ? "bg-blue-600 text-white shadow-sm" : "hover:bg-slate-800 hover:text-white"}`}
          >
            <LifeBuoy className="h-4 w-4" /> Support Tickets
          </button>
          <button
            onClick={() => { setActiveTab("notifications"); setSelectedOrder(null); setSelectedTicket(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "notifications" ? "bg-blue-600 text-white shadow-sm" : "hover:bg-slate-800 hover:text-white"} justify-between`}
          >
            <span className="flex items-center gap-3"><Bell className="h-4 w-4" /> Notifications</span>
            {notifications.filter((n) => !n.read).length > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{notifications.filter((n) => !n.read).length}</span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab("profile"); setSelectedOrder(null); setSelectedTicket(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "profile" ? "bg-blue-600 text-white shadow-sm" : "hover:bg-slate-800 hover:text-white"}`}
          >
            <User className="h-4 w-4" /> Account Settings
          </button>
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors text-sm font-medium">
            <LogOut className="h-4 w-4" /> Logout Account
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50/50 p-6 lg:p-10">
        
        {/* Error/Success Feedbacks */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-4 rounded-xl flex items-start gap-2 mb-6">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs p-4 rounded-xl flex items-start gap-2 mb-6">
            <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* STATS VIEW */}
        {activeTab === "stats" && (
          <div className="flex flex-col gap-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="font-display font-extrabold text-3xl tracking-tight text-slate-900">Welcome back, {user.name}</h1>
                <p className="text-slate-500 text-sm">Here is a summary of your active academic reports & assignments.</p>
              </div>
            </div>

            {/* Bento statistics grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm flex flex-col gap-2">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Active Work</span>
                <p className="font-display font-extrabold text-3xl text-blue-600">{stats.activeOrders}</p>
                <p className="text-[10px] text-slate-500">Currently being drafted by writers</p>
              </div>
              <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm flex flex-col gap-2">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Completed Reports</span>
                <p className="font-display font-extrabold text-3xl text-emerald-600">{stats.completedOrders}</p>
                <p className="text-[10px] text-slate-500">Ready for secure download</p>
              </div>
              <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm flex flex-col gap-2">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Approved Revenue</span>
                <p className="font-display font-extrabold text-3xl text-slate-900 font-mono">₹{stats.totalSpent}</p>
                <p className="text-[10px] text-slate-500">Total verified UPI payments</p>
              </div>
              <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm flex flex-col gap-2">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Open Tickets</span>
                <p className="font-display font-extrabold text-3xl text-indigo-600">{stats.ticketsCount}</p>
                <p className="text-[10px] text-slate-500">Support assistance tickets</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Recent Orders Card list */}
              <div className="lg:col-span-8 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
                <h3 className="font-display font-bold text-lg text-slate-800">Your Current Assignments</h3>
                {orders.length === 0 ? (
                  <div className="text-center py-12 flex flex-col items-center gap-3">
                    <FileText className="h-10 w-10 text-slate-300" />
                    <p className="text-slate-500 text-sm">You haven't placed any orders yet.</p>
                    <button onClick={() => setActiveTab("new-order")} className="bg-blue-600 text-white font-semibold text-xs px-4 py-2 rounded-lg mt-2">Place Your First Order</button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {orders.slice(0, 5).map((o) => (
                      <div
                        key={o.id}
                        onClick={() => { setSelectedOrder(o); setActiveTab("orders"); }}
                        className="p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-4 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl shrink-0"><FileText className="h-5 w-5" /></div>
                          <div className="min-w-0 flex flex-col">
                            <span className="font-display font-bold text-sm text-slate-800 truncate">{o.serviceType} ({o.id})</span>
                            <span className="text-xs text-slate-500 font-mono mt-0.5">{o.pages} pages • Deadline: {o.deadline}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                            o.status === "completed" ? "bg-emerald-50 text-emerald-700" :
                            o.status === "revision_requested" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
                          }`}>
                            {o.status.replace("_", " ")}
                          </span>
                          <ArrowUpRight className="h-4 w-4 text-slate-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* UPI Quick payment info card */}
              <div className="lg:col-span-4 bg-slate-900 text-white rounded-3xl p-6 flex flex-col gap-6">
                <h3 className="font-display font-bold text-lg text-slate-100">Direct UPI Scanner</h3>
                <p className="text-xs text-slate-400">Save this QR code to complete payments on your mobile UPI applications.</p>
                <div className="bg-white p-3 rounded-2xl w-fit mx-auto border border-slate-850">
                  <img
                    src="https://raw.githubusercontent.com/abishek18/temp-images/main/vgo_qr.jpg"
                    alt="UPI Scanner"
                    className="h-32 w-34 object-contain rounded"
                    onError={(e) => {
                      e.currentTarget.src = "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=mondalkoushik.me1813@okaxis%26pn=Koushik%20Mondal";
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1 w-full text-center">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest">UPI ID</span>
                  <div className="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
                    <span className="font-mono text-xs text-slate-300">mondalkoushik.me1813@okaxis</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText("mondalkoushik.me1813@okaxis");
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="text-slate-400 hover:text-white"
                    >
                      {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MAKE NEW ORDER VIEW */}
        {activeTab === "new-order" && (
          <div className="flex flex-col gap-8 max-w-4xl">
            <div>
              <h1 className="font-display font-extrabold text-3xl tracking-tight text-slate-900">Place New Writing Order</h1>
              <p className="text-slate-500 text-sm">Fill in assignment parameters and upload UPI payment receipts to register details.</p>
            </div>

            <form onSubmit={handleSubmitOrder} className="bg-white border border-slate-100 rounded-3xl p-6 lg:p-8 shadow-sm flex flex-col gap-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Service Category</label>
                  <select
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option>Assignment Writing</option>
                    <option>Research Report</option>
                    <option>Literature Review</option>
                    <option>Report Writing</option>
                    <option>PowerPoint Presentation</option>
                    <option>Documentation</option>
                    <option>Data Analysis</option>
                    <option>Excel Dashboard</option>
                    <option>Power BI Dashboard</option>
                    <option>Dashboard Development</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Academic Level</label>
                  <select
                    value={academicLevel}
                    onChange={(e) => setAcademicLevel(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option>School</option>
                    <option>College</option>
                    <option>University</option>
                    <option>Masters</option>
                    <option>PhD</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Number of Pages Needed</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    required
                    value={pages}
                    onChange={(e) => setPages(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Submission Deadline</label>
                  <input
                    type="date"
                    required
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Topic & Scope Details</label>
                <textarea
                  rows={4}
                  required
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Enter the full instructions, word count criteria, citation styles (APA, MLA, etc.) and primary guidelines..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Additional Requirements (Optional)</label>
                <input
                  type="text"
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  placeholder="e.g. Include Excel dataset, double spacing, 1.5 margins"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Assignment Files upload */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Assignment reference files (PDF, DOCX, XLSX)</label>
                <div className="border-2 border-dashed border-slate-200 hover:border-slate-350 rounded-2xl p-6 text-center cursor-pointer relative bg-slate-50/50">
                  <input
                    type="file"
                    onChange={(e) => handleFileUpload(e, false)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="flex flex-col items-center gap-2">
                    <FileUp className="h-8 w-8 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-600">Drag & drop or click to upload assignment resources</span>
                    <span className="text-[10px] text-slate-400">PDF, DOC, PPT, XLS, ZIP up to 100MB</span>
                  </div>
                </div>
                {assignmentFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {assignmentFiles.map((f, idx) => (
                      <span key={idx} className="bg-slate-100 text-slate-600 text-xs px-2.5 py-1 rounded-full border border-slate-200 max-w-xs truncate">
                        File Resource #{idx + 1}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* MANDATORY PAYMENT RECEIPT */}
              <div className="border border-slate-100 rounded-2xl p-6 bg-slate-50 flex flex-col gap-6">
                <h4 className="font-display font-bold text-sm text-slate-800">Direct UPI QR Code Payment</h4>
                <div className="flex flex-col sm:flex-row gap-6 items-center">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm shrink-0">
                    <img
                      src="https://raw.githubusercontent.com/abishek18/temp-images/main/vgo_qr.jpg"
                      alt="UPI QR Scanner"
                      className="h-28 w-28 object-contain rounded"
                      onError={(e) => {
                        e.currentTarget.src = "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=mondalkoushik.me1813@okaxis%26pn=Koushik%20Mondal";
                      }}
                    />
                  </div>
                  <div className="flex-1 flex flex-col gap-3">
                    <p className="text-xs text-slate-500 leading-relaxed">
                      1. Scan the QR code or copy the ID: <strong>mondalkoushik.me1813@okaxis</strong><br />
                      2. Send the exact price total: <strong className="text-blue-600">₹{pricing.total}</strong> ({pricing.perPage}/page × {pages} + ₹{pricing.fixed} fee)<br />
                      3. Upload the payment receipt screenshot below (Mandatory).
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs bg-white px-3 py-1.5 rounded-lg border border-slate-200">mondalkoushik.me1813@okaxis</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText("mondalkoushik.me1813@okaxis");
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="text-slate-500 hover:text-slate-800"
                      >
                        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">UPI Transaction ID / Ref #</label>
                    <input
                      type="text"
                      placeholder="e.g. 625023991204"
                      value={upiTransactionId}
                      onChange={(e) => setUpiTransactionId(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Upload Payment Screenshot *</label>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        required
                        onChange={(e) => handleFileUpload(e, true)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <button type="button" className="w-full bg-white border border-slate-200 hover:border-slate-350 text-slate-700 font-semibold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2">
                        <FileUp className="h-4 w-4" /> {paymentScreenshot ? "Screenshot Loaded! (Click to replace)" : "Choose Receipt Image"}
                      </button>
                    </div>
                    {paymentScreenshot && (
                      <span className="text-[10px] text-green-600 font-semibold flex items-center gap-1 mt-1">
                        <CheckCircle className="h-3 w-3" /> Proof of payment uploaded successfully.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Order total info display */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total Price Calculator</span>
                  <p className="text-xs text-slate-300">Grade Level: {academicLevel} • Pages: {pages}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400">Total Charge</span>
                  <p className="font-display font-extrabold text-2xl text-blue-400 font-mono">₹{pricing.total}</p>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || uploading || !paymentScreenshot}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition-all shadow-md shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? "Registering Assignment Details..." : "Submit Order Details to Verification"}
              </button>
            </form>
          </div>
        )}

        {/* TRACK ACTIVE ORDERS VIEW */}
        {activeTab === "orders" && (
          <div className="flex flex-col gap-8">
            <div>
              <h1 className="font-display font-extrabold text-3xl tracking-tight text-slate-900">Track Academic Assignments</h1>
              <p className="text-slate-500 text-sm">Download completed manuscripts, view invoices, or request revision corrections.</p>
            </div>

            {!selectedOrder ? (
              <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                      <th className="p-4">Order ID</th>
                      <th className="p-4">Service Category</th>
                      <th className="p-4">Pages / Grade</th>
                      <th className="p-4">Total Fee</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Invoicing</th>
                      <th className="p-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-medium text-slate-700">
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-slate-500">No active assignment metrics available.</td>
                      </tr>
                    ) : (
                      orders.map((o) => (
                        <tr key={o.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 font-bold text-slate-900 font-mono">{o.id}</td>
                          <td className="p-4">{o.serviceType}</td>
                          <td className="p-4">{o.pages} pages / {o.academicLevel}</td>
                          <td className="p-4 font-mono">₹{o.totalAmount}</td>
                          <td className="p-4">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              o.status === "completed" ? "bg-emerald-50 text-emerald-700" :
                              o.status === "revision_requested" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
                            }`}>
                              {o.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="p-4 font-mono text-xs text-slate-500">{o.invoiceId}</td>
                          <td className="p-4">
                            <button
                              onClick={() => setSelectedOrder(o)}
                              className="text-blue-600 hover:text-blue-800 text-xs font-semibold"
                            >
                              Manage Details
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-8 flex flex-col gap-6">
                  {/* Order detail card */}
                  <div className="bg-white border border-slate-100 rounded-3xl p-6 lg:p-8 shadow-sm flex flex-col gap-6">
                    <div className="flex justify-between items-start gap-4">
                      <button
                        onClick={() => setSelectedOrder(null)}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                      >
                        <ArrowLeft className="h-4 w-4" /> Back to List
                      </button>
                      <span className="font-mono text-xs text-slate-400">Invoice: {selectedOrder.invoiceId}</span>
                    </div>

                    <div className="flex flex-col gap-2">
                      <h2 className="font-display font-extrabold text-2xl text-slate-900">{selectedOrder.serviceType} ({selectedOrder.id})</h2>
                      <p className="text-slate-500 text-sm">Academic Grade Level: {selectedOrder.academicLevel} • Pages: {selectedOrder.pages}</p>
                    </div>

                    {/* Progression flow bar */}
                    <div className="flex flex-col gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Order Progression Flow</span>
                      <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold text-slate-400">
                        <div className={`p-2 rounded-lg ${selectedOrder.status === "pending" ? "bg-amber-100 text-amber-800" : "bg-white border border-slate-200"}`}>
                          1. Pending Verification
                        </div>
                        <div className={`p-2 rounded-lg ${["payment_verified", "work_started"].includes(selectedOrder.status) ? "bg-blue-100 text-blue-800" : "bg-white border border-slate-200"}`}>
                          2. Work In Progress
                        </div>
                        <div className={`p-2 rounded-lg ${selectedOrder.status === "quality_check" ? "bg-indigo-100 text-indigo-800" : "bg-white border border-slate-200"}`}>
                          3. Quality Check
                        </div>
                        <div className={`p-2 rounded-lg ${selectedOrder.status === "completed" ? "bg-emerald-100 text-emerald-800" : "bg-white border border-slate-200"}`}>
                          4. Completed
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <h4 className="font-display font-bold text-sm text-slate-800">Topic Details & Prompt Scope</h4>
                      <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line bg-slate-50/50 p-4 rounded-xl border border-slate-100">{selectedOrder.details}</p>
                    </div>

                    {selectedOrder.requirements && (
                      <div className="flex flex-col gap-1.5">
                        <h4 className="font-display font-bold text-sm text-slate-800">Formatted Requirements</h4>
                        <p className="text-slate-600 text-xs font-semibold bg-slate-50/50 p-3 rounded-lg border border-slate-100">{selectedOrder.requirements}</p>
                      </div>
                    )}

                    {/* COMPLETED FILES DOWNLOAD CONTAINER */}
                    {selectedOrder.status === "completed" && (
                      <div className="border border-emerald-200 rounded-2xl p-6 bg-emerald-50/50 flex flex-col gap-4">
                        <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                          <CheckCircle className="h-5 w-5 text-emerald-600" />
                          <span>Final Draft Files are Ready!</span>
                        </div>
                        <p className="text-xs text-emerald-700 leading-relaxed">
                          Your assignment has been fully drafted, cited, formatted, and verified by our academic committee. You can download the documents below:
                        </p>
                        <div className="flex flex-wrap gap-3">
                          {selectedOrder.completedFiles.length === 0 ? (
                            <span className="text-xs text-slate-500 font-semibold italic">Awaiting completed document attachment.</span>
                          ) : (
                            selectedOrder.completedFiles.map((f: string, idx: number) => (
                              <a
                                key={idx}
                                href={f}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-2 transition-transform hover:-translate-y-0.5"
                              >
                                <Download className="h-4 w-4 text-emerald-600" />
                                <span>Download Manuscript Draft #{idx + 1}</span>
                              </a>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* REVISION REQUEST PORTAL */}
                    {selectedOrder.status === "completed" && (
                      <form onSubmit={handleSubmitRevision} className="border border-red-100 rounded-2xl p-6 bg-red-50/50 flex flex-col gap-4">
                        <div className="flex items-center gap-2 text-red-800 font-bold text-sm">
                          <AlertCircle className="h-5 w-5 text-red-600" />
                          <span>Need Revisions? Submit Corrections Instructions</span>
                        </div>
                        <p className="text-xs text-red-700 leading-relaxed">
                          We provide free unlimited structural formatting revisions within 7 days of manuscript completions. Specify changes below:
                        </p>
                        <textarea
                          rows={3}
                          required
                          value={revisionComment}
                          onChange={(e) => setRevisionComment(e.target.value)}
                          placeholder="e.g. Please format section 3 literature mapping with APA citations..."
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-red-500"
                        />
                        <button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs py-2.5 rounded-xl px-5 w-fit">
                          Dispatch Revision Instructions
                        </button>
                      </form>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-4 flex flex-col gap-6">
                  {/* Costing Invoice detail bento */}
                  <div className="bg-slate-900 text-white rounded-3xl p-6 flex flex-col gap-6 shadow-md">
                    <h4 className="font-display font-bold text-sm text-slate-100">Order Invoice Summary</h4>
                    <div className="flex flex-col gap-3 text-xs text-slate-400">
                      <div className="flex justify-between">
                        <span>Academic Level:</span>
                        <span className="font-semibold text-white">{selectedOrder.academicLevel}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Page Volume:</span>
                        <span className="font-semibold text-white">{selectedOrder.pages} pages</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Base Rate:</span>
                        <span className="font-semibold text-white">₹{selectedOrder.pricePerPage}/page</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Fixed Charge:</span>
                        <span className="font-semibold text-white">₹{selectedOrder.fixedCharge}</span>
                      </div>
                      <hr className="border-slate-800" />
                      <div className="flex justify-between text-sm text-slate-100 font-bold">
                        <span>Total Paid via UPI:</span>
                        <span className="text-blue-400 font-mono">₹{selectedOrder.totalAmount}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Payment Status</span>
                      <span className={`text-xs font-bold py-1.5 rounded-xl text-center capitalize border ${
                        selectedOrder.paymentStatus === "approved" ? "bg-emerald-950/60 border-emerald-800 text-emerald-400" :
                        selectedOrder.paymentStatus === "pending_verification" ? "bg-amber-950/60 border-amber-800 text-amber-400" : "bg-red-950/60 border-red-800 text-red-400"
                      }`}>
                        {selectedOrder.paymentStatus.replace("_", " ")}
                      </span>
                    </div>

                    {selectedOrder.paymentScreenshot && (
                      <div className="flex flex-col gap-2.5">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Receipt Proof Uploaded</span>
                        <a href={selectedOrder.paymentScreenshot} target="_blank" rel="noopener noreferrer" className="block relative border border-slate-700 rounded-xl overflow-hidden group">
                          <img src={selectedOrder.paymentScreenshot} alt="Payment Receipt" className="h-32 w-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-xs text-white font-semibold">View Screenshot Full</span>
                          </div>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SUPPORT TICKETS VIEW */}
        {activeTab === "support" && (
          <div className="flex flex-col gap-8">
            <div>
              <h1 className="font-display font-extrabold text-3xl tracking-tight text-slate-900">Academic Support Portal</h1>
              <p className="text-slate-500 text-sm">Directly chat with our Lead Writer regarding formatting templates and guidelines.</p>
            </div>

            {!selectedTicket ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Create Ticket */}
                <div className="lg:col-span-5 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col gap-5">
                  <h3 className="font-display font-bold text-lg text-slate-800">Submit Support Ticket</h3>
                  <form onSubmit={handleOpenTicket} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase">Subject Topic</label>
                      <input
                        type="text"
                        required
                        value={ticketSubject}
                        onChange={(e) => setTicketSubject(e.target.value)}
                        placeholder="e.g. Formatting citation styles"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase">Detailed Message</label>
                      <textarea
                        rows={4}
                        required
                        value={ticketMessage}
                        onChange={(e) => setTicketMessage(e.target.value)}
                        placeholder="Explain your instructions or questions for our administrator..."
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl text-xs transition-colors">
                      Open New Ticket
                    </button>
                  </form>
                </div>

                {/* Tickets list */}
                <div className="lg:col-span-7 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
                  <h3 className="font-display font-bold text-lg text-slate-800">Support Ticket Histories</h3>
                  {tickets.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 text-sm italic">No active support ticket logs.</div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {tickets.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTicket(t)}
                          className="p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors"
                        >
                          <div>
                            <span className="font-display font-bold text-sm text-slate-800 block">{t.subject}</span>
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5">Ticket: {t.id} • Replies: {t.replies.length}</span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            t.status === "open" ? "bg-red-50 text-red-700" :
                            t.status === "replied" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-700"
                          }`}>
                            {t.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-100 rounded-3xl p-6 lg:p-8 shadow-sm flex flex-col gap-6 max-w-4xl">
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 w-fit"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to Tickets
                </button>

                <div>
                  <h2 className="font-display font-bold text-xl text-slate-800">{selectedTicket.subject}</h2>
                  <span className="text-xs text-slate-400 font-mono mt-0.5">Ticket ID: {selectedTicket.id}</span>
                </div>

                <div className="flex flex-col gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700">{selectedTicket.clientName} (You)</span>
                    <span className="text-slate-400 font-mono">{new Date(selectedTicket.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed">{selectedTicket.message}</p>
                </div>

                {/* Ticket Reply histories */}
                {selectedTicket.replies.length > 0 && (
                  <div className="flex flex-col gap-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Replies History</span>
                    <div className="flex flex-col gap-3">
                      {selectedTicket.replies.map((rep: any, idx: number) => (
                        <div
                          key={idx}
                          className={`p-4 rounded-2xl border flex flex-col gap-2 ${
                            rep.sender === "admin"
                              ? "bg-blue-50/40 border-blue-100 ml-6"
                              : "bg-slate-50 border-slate-100 mr-6"
                          }`}
                        >
                          <div className="flex justify-between items-center text-xs">
                            <span className={`font-bold ${rep.sender === "admin" ? "text-blue-900" : "text-slate-700"}`}>
                              {rep.sender === "admin" ? "VgoCraft Support (Koushik)" : "You"}
                            </span>
                            <span className="text-slate-400 font-mono text-[10px]">
                              {new Date(rep.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-slate-600 text-xs leading-relaxed">{rep.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reply Form */}
                <form onSubmit={handleTicketReply} className="flex gap-3 border-t border-slate-100 pt-4 mt-2">
                  <input
                    type="text"
                    required
                    value={ticketReply}
                    onChange={(e) => setTicketReply(e.target.value)}
                    placeholder="Write your response message..."
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                  />
                  <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 flex items-center justify-center">
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* NOTIFICATIONS VIEW */}
        {activeTab === "notifications" && (
          <div className="flex flex-col gap-8 max-w-3xl">
            <div>
              <h1 className="font-display font-extrabold text-3xl tracking-tight text-slate-900">Your Notifications</h1>
              <p className="text-slate-500 text-sm">Stay updated on verified payments, assignment progressions, and support replies.</p>
            </div>

            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col gap-3">
              {notifications.length === 0 ? (
                <div className="text-center py-12 text-slate-400 italic text-sm">No new notifications.</div>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className="p-4 border border-slate-50 rounded-2xl bg-slate-50/50 flex items-start gap-3">
                    <div className="bg-blue-50 text-blue-600 p-2 rounded-xl shrink-0"><Bell className="h-4 w-4" /></div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">{n.title}</span>
                      <p className="text-xs text-slate-600 mt-0.5 leading-normal">{n.message}</p>
                      <span className="text-[10px] text-slate-400 font-mono mt-1.5 block">{new Date(n.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ACCOUNT PROFILE SETTINGS */}
        {activeTab === "profile" && (
          <div className="flex flex-col gap-8 max-w-xl">
            <div>
              <h1 className="font-display font-extrabold text-3xl tracking-tight text-slate-900">Client Account Settings</h1>
              <p className="text-slate-500 text-sm">Change your portal name, update credential security, and review logs.</p>
            </div>

            <form onSubmit={handleSaveProfile} className="bg-white border border-slate-100 rounded-3xl p-6 lg:p-8 shadow-sm flex flex-col gap-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Registered Email</label>
                <input
                  type="email"
                  disabled
                  value={user.email}
                  className="w-full px-4 py-3 bg-slate-100 border border-slate-100 rounded-xl text-sm font-semibold text-slate-500 cursor-not-allowed"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Portal Name</label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <hr className="border-slate-100" />

              <div className="flex flex-col gap-4">
                <span className="text-xs font-bold text-slate-500 uppercase">Change Secure Password</span>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-500">Current Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-500">New Secure Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl text-xs transition-colors">
                Save Profile Changes
              </button>
            </form>
          </div>
        )}

      </main>
    </div>
  );
}
