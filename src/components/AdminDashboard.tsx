/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, FormEvent, ChangeEvent } from "react";
import {
  Shield,
  FileCheck,
  CreditCard,
  Calendar as CalendarIcon,
  MessageSquare,
  Users,
  Eye,
  LogOut,
  TrendingUp,
  FileUp,
  CheckCircle,
  AlertTriangle,
  FolderPlus,
  Activity,
  UserCheck,
  Send,
  Download,
  Search,
  Plus,
  ArrowLeft
} from "lucide-react";

interface AdminDashboardProps {
  token: string;
  user: any;
  onLogout: () => void;
}

export default function AdminDashboard({ token, user, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<"orders" | "payments" | "support" | "calendar" | "portfolio" | "audit" | "profile">("orders");

  // Server loaded arrays
  const [orders, setOrders] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  
  // Feedback states
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Selected Metrics for modals or full detail views
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [adminReply, setAdminReply] = useState("");

  // Search filter
  const [searchTerm, setSearchTerm] = useState("");

  // Portfolio items state
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [pTitle, setPTitle] = useState("");
  const [pCategory, setPCategory] = useState("Machine Learning");
  const [pDesc, setPDesc] = useState("");
  const [pTags, setPTags] = useState("");
  const [pUrl, setPUrl] = useState("");
  const [pSummary, setPSummary] = useState("");

  // Completed files uploading helper
  const [completedFiles, setCompletedFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Fetch all admin tables
  const fetchAdminData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [ordersRes, ticketsRes, logsRes, statsRes, portRes] = await Promise.all([
        fetch("/api/admin/orders", { headers }),
        fetch("/api/tickets", { headers }),
        fetch("/api/admin/audit-logs", { headers }),
        fetch("/api/stats", { headers }),
        fetch("/api/portfolio"),
      ]);

      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (ticketsRes.ok) setTickets(await ticketsRes.json());
      if (logsRes.ok) setAuditLogs(await logsRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
      if (portRes.ok) setPortfolio(await portRes.json());
    } catch (e) {
      console.error("Admin Fetch Error:", e);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [activeTab]);

  // Handle uploading files and converting to base64 for finalized drafts
  const handleCompletedFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

        setCompletedFiles((prev) => [...prev, uploadData.secureUrl]);
      } catch (err: any) {
        alert(err.message || "Upload failed");
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Process manual payment approval or rejection
  const handleVerifyPayment = async (orderId: string, approve: boolean) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    const paymentStatus = approve ? "approved" : "rejected";
    const status = approve ? "work_started" : "pending";

    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ paymentStatus, status }),
      });

      if (!res.ok) throw new Error("Failed to process payment update");

      setSuccess(`Payment for order ${orderId} has been successfully ${paymentStatus}!`);
      // Update local view selection
      if (selectedOrder) {
        setSelectedOrder({ ...selectedOrder, paymentStatus, status });
      }
      fetchAdminData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update order status/completion
  const handleUpdateOrderStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/orders/${selectedOrder.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: selectedOrder.status,
          completedFiles: completedFiles.length > 0 ? completedFiles : selectedOrder.completedFiles,
        }),
      });

      if (!res.ok) throw new Error("Could not update order settings");

      setSuccess(`Order status updated successfully!`);
      // Refresh detailed view
      const detailRes = await fetch(`/api/orders/${selectedOrder.id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (detailRes.ok) setSelectedOrder(await detailRes.json());
      setCompletedFiles([]);
      fetchAdminData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Reply to support ticket
  const handleAdminTicketReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminReply || !selectedTicket) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: adminReply }),
      });

      if (!res.ok) throw new Error("Failed to post admin reply");

      setAdminReply("");
      // Refresh current selection
      const updatedTickets = await fetch(`/api/tickets`, { headers: { Authorization: `Bearer ${token}` } });
      if (updatedTickets.ok) {
        const all = await updatedTickets.json();
        const active = all.find((t: any) => t.id === selectedTicket.id);
        if (active) setSelectedTicket(active);
      }
      fetchAdminData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Create custom Portfolio Entry
  const handleAddPortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pTitle || !pCategory || !pDesc) return;
    setLoading(true);

    try {
      const res = await fetch("/api/admin/portfolio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: pTitle,
          category: pCategory,
          description: pDesc,
          tags: pTags.split(",").map((t) => t.trim()),
          demoUrl: pUrl,
          documentSummary: pSummary,
        }),
      });

      if (!res.ok) throw new Error("Portfolio registration failed");

      setSuccess("New Research Project / Achievement registered successfully!");
      setPTitle("");
      setPDesc("");
      setPTags("");
      setPUrl("");
      setPSummary("");
      fetchAdminData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete Portfolio item
  const handleDeletePortfolio = async (id: string) => {
    if (!confirm("Are you sure you want to delete this research project?")) return;
    try {
      const res = await fetch(`/api/admin/portfolio/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSuccess("Portfolio item deleted successfully");
        fetchAdminData();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Search filter matching
  const filteredOrders = orders.filter((o) => {
    const text = (o.id + o.clientName + o.clientEmail + o.serviceType).toLowerCase();
    return text.includes(searchTerm.toLowerCase());
  });

  return (
    <div id="admin-dashboard-container" className="min-h-screen bg-slate-50/50 flex flex-col md:flex-row font-sans">
      {/* Sidebar navigation */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shrink-0">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <Shield className="h-7 w-7 text-indigo-500" />
          <span className="font-display font-bold text-xl tracking-tight text-white">VgoCraft Admin</span>
        </div>
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center gap-3">
          <div className="bg-indigo-600 h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm text-white">
            K
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-white truncate">Koushik Mondal</span>
            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Lead Administrator</span>
          </div>
        </div>
        <nav className="flex-1 p-4 flex flex-col gap-1 text-sm font-medium">
          <button
            onClick={() => { setActiveTab("orders"); setSelectedOrder(null); setSelectedTicket(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "orders" ? "bg-indigo-600 text-white shadow-sm" : "hover:bg-slate-800 hover:text-white"}`}
          >
            <FileCheck className="h-4 w-4" /> Manage Assignments
          </button>
          <button
            onClick={() => { setActiveTab("payments"); setSelectedOrder(null); setSelectedTicket(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "payments" ? "bg-indigo-600 text-white shadow-sm" : "hover:bg-slate-800 hover:text-white"}`}
          >
            <CreditCard className="h-4 w-4" /> Verify UPI Receipts
          </button>
          <button
            onClick={() => { setActiveTab("support"); setSelectedOrder(null); setSelectedTicket(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "support" ? "bg-indigo-600 text-white shadow-sm" : "hover:bg-slate-800 hover:text-white"}`}
          >
            <MessageSquare className="h-4 w-4" /> Client Tickets
          </button>
          <button
            onClick={() => { setActiveTab("calendar"); setSelectedOrder(null); setSelectedTicket(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "calendar" ? "bg-indigo-600 text-white shadow-sm" : "hover:bg-slate-800 hover:text-white"}`}
          >
            <CalendarIcon className="h-4 w-4" /> Deadlines Calendar
          </button>
          <button
            onClick={() => { setActiveTab("portfolio"); setSelectedOrder(null); setSelectedTicket(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "portfolio" ? "bg-indigo-600 text-white shadow-sm" : "hover:bg-slate-800 hover:text-white"}`}
          >
            <FolderPlus className="h-4 w-4" /> Achievements Builder
          </button>
          <button
            onClick={() => { setActiveTab("audit"); setSelectedOrder(null); setSelectedTicket(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "audit" ? "bg-indigo-600 text-white shadow-sm" : "hover:bg-slate-800 hover:text-white"}`}
          >
            <Activity className="h-4 w-4" /> Security Audit Logs
          </button>
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors text-sm font-medium">
            <LogOut className="h-4 w-4" /> Logout Workspace
          </button>
        </div>
      </aside>

      {/* Main workspace panels */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50/50 p-6 lg:p-10">
        
        {/* Global Feedback notification alerts */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-4 rounded-xl flex items-start gap-2 mb-6">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs p-4 rounded-xl flex items-start gap-2 mb-6">
            <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* ADMIN ORDERS MANAGEMENT TAB */}
        {activeTab === "orders" && (
          <div className="flex flex-col gap-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div>
                <h1 className="font-display font-extrabold text-3xl tracking-tight text-slate-900">Academic Project Desk</h1>
                <p className="text-slate-500 text-sm">Review incoming assignments, compile draft papers, and manage deliverables.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search client or order ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-white border border-slate-100 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
                  />
                  <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>
            </div>

            {/* Admin Stats Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm flex flex-col gap-1.5">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Revenue Paid</span>
                <p className="font-display font-extrabold text-2xl text-indigo-600 font-mono">₹{stats.totalRevenue || 0}</p>
              </div>
              <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm flex flex-col gap-1.5">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Awaiting Verification</span>
                <p className="font-display font-extrabold text-2xl text-amber-500">{stats.pendingPaymentsCount || 0}</p>
              </div>
              <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm flex flex-col gap-1.5">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Active Writers Drafting</span>
                <p className="font-display font-extrabold text-2xl text-slate-900">{stats.activeAssignmentsCount || 0}</p>
              </div>
              <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm flex flex-col gap-1.5">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Revision Requests</span>
                <p className="font-display font-extrabold text-2xl text-red-500">{stats.revisionRequestsCount || 0}</p>
              </div>
            </div>

            {!selectedOrder ? (
              <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                      <th className="p-4">Order ID</th>
                      <th className="p-4">Client Contact</th>
                      <th className="p-4">Service Type</th>
                      <th className="p-4">Pages / Grade</th>
                      <th className="p-4">Submission Deadline</th>
                      <th className="p-4">Order Status</th>
                      <th className="p-4">Payment</th>
                      <th className="p-4">Total Amount</th>
                      <th className="p-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-medium text-slate-700">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-12 text-slate-500">No matching assignments registered.</td>
                      </tr>
                    ) : (
                      filteredOrders.map((o) => (
                        <tr key={o.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 font-bold font-mono text-slate-900">{o.id}</td>
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-800">{o.clientName}</span>
                              <span className="text-[10px] text-slate-400 font-mono mt-0.5">{o.clientEmail}</span>
                            </div>
                          </td>
                          <td className="p-4">{o.serviceType}</td>
                          <td className="p-4">{o.pages} pages / {o.academicLevel}</td>
                          <td className="p-4 font-mono text-xs text-slate-500">{o.deadline}</td>
                          <td className="p-4">
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                              o.status === "completed" ? "bg-emerald-50 text-emerald-700" :
                              o.status === "revision_requested" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
                            }`}>
                              {o.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                              o.paymentStatus === "approved" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                            }`}>
                              {o.paymentStatus.replace("_", " ")}
                            </span>
                          </td>
                          <td className="p-4 font-mono font-bold text-slate-900">₹{o.totalAmount}</td>
                          <td className="p-4">
                            <button
                              onClick={() => setSelectedOrder(o)}
                              className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold"
                            >
                              Edit/Verify
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
                  {/* Detailed workspace card */}
                  <div className="bg-white border border-slate-100 rounded-3xl p-6 lg:p-8 shadow-sm flex flex-col gap-6">
                    <button
                      onClick={() => setSelectedOrder(null)}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 w-fit"
                    >
                      <ArrowLeft className="h-4 w-4" /> Back to Project Desk
                    </button>

                    <div className="flex flex-col gap-1.5">
                      <h2 className="font-display font-bold text-2xl text-slate-900">{selectedOrder.serviceType}</h2>
                      <p className="text-slate-500 text-sm">Client: <strong>{selectedOrder.clientName}</strong> ({selectedOrder.clientEmail})</p>
                    </div>

                    <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50 text-xs flex flex-col gap-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                          <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[10px]">Academic Level</span>
                          <span className="text-slate-800 font-bold mt-1 block">{selectedOrder.academicLevel}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[10px]">Page Volume</span>
                          <span className="text-slate-800 font-bold mt-1 block">{selectedOrder.pages} pages</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[10px]">Total Amount</span>
                          <span className="text-slate-800 font-bold mt-1 block font-mono">₹{selectedOrder.totalAmount}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[10px]">Deadline Date</span>
                          <span className="text-slate-800 font-bold mt-1 block font-mono">{selectedOrder.deadline}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <h4 className="font-display font-bold text-sm text-slate-800">Topic Scope Details</h4>
                      <p className="text-slate-600 text-sm bg-slate-50/50 p-4 border border-slate-100 rounded-xl leading-relaxed whitespace-pre-line">{selectedOrder.details}</p>
                    </div>

                    {/* Resources attached */}
                    <div className="flex flex-col gap-3">
                      <h4 className="font-display font-bold text-sm text-slate-800">Uploaded Assignment Reference Materials</h4>
                      {selectedOrder.assignmentFiles.length === 0 ? (
                        <span className="text-xs text-slate-400 italic">No reference documents attached by client.</span>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {selectedOrder.assignmentFiles.map((f: string, idx: number) => (
                            <a
                              key={idx}
                              href={f}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-slate-100 text-slate-700 text-xs font-semibold px-3.5 py-2 border border-slate-200 rounded-xl flex items-center gap-1.5"
                            >
                              <Download className="h-3.5 w-3.5 text-indigo-600" /> Reference File #{idx + 1}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* UPDATE ORDER PROGRESS FORM */}
                    {selectedOrder.paymentStatus === "approved" && (
                      <form onSubmit={handleUpdateOrderStatus} className="border-t border-slate-100 pt-6 flex flex-col gap-5">
                        <h4 className="font-display font-bold text-md text-slate-800">Update Order Progress & Draft Submissions</h4>
                        
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-slate-500 uppercase">Change Active Status</label>
                          <select
                            value={selectedOrder.status}
                            onChange={(e) => setSelectedOrder({ ...selectedOrder, status: e.target.value })}
                            className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                          >
                            <option value="work_started">Work Started (Drafting)</option>
                            <option value="quality_check">Quality Check (Internal Review)</option>
                            <option value="completed">Completed (Submit Final Document)</option>
                          </select>
                        </div>

                        {selectedOrder.status === "completed" && (
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase">Attach Finished Manuscript File *</label>
                            <div className="border border-slate-100 p-4 rounded-xl bg-slate-50/50 flex flex-col gap-3">
                              <input
                                type="file"
                                onChange={handleCompletedFileUpload}
                                className="text-xs"
                              />
                              {uploading && <span className="text-xs text-indigo-600">Uploading file to Cloudinary...</span>}
                              {completedFiles.length > 0 && (
                                <div className="text-xs text-green-600 font-bold flex items-center gap-1">
                                  <CheckCircle className="h-4 w-4" /> Ready to submit completed file.
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-3 rounded-xl w-fit px-6">
                          Save Progress Configuration
                        </button>
                      </form>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-4 flex flex-col gap-6">
                  {/* Manual UPI validation card */}
                  <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col gap-5">
                    <h3 className="font-display font-bold text-md text-slate-800">Receipt Verification Card</h3>
                    
                    {selectedOrder.paymentScreenshot ? (
                      <div className="flex flex-col gap-3">
                        <a href={selectedOrder.paymentScreenshot} target="_blank" rel="noopener noreferrer" className="block border border-slate-200 rounded-xl overflow-hidden group">
                          <img src={selectedOrder.paymentScreenshot} alt="Uploaded Receipt" className="h-44 w-full object-cover group-hover:scale-102 transition-transform" />
                        </a>
                        <div className="flex justify-between items-center text-xs text-slate-400">
                          <span>UPI Transaction Id:</span>
                          <span className="font-semibold text-slate-700 font-mono">{selectedOrder.upiTransactionId || "N/A"}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-slate-400 text-xs italic">No payment screenshot uploaded.</div>
                    )}

                    {selectedOrder.paymentStatus === "pending_verification" && (
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => handleVerifyPayment(selectedOrder.id, true)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2.5 rounded-xl"
                        >
                          Approve Payment
                        </button>
                        <button
                          onClick={() => handleVerifyPayment(selectedOrder.id, false)}
                          className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs py-2.5 rounded-xl"
                        >
                          Reject Receipt
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VERIFY UPI RECEIPTS TAB */}
        {activeTab === "payments" && (
          <div className="flex flex-col gap-8">
            <div>
              <h1 className="font-display font-extrabold text-3xl tracking-tight text-slate-900">Verify UPI Payment Receipts</h1>
              <p className="text-slate-500 text-sm">Review uploaded transaction screenshots and matching transaction reference IDs.</p>
            </div>

            <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    <th className="p-4">Order</th>
                    <th className="p-4">Client</th>
                    <th className="p-4">UPI Txn ID</th>
                    <th className="p-4">Total Amount</th>
                    <th className="p-4">Screenshot</th>
                    <th className="p-4">Verification Status</th>
                    <th className="p-4">Action</th>
                  </tr>
                </thead>
                <tbody className="text-sm font-medium text-slate-700">
                  {orders.filter((o) => o.paymentStatus === "pending_verification").length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-500">No payment verifications pending approval.</td>
                    </tr>
                  ) : (
                    orders.filter((o) => o.paymentStatus === "pending_verification").map((o) => (
                      <tr key={o.id} className="border-b border-slate-100">
                        <td className="p-4 font-mono font-bold">{o.id}</td>
                        <td className="p-4">{o.clientName}</td>
                        <td className="p-4 font-mono text-xs text-slate-500">{o.upiTransactionId || "N/A"}</td>
                        <td className="p-4 font-mono font-bold">₹{o.totalAmount}</td>
                        <td className="p-4">
                          <a href={o.paymentScreenshot} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 font-semibold hover:underline">
                            View Screenshot
                          </a>
                        </td>
                        <td className="p-4">
                          <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Pending Approval</span>
                        </td>
                        <td className="p-4 flex gap-2">
                          <button
                            onClick={() => handleVerifyPayment(o.id, true)}
                            className="bg-emerald-600 text-white font-semibold text-xs px-3 py-1 rounded-lg"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleVerifyPayment(o.id, false)}
                            className="bg-red-600 text-white font-semibold text-xs px-3 py-1 rounded-lg"
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CLIENT SUPPORT TICKETS TAB */}
        {activeTab === "support" && (
          <div className="flex flex-col gap-8">
            <div>
              <h1 className="font-display font-extrabold text-3xl tracking-tight text-slate-900">Manage Client Tickets</h1>
              <p className="text-slate-500 text-sm">Review, synthesize, and answer customer support inquiries.</p>
            </div>

            {!selectedTicket ? (
              <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                      <th className="p-4">Ticket ID</th>
                      <th className="p-4">Client</th>
                      <th className="p-4">Subject Line</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Replies Count</th>
                      <th className="p-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-medium text-slate-700">
                    {tickets.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-slate-500">No support tickets registered.</td>
                      </tr>
                    ) : (
                      tickets.map((t) => (
                        <tr key={t.id} className="border-b border-slate-100">
                          <td className="p-4 font-mono font-bold">{t.id}</td>
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span>{t.clientName}</span>
                              <span className="text-[10px] text-slate-400 font-mono mt-0.5">{t.clientEmail}</span>
                            </div>
                          </td>
                          <td className="p-4">{t.subject}</td>
                          <td className="p-4">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              t.status === "open" ? "bg-red-50 text-red-700" :
                              t.status === "replied" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-700"
                            }`}>
                              {t.status}
                            </span>
                          </td>
                          <td className="p-4 text-center">{t.replies.length}</td>
                          <td className="p-4">
                            <button
                              onClick={() => setSelectedTicket(t)}
                              className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold"
                            >
                              Open & Reply
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-white border border-slate-100 rounded-3xl p-6 lg:p-8 shadow-sm flex flex-col gap-6 max-w-4xl">
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 w-fit"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to Tickets List
                </button>

                <div>
                  <h2 className="font-display font-bold text-xl text-slate-800">{selectedTicket.subject}</h2>
                  <p className="text-xs text-slate-400">Client: <strong>{selectedTicket.clientName}</strong> ({selectedTicket.clientEmail})</p>
                </div>

                <div className="flex flex-col gap-4 bg-slate-50 p-4 border border-slate-100 rounded-xl text-sm">
                  <p className="text-slate-600 leading-relaxed">{selectedTicket.message}</p>
                </div>

                {selectedTicket.replies.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ticket Thread</span>
                    <div className="flex flex-col gap-3">
                      {selectedTicket.replies.map((rep: any, idx: number) => (
                        <div key={idx} className={`p-4 rounded-xl border ${rep.sender === "admin" ? "bg-indigo-50/40 border-indigo-100 ml-6" : "bg-slate-50 border-slate-100 mr-6"}`}>
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-700">{rep.sender === "admin" ? "You (Admin)" : "Client"}</span>
                            <span className="text-slate-400 text-[10px] font-mono">{new Date(rep.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-slate-600 text-xs leading-relaxed mt-2">{rep.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <form onSubmit={handleAdminTicketReply} className="flex gap-3 border-t border-slate-100 pt-4">
                  <input
                    type="text"
                    required
                    value={adminReply}
                    onChange={(e) => setAdminReply(e.target.value)}
                    placeholder="Type support reply message..."
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  />
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 flex items-center justify-center">
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* DEADLINES CALENDAR TAB */}
        {activeTab === "calendar" && (
          <div className="flex flex-col gap-8">
            <div>
              <h1 className="font-display font-extrabold text-3xl tracking-tight text-slate-900">Upcoming Deadlines Calendar</h1>
              <p className="text-slate-500 text-sm">Review, synthesize, and filter your academic schedule.</p>
            </div>

            <div className="bg-white border border-slate-100 rounded-3xl p-6 lg:p-8 shadow-sm flex flex-col gap-6">
              <div className="flex gap-6 text-xs font-semibold">
                <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 bg-amber-500 rounded" /> Yellow: Pending Verification</span>
                <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 bg-blue-500 rounded" /> Blue: In Progress</span>
                <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 bg-emerald-500 rounded" /> Green: Completed</span>
                <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 bg-red-600 rounded" /> Red: Urgent (Within 48 Hours)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {orders.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No scheduled assignment deadlines recorded.</p>
                ) : (
                  orders.map((o) => {
                    const daysLeft = Math.round((new Date(o.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    const isUrgent = daysLeft >= 0 && daysLeft <= 2;
                    let colorClass = "border-amber-200 bg-amber-50/30 text-amber-900";
                    let dotClass = "bg-amber-500";

                    if (o.status === "completed") {
                      colorClass = "border-emerald-200 bg-emerald-50/30 text-emerald-900";
                      dotClass = "bg-emerald-500";
                    } else if (isUrgent) {
                      colorClass = "border-red-200 bg-red-50/30 text-red-950 animate-pulse";
                      dotClass = "bg-red-600";
                    } else if (["work_started", "quality_check"].includes(o.status)) {
                      colorClass = "border-blue-200 bg-blue-50/30 text-blue-900";
                      dotClass = "bg-blue-500";
                    }

                    return (
                      <div key={o.id} className={`p-5 rounded-2xl border ${colorClass} flex flex-col gap-3 justify-between shadow-sm`}>
                        <div className="flex justify-between items-start gap-3">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Deadline Schedule</span>
                            <span className="font-mono text-sm font-bold block mt-0.5">{o.deadline}</span>
                          </div>
                          <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
                        </div>

                        <div className="flex flex-col">
                          <span className="font-display font-bold text-sm block truncate">{o.serviceType} ({o.id})</span>
                          <span className="text-xs opacity-75 mt-0.5">Client: {o.clientName}</span>
                        </div>

                        <div className="flex justify-between items-center mt-2 border-t border-slate-100 pt-2 opacity-90 text-[10px] font-bold">
                          <span>Pages: {o.pages} pages</span>
                          <span>{daysLeft >= 0 ? `${daysLeft} Days Remaining` : "Deadline Expired"}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ACHIEVEMENTS BUILDER PORTFOLIO */}
        {activeTab === "portfolio" && (
          <div className="flex flex-col gap-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Add item */}
              <div className="lg:col-span-5 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col gap-5">
                <h3 className="font-display font-bold text-lg text-slate-800">Add Academic Achievement</h3>
                <form onSubmit={handleAddPortfolio} className="flex flex-col gap-4 text-xs font-semibold">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-slate-500 uppercase tracking-wider text-[10px]">Title</label>
                    <input
                      type="text"
                      required
                      value={pTitle}
                      onChange={(e) => setPTitle(e.target.value)}
                      placeholder="e.g. Customer Personality Segmentation System"
                      className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-slate-500 uppercase tracking-wider text-[10px]">Category</label>
                    <select
                      value={pCategory}
                      onChange={(e) => setPCategory(e.target.value)}
                      className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs"
                    >
                      <option>Machine Learning</option>
                      <option>Clinical Synthesis</option>
                      <option>Metabolic Study</option>
                      <option>Dashboard Integration</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-slate-500 uppercase tracking-wider text-[10px]">Short Description</label>
                    <textarea
                      rows={3}
                      required
                      value={pDesc}
                      onChange={(e) => setPDesc(e.target.value)}
                      placeholder="Enter brief description of findings and academic rigor..."
                      className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-slate-500 uppercase tracking-wider text-[10px]">Tags (Comma separated)</label>
                    <input
                      type="text"
                      value={pTags}
                      onChange={(e) => setPTags(e.target.value)}
                      placeholder="K-Means, Tabular data, Python"
                      className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-slate-500 uppercase tracking-wider text-[10px]">Reference Link / URL</label>
                    <input
                      type="text"
                      value={pUrl}
                      onChange={(e) => setPUrl(e.target.value)}
                      placeholder="Github or Paper Index URL"
                      className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-slate-500 uppercase tracking-wider text-[10px]">Document Abstract/Summary</label>
                    <textarea
                      rows={3}
                      value={pSummary}
                      onChange={(e) => setPSummary(e.target.value)}
                      placeholder="Synthesis of paper findings..."
                      className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none"
                    />
                  </div>
                  <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl">
                    Publish Achievement
                  </button>
                </form>
              </div>

              {/* Published list */}
              <div className="lg:col-span-7 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
                <h3 className="font-display font-bold text-lg text-slate-800">Your Achievements Portfolio</h3>
                <div className="flex flex-col gap-3">
                  {portfolio.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">No custom registered items. Showing static portfolio on homepage.</span>
                  ) : (
                    portfolio.map((item) => (
                      <div key={item.id} className="p-4 border border-slate-50 rounded-2xl bg-slate-50/50 flex items-center justify-between gap-4">
                        <div>
                          <span className="font-display font-bold text-sm text-slate-800 block">{item.title}</span>
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5">{item.category}</span>
                        </div>
                        <button
                          onClick={() => handleDeletePortfolio(item.id)}
                          className="text-red-600 hover:text-red-800 text-xs font-semibold"
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECURITY AUDIT LOGS TAB */}
        {activeTab === "audit" && (
          <div className="flex flex-col gap-8">
            <div>
              <h1 className="font-display font-extrabold text-3xl tracking-tight text-slate-900">Security Audit Logs</h1>
              <p className="text-slate-500 text-sm">Review real-time activity and access events logged across the VgoCraft platform.</p>
            </div>

            <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    <th className="p-4">Time Logged</th>
                    <th className="p-4">User</th>
                    <th className="p-4">Action Event</th>
                    <th className="p-4">Detailed Description</th>
                    <th className="p-4">IP Address</th>
                  </tr>
                </thead>
                <tbody className="text-xs font-mono font-medium text-slate-700">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-slate-500 italic">No access events logged yet.</td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50/30">
                        <td className="p-4 text-slate-400">{new Date(log.createdAt).toLocaleString()}</td>
                        <td className="p-4 font-bold text-slate-900">{log.userName}</td>
                        <td className="p-4">
                          <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[9px]">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-4 text-slate-600">{log.details}</td>
                        <td className="p-4 text-slate-400">{log.ip}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
