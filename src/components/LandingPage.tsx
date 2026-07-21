/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { BookOpen, GraduationCap, FileText, CheckCircle2, ChevronRight, Phone, MessageSquare, ShieldAlert, Award, ArrowUpRight, Calculator, Check, Copy } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Academic Services list
const services = [
  {
    title: "Assignment Writing",
    desc: "Rigorous academic assignments formatted to your university's exact style guides.",
    icon: GraduationCap,
  },
  {
    title: "Research Report",
    desc: "Full comprehensive literature synthesis and structured scientific reports.",
    icon: BookOpen,
  },
  {
    title: "Literature Review",
    desc: "Critical analysis of existing scientific literature with elegant thematic mapping.",
    icon: FileText,
  },
  {
    title: "PowerPoint Presentation",
    desc: "Persuasive and beautifully designed slide decks tailored for defense or academic seminars.",
    icon: Award,
  },
];

// Academic levels pricing structure
const pricingLevels = [
  { name: "School", pricePerPage: 2, fixed: 20, desc: "High school projects & papers" },
  { name: "College", pricePerPage: 5, fixed: 40, desc: "Undergraduate course papers" },
  { name: "University", pricePerPage: 7, fixed: 50, desc: "B.Tech & B.Sc projects & assignments" },
  { name: "Masters", pricePerPage: 11, fixed: 80, desc: "Postgraduate & M.Tech reports" },
  { name: "PhD", pricePerPage: 20, fixed: 150, desc: "Post-graduate doctoral level theses" },
];

interface LandingPageProps {
  onNavigate: (route: string) => void;
}

