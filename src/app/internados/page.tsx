"use client";

import { useState, useEffect, useMemo } from "react";
import { 
    Search, Activity, RefreshCw, Plus, 
    ArrowLeft, Stethoscope, Hospital, Bed, FileText, 
    ClipboardList, User
} from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import PatientModal from "@/components/PatientModal";
import { Patient } from "@/types";
import { getPatientsAction as getPatients } from "../actions";

export default function InternadosPage() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const router = useRouter();

    const fetchData = async () => {
        setLoading(true);
        try {
            const patientsData = await getPatients();
            // Filter only hospitalized patients
            setPatients(patientsData.filter((p: Patient) => p.status === 'INTERNADO'));
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredPatients = useMemo(() => {
        return patients.filter((p) => {
            const searchLower = searchTerm.toLowerCase();
            return searchTerm === "" || 
                String(p.name || "").toLowerCase().includes(searchLower) ||
                String(p.leito || "").toLowerCase().includes(searchLower) ||
                String(p.preceptor || "").toLowerCase().includes(searchLower);
        });
    }, [searchTerm, patients]);

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden relative font-sans">
            {/* Sidebar (Simplified) */}
            <aside className="hidden lg:flex w-64 bg-[#0a1f44] text-white flex-col shrink-0 overflow-y-auto z-50">
                <div className="p-6 border-b border-white/5 bg-[#0a1f44]">
                    <div className="flex flex-col items-center justify-center p-3 w-full relative">
                        <div className="bg-white p-2 rounded-2xl shadow-lg w-24 h-24 mb-4 relative flex-shrink-0">
                            <Image 
                                src="/santa-casa-logo.png"
                                alt="Santa Casa Logo"
                                fill
                                className="object-contain p-1"
                                priority
                            />
                        </div>
                        <h2 className="text-sm font-black text-[#d4af37] tracking-tight text-center uppercase leading-tight">
                            SANTA CASA PORTO ALEGRE - CX ONCO
                        </h2>
                    </div>
                </div>
                
                <nav className="flex-1 px-3 mt-4 space-y-1">
                    <button 
                        onClick={() => router.push('/')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-300 hover:bg-white/5 transition-all"
                    >
                        <ArrowLeft size={18} />
                        Voltar ao Dashboard
                    </button>
                </nav>

                <div className="p-4 mt-auto border-t border-white/5">
                    <div className="px-3 py-3 bg-white/5 rounded-xl">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Internados</p>
                        <p className="text-xl font-black text-white">{patients.length}</p>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="bg-white border-b border-slate-200 flex flex-col shrink-0">
                    <div className="h-16 flex items-center justify-between px-6 lg:px-8">
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => router.push('/')}
                                className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                                title="Voltar ao Dashboard"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                                Pacientes Internados
                            </h1>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="relative hidden sm:block">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                <input 
                                    type="text" 
                                    placeholder="Buscar por nome, leito..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 w-64 transition-all text-black font-semibold"
                                />
                            </div>
                            <button 
                                onClick={() => { setSelectedPatient(null); setIsModalOpen(true); }}
                                className="flex items-center gap-2 bg-[#d4af37] text-[#0a1f44] px-4 py-2 rounded-xl text-sm font-black shadow-lg shadow-[#d4af37]/20 hover:bg-[#c5a059] transition-all active:scale-95"
                            >
                                <Plus size={18} />
                                <span>Novo</span>
                            </button>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-50/50">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center gap-4">
                            <RefreshCw size={32} className="text-blue-600 animate-spin" />
                            <p className="text-sm font-medium text-slate-500 italic">&quot;Estes dados são sincronizados em tempo real&quot;</p>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Carregando pacientes...</p>
                        </div>
                    ) : filteredPatients.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                <Activity size={32} className="text-slate-300" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">Nenhum paciente internado</h3>
                            <p className="text-sm text-slate-500 max-w-xs mt-2">
                                Não há pacientes com status &quot;INTERNADO&quot; no momento ou sua busca não retornou resultados.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6">
                            {filteredPatients.map((p) => (
                                <div 
                                    key={p.id} 
                                    onClick={() => { setSelectedPatient(p); setIsModalOpen(true); }}
                                    className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden group"
                                >
                                    <div className="p-6">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                                                    <User size={24} className="text-blue-600 group-hover:text-white transition-colors" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{p.name || 'Sem nome'}</h3>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                            <Bed size={12} className="text-blue-500" />
                                                            Leito: <span className="text-slate-900">{p.leito || '--'}</span>
                                                        </span>
                                                        <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                            <Hospital size={12} className="text-blue-500" />
                                                            Hospital: <span className="text-slate-900">{p.hospital || '--'}</span>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
                                                <Stethoscope size={16} className="text-indigo-600" />
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest leading-none">Preceptor</span>
                                                    <span className="text-xs font-bold text-indigo-700">{p.preceptor || 'Não atribuído'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <FileText size={14} className="text-blue-600" />
                                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">História Clínica</h4>
                                                </div>
                                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 min-h-[80px]">
                                                    <p className="text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">
                                                        {p.history || 'Nenhuma história registrada.'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <ClipboardList size={14} className="text-emerald-600" />
                                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Plano de Manejo</h4>
                                                </div>
                                                <div className="p-4 bg-emerald-50/30 rounded-xl border border-emerald-100 min-h-[80px]">
                                                    <p className="text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">
                                                        {p.plan || 'Nenhum plano definido.'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                            Atualizado em: {p.lastUpdated ? new Date(p.lastUpdated as string).toLocaleString('pt-BR') : '--'}
                                        </span>
                                        <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors">
                                            Ver Detalhes Completos →
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>

            <PatientModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                patient={selectedPatient}
                onSave={fetchData}
            />
        </div>
    );
}