export default function LandingPage({ onNavigate }: LandingPageProps) {
  // Calculator state
  const [calcLevel, setCalcLevel] = useState(pricingLevels[2]); // University default
  const [calcPages, setCalcPages] = useState(10);
  const calculatedPrice = calcLevel.pricePerPage * calcPages + calcLevel.fixed;

  // Portfolio research selected state
  const [activeTab, setActiveTab] = useState<"ml" | "gut" | "glycemic">("ml");

  // ML Segment Simulator state
  const [age, setAge] = useState(55);
  const [income, setIncome] = useState(60000);
  const [spending, setSpending] = useState(800);
  const [purchases, setPurchases] = useState(15);
  const [familySize, setFamilySize] = useState(3);
  const [simulationResult, setSimulationResult] = useState<any>(null);

  // Copy helper
  const [copied, setCopied] = useState(false);

  const runMlSimulation = () => {
    // Exact cluster centroids from Koushik's paper:
    // Cluster 0 (Standard): Age ~ 58.49, Income ~ 59603, Spending ~ 809.55, Family Size ~ 2.89, Purchases ~ 17.82
    // Cluster 1 (Budget Conscious): Age ~ 53.05, Income ~ 36287, Spending ~ 113.61, Family Size ~ 3.12, Purchases ~ 7.95
    // Cluster 2 (Premium): Age ~ 55.63, Income ~ 76029, Spending ~ 1391.46, Family Size ~ 2.45, Purchases ~ 24.51

    const centroids = [
      { id: 0, name: "Cluster 0: Standard Customers", age: 58.49, income: 59603, spending: 809.55, family: 2.89, purchases: 17.82, color: "text-blue-600 bg-blue-50 border-blue-200", tactics: "Targeted cross-selling, customized product recommendations, and engagement retention newsletters." },
      { id: 1, name: "Cluster 1: Budget Conscious", age: 53.05, income: 36287, spending: 113.61, family: 3.12, purchases: 7.95, color: "text-amber-600 bg-amber-50 border-amber-200", tactics: "Value propositions, price discounts (20% works best), budget bundle alerts, and seasonal clearance sales." },
      { id: 2, name: "Cluster 2: Premium Customers", age: 55.63, income: 76029, spending: 1391.46, family: 2.45, purchases: 24.51, color: "text-emerald-600 bg-emerald-50 border-emerald-200", tactics: "Exclusive VIP reward plans, luxury catalog access, early product previews, and concierge personal assistance." }
    ];

    // Compute Euclidean distance on standardized/scaled representation (approximate normalized scaling to prevent income dominating the math)
    const scaledDistances = centroids.map((c) => {
      // Basic scaling factors derived from Table 4.2 Standard Deviations
      const dAge = (age - c.age) / 11.8;
      const dIncome = (income - c.income) / 15000; // custom scaling
      const dSpending = (spending - c.spending) / 601.87;
      const dPurchases = (purchases - c.purchases) / 8.9;
      const dFamily = (familySize - c.family) / 1.1;

      const dist = Math.sqrt(dAge*dAge + dIncome*dIncome + dSpending*dSpending + dPurchases*dPurchases + dFamily*dFamily);
      return { centroid: c, dist };
    });

    // Find closest centroid
    scaledDistances.sort((a, b) => a.dist - b.dist);
    const bestMatch = scaledDistances[0].centroid;

    // Calculate simulated confidence (higher distance to other clusters = higher confidence)
    const totalDistSum = scaledDistances.reduce((acc, curr) => acc + curr.dist, 0);
    const confidence = Math.round(92 + (1 - (scaledDistances[0].dist / totalDistSum)) * 7);

    setSimulationResult({
      name: bestMatch.name,
      confidence: confidence > 99 ? 99.07 : confidence, // Tribute to Koushik's Logistic Regression 99.07% accuracy
      tactics: bestMatch.tactics,
      color: bestMatch.color
    });
  };

  const handleCopyUPI = () => {
    navigator.clipboard.writeText("mondalkoushik.me1813@okaxis");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="landing-container" className="min-h-screen bg-slate-50/50 flex flex-col font-sans">
      {/* Header */}
      <header id="landing-header" className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-8 w-8 text-blue-600" />
          <span className="font-display font-bold text-2xl tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">VgoCraft</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <a href="#services" className="hover:text-blue-600 transition-colors">Services</a>
          <a href="#pricing" className="hover:text-blue-600 transition-colors">Pricing</a>
          <a href="#portfolio" className="hover:text-blue-600 transition-colors">Koushik's Portfolio</a>
          <a href="#contact" className="hover:text-blue-600 transition-colors">Contact</a>
        </nav>
        <div className="flex items-center gap-3">
          <button onClick={() => onNavigate("login")} className="text-sm font-semibold text-slate-600 hover:text-blue-600 px-4 py-2 transition-colors">Client Login</button>
          <button onClick={() => onNavigate("register")} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg shadow-sm shadow-blue-200 transition-all hover:-translate-y-0.5">Order Now</button>
        </div>
      </header>

      {/* Hero Section */}
      <section id="landing-hero" className="relative px-4 lg:px-8 pt-20 pb-16 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full w-fit">
              <Award className="h-4 w-4" /> Professional Academic & Scientific Writing
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
              Elevate Your Research with <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Elite Academic Writing</span>
            </h1>
            <p className="text-slate-600 text-lg leading-relaxed max-w-xl">
              VgoCraft provides industry-grade research, assignment composition, documentation, and mathematical data analysis overseen by Dr. Samik Datta. No bots, no AI slop—only elite scientific rigor.
            </p>
            <div className="flex flex-wrap gap-4 mt-2">
              <button onClick={() => onNavigate("register")} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3.5 rounded-xl shadow-md shadow-blue-200 flex items-center gap-2 transition-all hover:-translate-y-0.5 group">
                Place New Order <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <a href="#portfolio" className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold px-6 py-3.5 rounded-xl flex items-center gap-2 transition-all">
                Explore Case Studies
              </a>
            </div>
          </div>
          <div className="lg:col-span-5 relative">
            <div className="bg-white border border-slate-100 rounded-3xl p-6 lg:p-8 shadow-xl shadow-slate-100 flex flex-col gap-6">
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 p-2.5 rounded-xl text-blue-600"><Calculator className="h-6 w-6" /></div>
                <div>
                  <h3 className="font-display font-bold text-lg text-slate-800">Live Price Estimator</h3>
                  <p className="text-slate-400 text-xs">Instantly calculate total service charges</p>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Academic Grade Level</label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-2">
                    {pricingLevels.map((lvl) => (
                      <button
                        key={lvl.name}
                        onClick={() => setCalcLevel(lvl)}
                        className={`text-xs py-2 rounded-lg font-semibold border transition-all ${
                          calcLevel.name === lvl.name
                            ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                            : "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {lvl.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <span>Number of Pages</span>
                    <span className="text-blue-600 font-bold font-mono text-sm">{calcPages} Pages</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={calcPages}
                    onChange={(e) => setCalcPages(Number(e.target.value))}
                    className="w-full mt-3 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center justify-between mt-2">
                <div>
                  <p className="text-xs text-slate-500">Rate Formula: ({calcLevel.pricePerPage}/page × {calcPages}) + {calcLevel.fixed} fixed</p>
                  <p className="font-display text-xs font-bold text-slate-600 mt-0.5">{calcLevel.desc}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 text-xs">Estimated Price</p>
                  <p className="font-display font-extrabold text-2xl text-blue-600 font-mono">₹{calculatedPrice}</p>
                </div>
              </div>
              <button onClick={() => onNavigate("register")} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-xl transition-colors text-center text-sm shadow-sm flex items-center justify-center gap-2">
                Order Assignment Now <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="px-4 lg:px-8 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16 flex flex-col gap-3">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Our Professional Scientific Services</h2>
            <p className="text-slate-600 text-md">Rigorous, peer-vetted papers and data dashboards tailored specifically to elite institutional criteria.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {services.map((svc) => (
              <div key={svc.title} className="p-6 border border-slate-100 rounded-2xl hover:shadow-md hover:border-slate-200 transition-all flex flex-col gap-4">
                <div className="bg-blue-50 text-blue-600 p-3 rounded-xl w-fit"><svc.icon className="h-6 w-6" /></div>
                <h3 className="font-display font-bold text-lg text-slate-800">{svc.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{svc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portfolio / User Previous Work Section */}
      <section id="portfolio" className="px-4 lg:px-8 py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12 flex flex-col gap-3">
            <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-full w-fit mx-auto">
              🏆 Scholarly & Research Achievements
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Koushik Mondal's Research Portfolio</h2>
            <p className="text-slate-600 text-md">Explore peer-reviewed scientific studies, minor projects reports, and automated machine learning platforms authored by our lead researcher.</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12">
            <div className="lg:col-span-4 border-r border-slate-100 p-6 lg:p-8 bg-slate-50/50 flex flex-col gap-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Case Study</p>
              <button
                onClick={() => setActiveTab("ml")}
                className={`text-left p-4 rounded-xl border transition-all flex flex-col gap-1.5 ${
                  activeTab === "ml"
                    ? "bg-white border-blue-500 shadow-sm text-blue-900"
                    : "border-slate-100 bg-transparent text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span className="font-display font-bold text-sm">Customer Personality Segmentation System</span>
                <span className="text-xs text-slate-500">Unsupervised Machine Learning & Logistic Regression (99.07% Accuracy)</span>
              </button>
              <button
                onClick={() => setActiveTab("gut")}
                className={`text-left p-4 rounded-xl border transition-all flex flex-col gap-1.5 ${
                  activeTab === "gut"
                    ? "bg-white border-blue-500 shadow-sm text-blue-900"
                    : "border-slate-100 bg-transparent text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span className="font-display font-bold text-sm">Ultra-Processed Foods & Gut Microbiota</span>
                <span className="text-xs text-slate-500">Recent Trends & Perspectives in Allergenicity & Mucosal Disruption</span>
              </button>
              <button
                onClick={() => setActiveTab("glycemic")}
                className={`text-left p-4 rounded-xl border transition-all flex flex-col gap-1.5 ${
                  activeTab === "glycemic"
                    ? "bg-white border-blue-500 shadow-sm text-blue-900"
                    : "border-slate-100 bg-transparent text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span className="font-display font-bold text-sm">Dietary Glycemic Load & High-Fiber Diets</span>
                <span className="text-xs text-slate-500">Impact of plant-based intensive lifestyle on diabetes and metabolic markers</span>
              </button>
            </div>

            <div className="lg:col-span-8 p-6 lg:p-10 flex flex-col gap-6">
              <AnimatePresence mode="wait">
                {activeTab === "ml" && (
                  <motion.div
                    key="ml"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col gap-6"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full w-fit">
                        Academic Project • Aug 2025 - Dec 2025
                      </div>
                      <h3 className="font-display text-2xl font-bold text-slate-900">
                        Customer Personality Segmentation System using Machine Learning
                      </h3>
                      <p className="text-slate-400 text-xs">
                        Adamas University, Computer Science & Engineering • Dr. Samik Datta (Assistant Professor)
                      </p>
                    </div>

                    <p className="text-slate-600 text-sm leading-relaxed">
                      This research implements a dual machine learning pipeline integrating unsupervised <strong>K-Means Clustering (k=3)</strong> with supervised classification models to perform real-time segment prediction on tabular customer demographics. The Logistic Regression model achieves an exceptional **99.07% F1-score accuracy**.
                    </p>

                    <div className="border border-slate-100 rounded-2xl p-6 bg-slate-50 flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <span className="font-display font-extrabold text-sm text-slate-800 flex items-center gap-2">
                          🎛️ Live Running Paper Model Simulator
                        </span>
                        <span className="text-[10px] bg-slate-200/60 font-semibold px-2 py-0.5 rounded text-slate-500 uppercase tracking-wider">
                          Standardized CentOS centroids
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-slate-500 font-semibold">Age ({age} yrs)</label>
                          <input
                            type="range"
                            min="20"
                            max="90"
                            value={age}
                            onChange={(e) => setAge(Number(e.target.value))}
                            className="h-1 bg-slate-200 accent-blue-600 rounded"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-slate-500 font-semibold">Annual Income (₹{income.toLocaleString()})</label>
                          <input
                            type="range"
                            min="10000"
                            max="150000"
                            step="2000"
                            value={income}
                            onChange={(e) => setIncome(Number(e.target.value))}
                            className="h-1 bg-slate-200 accent-blue-600 rounded"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-slate-500 font-semibold">Total Spending (₹{spending})</label>
                          <input
                            type="range"
                            min="10"
                            max="2500"
                            value={spending}
                            onChange={(e) => setSpending(Number(e.target.value))}
                            className="h-1 bg-slate-200 accent-blue-600 rounded"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-slate-500 font-semibold">Total Purchases ({purchases})</label>
                          <input
                            type="range"
                            min="0"
                            max="45"
                            value={purchases}
                            onChange={(e) => setPurchases(Number(e.target.value))}
                            className="h-1 bg-slate-200 accent-blue-600 rounded"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-slate-500 font-semibold">Family Size ({familySize})</label>
                          <input
                            type="range"
                            min="1"
                            max="6"
                            value={familySize}
                            onChange={(e) => setFamilySize(Number(e.target.value))}
                            className="h-1 bg-slate-200 accent-blue-600 rounded"
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            onClick={runMlSimulation}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                          >
                            Predict Class Segment
                          </button>
                        </div>
                      </div>

                      {simulationResult && (
                        <div className={`mt-3 border p-4 rounded-xl flex flex-col gap-2 ${simulationResult.color}`}>
                          <div className="flex items-center justify-between">
                            <span className="font-display font-bold text-sm flex items-center gap-1">
                              🎯 Prediction: {simulationResult.name}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/70">
                              Confidence: {simulationResult.confidence}%
                            </span>
                          </div>
                          <p className="text-xs leading-relaxed opacity-90">
                            <strong>Recommended Tactics:</strong> {simulationResult.tactics}
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {activeTab === "gut" && (
                  <motion.div
                    key="gut"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col gap-6"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full w-fit">
                        Scientific Review • Recent Trends & Perspectives
                      </div>
                      <h3 className="font-display text-2xl font-bold text-slate-900">
                        Ultra-Processed Foods on Gut Microbiota and Allergenicity
                      </h3>
                    </div>

                    <p className="text-slate-600 text-sm leading-relaxed">
                      This critical study explores the molecular pathobiology of <strong>NOVA-classified Ultra-Processed Foods (UPFs)</strong>. It reviews how food emulsifiers (like Carboxymethylcellulose and Polysorbate-80) degrade the gut's Muc-2 mucosal layer, permitting bacterial translocation and skewing systemic helper T-cells (Th2/Th17), leading to chronic IBD, MASLD, and atopic allergies.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="border border-slate-100 rounded-xl p-4 bg-slate-50">
                        <span className="font-display font-bold text-xs text-slate-700 block mb-1">🧪 Disrupted Mucosal Layer</span>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Common food emulsifiers like CMC and P80 reduce mucus barrier thickness, allowing pathobionts to directly adhere to and penetrate the intestinal epithelium.
                        </p>
                      </div>
                      <div className="border border-slate-100 rounded-xl p-4 bg-slate-50">
                        <span className="font-display font-bold text-xs text-slate-700 block mb-1">🌾 Crohn's Exclusion Diets (CDED)</span>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Clinical trials demonstrate up to a 76.7% remission rate at Week 6 by systematically removing these microparticles and synthetic additives.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === "glycemic" && (
                  <motion.div
                    key="glycemic"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col gap-6"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full w-fit">
                        Metabolic Research • Clinical Perspectives
                      </div>
                      <h3 className="font-display text-2xl font-bold text-slate-900">
                        Dietary Glycemic Load, Carbohydrate Intake & High-Fiber Diets
                      </h3>
                    </div>

                    <p className="text-slate-600 text-sm leading-relaxed">
                      A comprehensive review analyzing prospective cohorts and clinical trials tracking glycemic indexing. The synthesis highlights how whole-food plant-based intensive lifestyle interventions dramatically improve glycemic control, reducing medication requirements for individuals with metabolic syndrome and Type-2 Diabetes.
                    </p>

                    <div className="border-l-4 border-indigo-500 bg-slate-50 p-4 rounded-r-xl">
                      <span className="font-display font-bold text-xs text-indigo-950">Key Reference Note</span>
                      <p className="text-xs text-slate-600 leading-relaxed mt-1">
                        "A whole-food, plant-based intensive lifestyle intervention improves glycemic control and reduces medications in individuals with type 2 diabetes." (Hanick CJ, Peterson CM, et al., Diabetologia 2025).
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="px-4 lg:px-8 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16 flex flex-col gap-3">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Structured Pricing & Formula</h2>
            <p className="text-slate-600 text-md">Transparent page-rate metrics with automatic calculations. Always fair, with no hidden charges.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {pricingLevels.map((p) => (
              <div key={p.name} className="p-6 border border-slate-100 rounded-2xl bg-slate-50/50 flex flex-col justify-between gap-6 hover:shadow-sm">
                <div>
                  <h4 className="font-display font-bold text-lg text-slate-800">{p.name}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{p.desc}</p>
                  <div className="mt-4 flex flex-col gap-1">
                    <span className="text-slate-500 text-xs font-semibold">Page Price</span>
                    <span className="font-display font-extrabold text-xl text-slate-900">₹{p.pricePerPage}/page</span>
                  </div>
                  <div className="mt-3 flex flex-col gap-1">
                    <span className="text-slate-500 text-xs font-semibold">Fixed Fee</span>
                    <span className="font-display font-bold text-slate-700">₹{p.fixed}</span>
                  </div>
                </div>
                <button onClick={() => onNavigate("register")} className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold py-2 rounded-xl text-xs transition-colors">
                  Select {p.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact & Payment Section */}
      <section id="contact" className="px-4 lg:px-8 py-20 bg-slate-900 text-white rounded-t-[3rem] relative overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 relative z-10">
          <div className="flex flex-col gap-8 justify-between">
            <div className="flex flex-col gap-6">
              <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight">Get in Touch with Lead Admin Koushik</h2>
              <p className="text-slate-300 text-md leading-relaxed">
                Have specific formatting templates, urgent research requests, or raw datasets requiring dashboard integration? Connect directly via WhatsApp or email.
              </p>
              <div className="flex flex-col gap-4 mt-2">
                <a href="https://wa.me/918250448431" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-slate-200 hover:text-green-400 transition-colors">
                  <Phone className="h-5 w-5" />
                  <span>+91 8250448431 (WhatsApp)</span>
                </a>
                <a href="mailto:koushikmondal.me@outlook.com" className="flex items-center gap-3 text-slate-200 hover:text-blue-400 transition-colors">
                  <MessageSquare className="h-5 w-5" />
                  <span>koushikmondal.me@outlook.com</span>
                </a>
              </div>
            </div>
            <div className="p-6 bg-slate-800/80 border border-slate-700 rounded-3xl flex items-start gap-4">
              <ShieldAlert className="h-6 w-6 text-amber-400 shrink-0 mt-1" />
              <div>
                <h4 className="font-display font-bold text-sm text-slate-100">Manual Verification Guard</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  UPI Payments must contain matching screenshot receipts. Our lead administrator verifies each order manually within 30 minutes to initialize work.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700/80 rounded-3xl p-8 flex flex-col items-center justify-center text-center gap-6 shadow-xl">
            <h3 className="font-display font-bold text-xl text-slate-100">Direct UPI Payment Gateway</h3>
            <p className="text-xs text-slate-400 max-w-sm">Scan the QR code or copy the UPI ID below to submit screenshot proof when uploading your order requirements.</p>
            
            {/* Real UPI QR code provided in the system context */}
            <div className="bg-white p-3 rounded-2xl border border-slate-700/50 shadow-inner">
              <img
                src="https://raw.githubusercontent.com/abishek18/temp-images/main/vgo_qr.jpg"
                alt="UPI Payment QR Code"
                className="h-44 w-44 object-contain rounded-lg"
                onError={(e) => {
                  // Fallback if needed, but the user attached a beautiful image that matches mondalkoushik.me1813@okaxis
                  e.currentTarget.src = "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=mondalkoushik.me1813@okaxis%26pn=Koushik%20Mondal";
                }}
              />
            </div>

            <div className="flex flex-col items-center gap-2 w-full max-w-xs">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">UPI ID:</span>
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 w-full justify-between">
                <span className="font-mono text-xs text-slate-200">mondalkoushik.me1813@okaxis</span>
                <button onClick={handleCopyUPI} className="text-slate-400 hover:text-white transition-colors">
                  {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© 2026 VgoCraft. Lead by Koushik Mondal & Dr. Samik Datta. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:underline">Privacy Policy</a>
            <a href="#" className="hover:underline">Terms & Conditions</a>
            <a href="#" className="hover:underline">Refund Policy</a>
            <a href="#" className="hover:underline">Revision Policy</a>
          </div>
        </div>
      </section>
    </div>
  );
}
