"use client";

import { useState, useEffect, useMemo, DragEvent } from "react";
import Image from "next/image";
import { 
    Search, 
    Plus, 
    LayoutGrid, 
    ArrowUpDown, 
    ArrowUp,
    ArrowDown, 
    FileText, 
    Settings, 
    Users, 
    ChevronDown, 
    User, 
    X, 
    Menu, 
    RefreshCw, 
    LayoutList, 
    Check, 
    Activity 
} from "lucide-react";
import PatientModal from "@/components/PatientModal";
import ReportModal from "@/components/ReportModal";
import ProfileModal from "@/components/ProfileModal";
import { Patient, PatientStatus, FieldSchema, MedicalStaff } from "../types";
import { getPatientsAction as getPatients, updatePatientAction } from "./actions";
import { getStaffAction } from "./staff-actions";
import { getSchemaAction } from "./config-actions";

type SortConfig = {
    key: keyof Patient | 'none';
    direction: 'asc' | 'desc';
};

export default function Dashboard() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [viewMode, setViewMode] = useState<"lista" | "kanban">("lista");
    const [selectedPreceptors, setSelectedPreceptors] = useState<string[]>([]);
    const [selectedHospitals, setSelectedHospitals] = useState<string[]>([]);
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'none', direction: 'asc' });
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [userName, setUserName] = useState("");
    const [userFullName, setUserFullName] = useState("");
    const [userRole, setUserRole] = useState("");
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [schema, setSchema] = useState<FieldSchema[]>([]);
    const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
    const [visibleColumnIds, setVisibleColumnIds] = useState<Set<string>>(new Set([
        'name', 'hospital', 'leito', 'preceptor', 'convenio', 'history'
    ]));
    const [columnOrder, setColumnOrder] = useState<string[]>([]);
    const [staff, setStaff] = useState<MedicalStaff[]>([]);
    const [isArchiveSearchOpen, setIsArchiveSearchOpen] = useState(false);
    const [archiveSearchTerm, setArchiveSearchTerm] = useState('');

    const [config, setConfig] = useState<{ teams: string[], systems: string[], hospitals: string[] }>({ teams: ['Geral', 'Oncologia'], systems: ['SUS', 'Convênio'], hospitals: ['BC MEZANINO', 'HCSA', 'HDVS CCA', 'HDVS TX', 'HNT', 'HSF', 'HSJ', 'SANTA CASA', 'MULTICENTRO', 'PPF', 'PSC'] });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [patientsData, configData, schemaData, staffData] = await Promise.all([
                getPatients(),
                import('./config-actions').then(m => m.getConfig()),
                getSchemaAction(),
                getStaffAction()
            ]);
            setPatients(patientsData);
            setConfig(configData);
            setSchema(schemaData);
            setStaff(staffData);
            
            // Try to load saved column preferences
            const savedColumns = localStorage.getItem('visible_columns');
            if (savedColumns) {
                try {
                    setVisibleColumnIds(new Set(JSON.parse(savedColumns)));
                } catch {
                    console.error("Failed to parse saved columns");
                }
            }

            const savedOrder = localStorage.getItem('column_order');
            if (savedOrder) {
                try {
                    setColumnOrder(JSON.parse(savedOrder));
                } catch {
                    console.error("Failed to parse saved column order");
                }
            }
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Get role from cookies
        const roleMatch = document.cookie.match(/role=([^;]+)/);
        if (roleMatch) {
            setUserRole(decodeURIComponent(roleMatch[1]));
        }
        
        const nameMatch = document.cookie.match(/username=([^;]+)/);
        if (nameMatch) {
            const decodedName = decodeURIComponent(nameMatch[1]);
            setUserName(decodedName);
        }

        const fullNameMatch = document.cookie.match(/fullname=([^;]+)/);
        if (fullNameMatch) {
            setUserFullName(decodeURIComponent(fullNameMatch[1]));
        }
    }, []);

    const handleSort = (key: keyof Patient) => {
        setSortConfig((prev) => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const orderedVisibleFields = useMemo(() => {
        const fields = schema.filter(f => visibleColumnIds.has(f.id));
        if (columnOrder.length > 0) {
            fields.sort((a, b) => {
                const idxA = columnOrder.indexOf(a.id);
                const idxB = columnOrder.indexOf(b.id);
                if (idxA === -1 && idxB === -1) return a.order - b.order;
                if (idxA === -1) return 1;
                if (idxB === -1) return -1;
                return idxA - idxB;
            });
        } else {
            fields.sort((a, b) => a.order - b.order);
        }
        return fields;
    }, [schema, visibleColumnIds, columnOrder]);

    const handleColumnDragStart = (e: DragEvent, id: string) => {
        e.dataTransfer.setData('text/plain', id);
    };

    const handleColumnDrop = (e: DragEvent, targetId: string) => {
        const sourceId = e.dataTransfer.getData('text/plain');
        if (!sourceId || sourceId === targetId) return;

        let newOrder = [...columnOrder];
        if (newOrder.length === 0) {
            newOrder = orderedVisibleFields.map(f => f.id);
        } else {
            const missing = orderedVisibleFields.map(f => f.id).filter(id => !newOrder.includes(id));
            if (missing.length > 0) {
                newOrder = [...newOrder, ...missing];
            }
        }

        const sourceIdx = newOrder.indexOf(sourceId);
        const targetIdx = newOrder.indexOf(targetId);

        if (sourceIdx !== -1 && targetIdx !== -1) {
            const [removed] = newOrder.splice(sourceIdx, 1);
            newOrder.splice(targetIdx, 0, removed);
            setColumnOrder(newOrder);
            localStorage.setItem('column_order', JSON.stringify(newOrder));
        }
    };

    const handleColumnDragOver = (e: DragEvent) => {
        e.preventDefault();
    };

    const handleDragStart = (e: React.DragEvent, patientId: string) => {
        e.dataTransfer.setData("patientId", patientId);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Allow drop
    };

    const handleDrop = async (e: React.DragEvent, newHospital: string) => {
        const patientId = e.dataTransfer.getData("patientId");
        const patient = patients.find(p => p.id === patientId);
        
        if (patient && (patient.hospital || "SEM HOSPITAL") !== newHospital) {
            const updatedPatient = { ...patient, hospital: newHospital === "SEM HOSPITAL" ? "" : newHospital };
            // Update local state for immediate feedback
            setPatients(prev => prev.map(p => p.id === patientId ? updatedPatient : p));
            console.log(`Moved patient ${patientId} to ${newHospital}`);
            
            // Perist to backend
            try {
                const res = await updatePatientAction(updatedPatient);
                if (!res.success) {
                    console.error("Erro ao salvar o status");
                    // Reverte se falhar
                    setPatients(prev => prev.map(p => p.id === patientId ? patient : p));
                }
            } catch(e) {
                console.error(e);
                setPatients(prev => prev.map(p => p.id === patientId ? patient : p));
            }
        }
    };

    const filteredPatients = useMemo(() => {
        let result = patients.filter(p => {
            // Hide discharged patients from active dashboard
            if (p.status === 'ALTA') return false;
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = searchTerm === "" || Object.values(p).some(value => {
                if (typeof value === 'string' || typeof value === 'number') {
                    return String(value).toLowerCase().includes(searchLower);
                }
                if (Array.isArray(value)) {
                    return value.some(v => String(v).toLowerCase().includes(searchLower));
                }
                return false;
            });
            const matchesPreceptor = selectedPreceptors.length === 0 || selectedPreceptors.includes(String(p.preceptor || ""));
            return matchesSearch && matchesPreceptor;
        });

        // Removed selectedStatuses filter

        if (selectedHospitals.length > 0) {
            result = result.filter(p => selectedHospitals.includes(String(p.hospital || '')));
        }

        // Always prioritize Priority 1, then 2, then 3
        result.sort((a, b) => {
            const prioA = a.priority || '3';
            const prioB = b.priority || '3';
            
            // Force Priority 1 > 2 > 3
            if (prioA !== prioB) {
                return String(prioA).localeCompare(String(prioB));
            }
            
            // Secondary sort by sortConfig if active
            if (sortConfig.key !== 'none') {
                const key = sortConfig.key as keyof Patient;
                const aVal = String(a[key] || "");
                const bVal = String(b[key] || "");
                return sortConfig.direction === 'asc' 
                    ? aVal.localeCompare(bVal, undefined, { numeric: true }) 
                    : bVal.localeCompare(aVal, undefined, { numeric: true });
            }
            return 0;
        });

        return result;
    }, [searchTerm, selectedPreceptors, selectedHospitals, patients, sortConfig]);

    const stats = useMemo(() => {
        const base = patients;
        
        const HOSPITAL_COLORS: Record<string, { color: string, bg: string, border: string }> = {
            'Default': { color: "text-blue-600", bg: "bg-blue-50", border: 'border-blue-400' },
            'SANTA CASA': { color: "text-indigo-600", bg: "bg-indigo-50", border: 'border-indigo-400' },
            'SANTA CASA PORTO ALEGRE': { color: "text-indigo-600", bg: "bg-indigo-50", border: 'border-indigo-400' },
            'HSVP': { color: "text-emerald-600", bg: "bg-emerald-50", border: 'border-emerald-400' },
            'CONCEICAO': { color: "text-amber-600", bg: "bg-amber-50", border: 'border-amber-400' },
            'BC MEZANINO': { color: "text-purple-600", bg: "bg-purple-50", border: 'border-purple-400' },
            'HCSA': { color: "text-pink-600", bg: "bg-pink-50", border: 'border-pink-400' },
            'HDVS CCA': { color: "text-orange-600", bg: "bg-orange-50", border: 'border-orange-400' },
            'HDVS TX': { color: "text-teal-600", bg: "bg-teal-50", border: 'border-teal-400' },
            'HNT': { color: "text-red-600", bg: "bg-red-50", border: 'border-red-400' },
            'HSF': { color: "text-lime-600", bg: "bg-lime-50", border: 'border-lime-400' },
            'HSJ': { color: "text-cyan-600", bg: "bg-cyan-50", border: 'border-cyan-400' },
            'MULTICENTRO': { color: "text-fuchsia-600", bg: "bg-fuchsia-50", border: 'border-fuchsia-400' },
            'PPF': { color: "text-rose-600", bg: "bg-rose-50", border: 'border-rose-400' },
            'PSC': { color: "text-yellow-600", bg: "bg-yellow-50", border: 'border-yellow-400' },
        };

        const colors = [
            { color: "text-indigo-600", bg: "bg-indigo-50", border: 'border-indigo-400' },
            { color: "text-emerald-600", bg: "bg-emerald-50", border: 'border-emerald-400' },
            { color: "text-amber-600", bg: "bg-amber-50", border: 'border-amber-400' },
            { color: "text-rose-600", bg: "bg-rose-50", border: 'border-rose-400' },
            { color: "text-violet-600", bg: "bg-violet-50", border: 'border-violet-400' },
            { color: "text-cyan-600", bg: "bg-cyan-50", border: 'border-cyan-400' },
        ];

        const hospitalStats = config.hospitals.map((h, i) => {
            const count = base.filter(p => String(p.hospital || '') === h).length;
            const style = HOSPITAL_COLORS[h.toUpperCase()] || colors[i % colors.length];
            if (count === 0 && !selectedHospitals.includes(h)) return null;
            return {
                label: h,
                type: h,
                count: count,
                isSummary: false,
                ...style
            };
        }).filter(s => s !== null);

        return [
            { label: "(TODOS)", type: 'Todas', count: base.length, color: "text-white", bg: "bg-[#0a1f44]", border: 'border-blue-900', isSummary: true },
            ...hospitalStats
        ];
    }, [patients, config.hospitals]);

    const getStatusStyle = (status: PatientStatus) => {
        switch (status) {
            case "PRONTO PARA ALTA": return "bg-emerald-500 text-white";
            case "EM ROUND": return "bg-yellow-500 text-white";
            case "INTERNADO": return "bg-indigo-600 text-white";
            case "SEM STATUS": return "bg-slate-400 text-white";
            default: return "bg-slate-400 text-white";
        }
    };


    const getRowPriorityClass = (priority?: string) => {
    switch(priority) {
        case '1': return 'bg-red-100/80 hover:bg-red-200/80 text-black';
        case '2': return 'bg-yellow-100/80 hover:bg-yellow-200/80 text-black';
        case '3': return 'bg-white hover:bg-slate-50 text-slate-700';
        default: return 'bg-white hover:bg-slate-50 text-slate-700';
    }
};

    const renderDate = (dateStr: string) => {
        if (!dateStr || dateStr === '--') return '--';
        // Convert YYYY-MM-DD to DD/MM/YYYY
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateStr;
    };

    const renderTableCell = (patient: Patient, field: FieldSchema) => {
        const value = patient[field.id as keyof Patient];
        
        if (field.id === 'status') {
            return (
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-wide inline-block min-w-[100px] text-center ${getStatusStyle(String(value || 'SEM STATUS') as PatientStatus)}`}>
                    {String(value || 'SEM STATUS')}
                </span>
            );
        }

        if (field.id === 'position') {
            return (
                <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">{String(value || '--')}</span>
            );
        }

        if (field.id === 'teamPosition') {
            return (
                <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">{String(value || '--')}</span>
            );
        }

        if (field.id === 'name') {
            return (
                <div className="flex flex-col">
                    <span className="text-sm transition-colors text-black font-semibold uppercase">
                        {String(value || '--')}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">
                        {patient.age ? `${patient.age} anos` : ''}
                    </span>
                </div>
            );
        }

        if (field.type === 'date') {
            return (
                <span className="text-[10px] text-black uppercase font-medium">
                    {renderDate(String(value || '--'))}
                </span>
            );
        }

        if (field.id === 'preceptor') {
            const preceptorName = String(value || '');
            const staffMember = staff.find(s => s.fullName === preceptorName || s.systemName === preceptorName);
            return (
                <span className="text-[10px] text-black uppercase font-medium">
                    {staffMember?.systemName || preceptorName || '--'}
                </span>
            );
        }

        return (
            <span className={`text-black uppercase ${field.type === 'number' ? 'font-mono text-xs' : 'text-[10px] font-medium'}`}>
                {String(value || '--')}
            </span>
        );
    };

    const SortIcon = ({ column }: { column: string }) => {
        if (sortConfig.key !== column) return <ArrowUpDown size={12} className="ml-1 opacity-20 group-hover:opacity-100 transition-opacity" />;
        return sortConfig.direction === 'asc' ? <ArrowUp size={12} className="ml-1 text-blue-600" /> : <ArrowDown size={12} className="ml-1 text-blue-600" />;
    };

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden relative">
            {/* Sidebar Overlay (Mobile) */}
            {sidebarOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-sm"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 w-64 bg-[#0a1f44] text-white flex flex-col shrink-0 overflow-y-auto z-50 transition-transform duration-300 lg:translate-x-0 lg:static ${
                sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
            }`}>
                <div className="p-6 border-b border-white/5 bg-[#0a1f44]">
                    <div className="flex flex-col items-center justify-center p-3 w-full relative">
                        <button 
                            onClick={() => setSidebarOpen(false)} 
                            title="Fechar menu" 
                            className="lg:hidden absolute -top-2 -right-2 text-slate-400 hover:text-white p-2 bg-white/5 rounded-full z-10"
                        >
                            <X size={24} />
                        </button>
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
                
                <div className="px-6 mb-6">
                    <div className="px-3 py-1 bg-white/10 rounded-lg inline-block w-full">
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Total: </span>
                        <span className="text-sm font-bold text-white">{patients.length} Pacientes</span>
                    </div>
                </div>
                <nav className="flex-1 px-3 space-y-1">
                    <div className="flex items-center justify-between px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>Filtrar por Equipe</span>
                        {selectedPreceptors.length > 0 && (
                            <button 
                                onClick={() => setSelectedPreceptors([])}
                                className="text-blue-400 hover:text-blue-300 transition-colors"
                            >
                                Limpar
                            </button>
                        )}
                    </div>
                    {[...new Set(patients.map(p => String(p.preceptor || "")).filter(name => name !== ""))].sort((a, b) => a.localeCompare(b, 'pt-BR')).map((preceptor) => {
                        const isSelected = selectedPreceptors.includes(preceptor);
                        const staffMember = staff.find(s => s.fullName === preceptor || s.systemName === preceptor);
                        const displayName = staffMember?.systemName || preceptor;
                        
                        return (
                            <div key={preceptor}>
                                <button
                                    onClick={() => {
                                        setSelectedPreceptors(prev => 
                                            prev.includes(preceptor) 
                                                ? prev.filter(t => t !== preceptor)
                                                : [...prev, preceptor]
                                        );
                                    }}
                                    title={`Filtrar por ${displayName}`}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all ${
                                        isSelected ? "bg-[#d4af37] text-[#0a1f44] shadow-md font-bold" : "text-slate-300 hover:bg-white/5"
                                    }`}
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <User size={16} className={isSelected ? "text-[#0a1f44]" : "text-slate-400"} />
                                        <span className="truncate">{displayName}</span>
                                    </div>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                        isSelected ? "bg-[#0a1f44]/10" : "bg-white/10 text-slate-400"
                                    }`}>
                                        {patients.filter(p => p.preceptor === preceptor).length}
                                    </span>
                                </button>
                            </div>
                        );
                    })}

                </nav>
                
                <div className="p-4 mt-auto border-t border-white/5 space-y-1">
                    <button
                        onClick={() => window.location.href = '/tcle'}
                        className="w-full flex items-center gap-2 text-[#d4af37] hover:text-yellow-300 hover:bg-yellow-500/10 text-xs py-2 px-3 rounded-lg transition-all"
                        title="Editor de Termo de Consentimento Livre e Esclarecido"
                    >
                        <FileText size={14} />
                        <span className="font-bold uppercase tracking-wider">Editor de TCLE</span>
                    </button>

                    <button
                        onClick={() => setIsArchiveSearchOpen(true)}
                        className="w-full flex items-center gap-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 text-xs py-2 px-3 rounded-lg transition-all"
                        title="Buscar Pacientes com Alta"
                    >
                        <Search size={14} />
                        <span className="font-bold uppercase tracking-wider">Buscar Altas</span>
                    </button>

                    <button 
                        onClick={() => setIsProfileOpen(true)}
                        className="w-full flex items-center gap-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 text-xs py-2 px-3 rounded-lg transition-all"
                        title="Configurações de Perfil"
                    >
                        <User size={14} />
                        <span className="font-bold uppercase tracking-wider">Meu Perfil</span>
                    </button>

                    <button 
                        onClick={fetchData} 
                        aria-label="Sincronizar dados"
                        title="Sincronizar dados"
                        className="w-full flex items-center gap-2 text-slate-400 hover:text-white text-xs py-2 px-3 rounded-lg hover:bg-white/5 transition-all"
                    >
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                        <span className="font-medium">{loading ? "Sincronizando..." : "Sincronizar Planilha"}</span>
                    </button>
                    
                    <button 
                        onClick={() => {
                            document.cookie = "auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
                            document.cookie = "role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
                            document.cookie = "username=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
                            window.location.href = "/login";
                        }}
                        className="w-full flex items-center gap-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs py-2 px-3 rounded-lg transition-all mt-2"
                        title="Sair do sistema"
                    >
                        <X size={14} className="rotate-45" />
                        <span className="font-bold uppercase tracking-wider">Sair do Sistema</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden mt-6 sm:mt-0">
                {/* Topbar */}
                {/* Topbar */}
                <header className="bg-white border-b border-slate-200 flex flex-col shrink-0">
                    {/* Linha 1: Principal */}
                    <div className="h-16 flex items-center justify-between px-4 lg:px-8 border-b border-slate-100/50">
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => setSidebarOpen(true)}
                                aria-label="Abrir menu"
                                title="Abrir menu"
                                className="p-2 lg:hidden text-slate-500 hover:bg-slate-100 rounded-lg"
                            >
                                <Menu size={20} />
                            </button>
                            <div className="flex flex-col overflow-hidden">
                                <span className="text-xs sm:text-sm lg:text-lg font-black text-slate-900 uppercase">
                                    OLÁ, {userFullName || userName || userRole || 'NOME'}
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <input 
                                    type="text" 
                                    placeholder="Buscar paciente..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 bg-slate-100 border-none rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 w-full transition-all text-black font-semibold"
                                />
                            </div>

                            {userRole === 'Administrador' && (
                                <button 
                                    onClick={() => window.location.href = '/admin'}
                                    className="flex items-center justify-center gap-1 sm:gap-2 bg-slate-800 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold shadow-md hover:bg-slate-700 transition-all"
                                    title="Ir para Painel Administrativo"
                                >
                                    <Users className="w-3.5 h-3.5 sm:w-[18px] sm:h-[18px]" />
                                    <span className="hidden lg:inline">Painel Admin</span>
                                </button>
                            )}

                            <button 
                                onClick={() => { setSelectedPatient(null); setIsModalOpen(true); }}
                                className="flex items-center justify-center gap-1.5 sm:gap-2 bg-[#d4af37] text-[#0a1f44] px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-black shadow-lg shadow-[#d4af37]/20 hover:bg-[#c5a059] transition-all active:scale-95"
                                aria-label="Adicionar novo paciente"
                                title="Novo Paciente"
                            >
                                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                                <span className="hidden sm:inline">Novo</span>
                            </button>
                        </div>
                    </div>

                    {/* Linha 2: Filtros e Visualização */}
                    <div className="h-14 flex items-center justify-between px-4 lg:px-8 bg-slate-50/30 overflow-x-auto lg:overflow-visible no-scrollbar gap-4">
                        <div className="flex items-center gap-4">

                            {/* View Toggle */}
                            <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200/60 shadow-sm">
                                <button 
                                    onClick={() => setViewMode("lista")}
                                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        viewMode === "lista" ? "bg-[#0a1f44] text-white shadow-md" : "text-slate-500 hover:text-slate-700"
                                    }`}
                                >
                                    <LayoutList size={14} />
                                    <span>Lista</span>
                                </button>
                                <button 
                                    onClick={() => setViewMode("kanban")}
                                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        viewMode === "kanban" ? "bg-[#0a1f44] text-white shadow-md" : "text-slate-500 hover:text-slate-700"
                                    }`}
                                >
                                    <LayoutGrid size={14} />
                                    <span>Kanban</span>
                                </button>
                            </div>
                        </div>
                              {/* Header Actions */}
                        <div className="flex items-center gap-3">
                            {/* Column Toggle */}
                            <div className="relative">
                                <button 
                                    onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition-all border shadow-sm active:scale-95 ${
                                        isColumnMenuOpen ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                                    }`}
                                >
                                    <Settings size={16} className={isColumnMenuOpen ? "animate-spin-slow" : ""} />
                                    <span>Colunas</span>
                                    <ChevronDown size={14} className={`transition-transform duration-200 ${isColumnMenuOpen ? "rotate-180" : ""}`} />
                                </button>

                                {isColumnMenuOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setIsColumnMenuOpen(false)} />
                                        <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 py-3 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                            <div className="px-4 py-2 border-b border-slate-50 mb-2">
                                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Colunas Visíveis</span>
                                            </div>
                                            <div className="max-h-[300px] overflow-y-auto px-2 space-y-0.5">
                                                {schema
                                                    .filter(f => !f.isSystem || f.id === 'name')
                                                    .sort((a, b) => a.order - b.order)
                                                    .map(field => {
                                                        const isVisible = visibleColumnIds.has(field.id);
                                                        return (
                                                            <button
                                                                key={field.id}
                                                                onClick={() => {
                                                                    const newIds = new Set(visibleColumnIds);
                                                                    if (isVisible) newIds.delete(field.id);
                                                                    else newIds.add(field.id);
                                                                    setVisibleColumnIds(newIds);
                                                                    localStorage.setItem('visible_columns', JSON.stringify(Array.from(newIds)));
                                                                }}
                                                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${isVisible ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                                                            >
                                                                <span className="text-xs uppercase tracking-tight">{field.label}</span>
                                                                {isVisible ? (
                                                                    <div className="w-5 h-5 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30">
                                                                        <Check size={12} className="text-white" strokeWidth={4} />
                                                                    </div>
                                                                ) : (
                                                                    <div className="w-5 h-5 border-2 border-slate-200 rounded-lg" />
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Report Button */}
                            <button 
                                onClick={() => setIsReportOpen(true)}
                                className="flex items-center gap-2 bg-white border border-slate-200/80 text-slate-700 px-6 py-2 rounded-xl text-sm font-black shadow-sm hover:border-blue-400 hover:text-blue-600 transition-all active:scale-95 group"
                                title="Gerar Relatório Personalizado"
                            >
                                <FileText size={16} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                                <span>Relatórios</span>
                            </button>
                        </div>
                    </div>
                </header>

                {/* Dashboard Area */}
                <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50/50 pb-24 sm:pb-8">
                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:flex lg:flex-nowrap lg:overflow-x-auto gap-3 sm:gap-4 mb-6 sm:mb-8 pb-2 no-scrollbar">
                        {stats.map((s) => {
                            return (
                                <button 
                                    key={s.label}
                                    onClick={() => {
                                        if (s.isSummary) {
                                            setSelectedHospitals([]);
                                        } else {
                                            setSelectedHospitals(prev => 
                                                prev.includes(s.type) 
                                                    ? prev.filter(h => h !== s.type)
                                                    : [...prev, s.type]
                                            );
                                        }
                                    }}
                                    className={`relative flex flex-col gap-1 p-3 sm:p-4 rounded-2xl border-2 transition-all min-w-[120px] sm:min-w-[140px] text-left active:scale-95 group shadow-sm ${
                                        (s.isSummary && selectedHospitals.length === 0) || (!s.isSummary && selectedHospitals.includes(s.type))
                                            ? `${s.bg} ${s.border} ring-4 ring-blue-500/5` 
                                            : "bg-white border-transparent hover:border-slate-200"
                                    }`}
                                >
                                    <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest ${
                                        (s.isSummary && selectedHospitals.length === 0) || (!s.isSummary && selectedHospitals.includes(s.type))
                                            ? s.color 
                                            : "text-slate-400"
                                    }`}>
                                        {s.label}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <span className={`text-xl sm:text-2xl font-black ${(s.isSummary && selectedHospitals.length === 0) || (!s.isSummary && selectedHospitals.includes(s.type)) ? s.color : "text-slate-700"}`}>
                                            {s.count}
                                        </span>
                                        <span className={`text-[10px] sm:text-xs font-bold ${(s.isSummary && selectedHospitals.length === 0) || (!s.isSummary && selectedHospitals.includes(s.type)) ? s.color : "text-slate-400"} opacity-60`}>
                                            PACIENTES
                                        </span>
                                    </div>
                                    {(s.isSummary ? selectedHospitals.length === 0 : selectedHospitals.includes(s.type)) && (
                                        <div className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${s.isSummary ? 'bg-white' : 'bg-current shadow-[0_0_8px_rgba(37,99,235,0.4)]'}`} />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Table View (Desktop) / Card View (Mobile) */}
                    {viewMode === "lista" ? (
                        <>
                            {/* Desktop Table */}
                            <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[800px] lg:min-w-0">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            {orderedVisibleFields.map(field => (
                                                    <th 
                                                        key={field.id}
                                                        draggable
                                                        onDragStart={(e) => handleColumnDragStart(e, field.id)}
                                                        onDragOver={handleColumnDragOver}
                                                        onDrop={(e) => handleColumnDrop(e, field.id)}
                                                        onClick={() => handleSort(field.id as keyof Patient)} 
                                                        className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer group hover:bg-slate-100 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-1.5 pointer-events-none">
                                                            {field.label} 
                                                            <SortIcon column={field.id} />
                                                        </div>
                                                    </th>
                                                ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {loading ? (
                                            Array.from({ length: 10 }).map((_, i) => (
                                                <tr key={i} className="animate-pulse">
                                                    <td colSpan={visibleColumnIds.size} className="px-6 py-4 h-14 bg-slate-50/50" />
                                                </tr>
                                            ))
                                        ) : (
                                            filteredPatients.map((patient) => (
                                                <tr 
                                                    key={patient.id} 
                                                    onClick={() => { setSelectedPatient(patient); setIsModalOpen(true); }}
                                                    className={`transition-colors cursor-pointer group ${getRowPriorityClass(String(patient.priority || '3'))}`}
                                                >
                                                    {orderedVisibleFields.map(field => (
                                                             <td key={field.id} className="px-6 py-4">
                                                                 {renderTableCell(patient, field)}
                                                             </td>
                                                         ))}
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="lg:hidden space-y-2 sm:space-y-4">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <div key={i} className="bg-white p-4 sm:p-6 rounded-2xl animate-pulse h-32 w-full shadow-sm" />
                                    ))
                                ) : (
                                    filteredPatients.map((patient) => (
                                        <div 
                                            key={patient.id}
                                            onClick={() => { setSelectedPatient(patient); setIsModalOpen(true); }}
                                            className={`bg-white p-3 sm:p-5 rounded-2xl sm:rounded-3xl border-2 transition-all active:scale-[0.98] ${
                                                patient.priority === '1' ? 'border-red-100' :
                                                patient.priority === '2' ? 'border-yellow-100' :
                                                'border-slate-100'
                                            }`}
                                        >
                                            <div className="flex justify-between items-start mb-2 sm:mb-4">
                                                <span className={`px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-[9px] sm:text-[10px] font-black tracking-wide ${getStatusStyle(String(patient.status || 'SEM STATUS') as PatientStatus)}`}>
                                                    {String(patient.status || 'SEM STATUS')}
                                                </span>
                                                <div className={`p-1 sm:p-1.5 rounded-lg ${patient.priority === '1' ? 'bg-red-50 text-red-600' : patient.priority === '2' ? 'bg-yellow-50 text-yellow-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                    <Activity size={14} className="sm:hidden" />
                                                    <Activity size={16} className="hidden sm:block" />
                                                </div>
                                            </div>
                                            
                                            <div className="mb-2 sm:mb-4">
                                                <h4 className="text-sm sm:text-base font-bold text-slate-800 leading-tight mb-0.5 sm:mb-1 uppercase">{patient.name}</h4>
                                                <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Prontuário: {patient.medicalRecord}</p>
                                            </div>

                                            <div className="flex flex-col gap-1 sm:gap-2 pt-2 sm:pt-4 border-t border-slate-50">
                                                <div className="flex justify-between items-center border-b border-slate-50 pb-1 sm:pb-2">
                                                    <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Posição GERAL / EQUIPE</span>
                                                    <span className="text-[10px] sm:text-xs"><span className="font-black text-blue-600 mr-1.5" title="Posição Geral">#{String(patient.position || '--')}</span><span className="font-black text-emerald-600" title="Posição Equipe">#{String(patient.teamPosition || '--')}</span></span>
                                                </div>
                                                <div className="flex justify-between items-center border-b border-slate-50 pb-1 sm:pb-2">
                                                    <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Equipe / Sistema</span>
                                                    <span className="text-[10px] sm:text-xs font-bold text-slate-700 text-right">{patient.team} <span className="text-slate-300 mx-1">•</span> {patient.sistema}</span>
                                                </div>
                                                <div className="flex justify-between items-center border-b border-slate-50 pb-1 sm:pb-2">
                                                    <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Data AIH</span>
                                                    <span className="text-[10px] sm:text-xs font-bold text-slate-700 text-right">{renderDate(String(patient.aihDate || ''))}</span>
                                                </div>
                                                <div className="flex justify-between items-center border-b border-slate-50 pb-1 sm:pb-2">
                                                    <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Cirurgia</span>
                                                    <span className="text-[10px] sm:text-xs font-bold text-slate-700 text-right">{renderDate(String(patient.surgeryDate || ''))}</span>
                                                </div>
                                                <div className="flex justify-between items-center border-b border-slate-50 pb-1 sm:pb-2">
                                                    <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Preceptor</span>
                                                    <span className="text-[10px] sm:text-xs font-bold text-slate-700 text-right">{String(patient.preceptor || '--')}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Residente</span>
                                                    <span className="text-[10px] sm:text-xs font-bold text-slate-700 text-right">{String(patient.resident || '--')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {!loading && filteredPatients.length === 0 && (
                                <div className="p-12 text-center">
                                    <Users size={40} className="mx-auto text-slate-200 mb-4" />
                                    <p className="text-slate-500 font-medium">Nenhum paciente encontrado para esta seleção.</p>
                                </div>
                             )}
                        </>
                    ) : (
                        <div className="flex gap-4 sm:gap-6 pb-6 overflow-x-auto no-scrollbar snap-x snap-mandatory lg:snap-none -mx-4 px-4 sm:mx-0 sm:px-0">
                            {(config.hospitals && config.hospitals.length > 0
                                ? [...config.hospitals, "SEM HOSPITAL"]
                                : ['BC MEZANINO', 'HCSA', 'HDVS CCA', 'HDVS TX', 'HNT', 'HSF', 'HSJ', 'SANTA CASA', 'MULTICENTRO', 'PPF', 'PSC', "SEM HOSPITAL"]
                            ).filter(h => {
                                const count = filteredPatients.filter(p => (p.hospital === h) || (!p.hospital && h === "SEM HOSPITAL")).length;
                                return count > 0;
                            }).map((hospital) => {
                                const colPatients = filteredPatients.filter(p => 
                                    (p.hospital === hospital) || (!p.hospital && hospital === "SEM HOSPITAL")
                                );
                                return (
                                <div 
                                    key={hospital} 
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, hospital)}
                                    className="w-[280px] sm:w-80 flex-shrink-0 bg-slate-100 rounded-2xl p-3 sm:p-4 flex flex-col gap-3 sm:gap-4 border-2 border-transparent transition-colors hover:border-blue-200 snap-center"
                                >
                                    <div className="flex items-center justify-between px-1">
                                        <h3 className="text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest">{hospital}</h3>
                                        <span className="bg-white/50 text-slate-600 px-2.5 py-0.5 rounded-full text-[10px] font-black border border-slate-200/50">
                                            {colPatients.length}
                                        </span>
                                    </div>
                                    <div className="flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
                                        {colPatients.map((p) => (
                                            <div 
                                                key={p.id} 
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, p.id)}
                                                onClick={() => { setSelectedPatient(p); setIsModalOpen(true); }}
                                                className={`bg-white p-4 rounded-xl shadow-sm border-l-4 border-y border-r border-slate-200 cursor-grab active:cursor-grabbing hover:border-blue-400 transition-all hover:shadow-md active:scale-[0.98] group ${
                                                    String(p.priority || '3') === '1' ? 'border-l-red-500' :
                                                    String(p.priority || '3') === '2' ? 'border-l-yellow-500' :
                                                    'border-l-emerald-500'
                                                }`}
                                            >
                                                <p className="text-xs font-bold mb-1 truncate uppercase text-slate-800">{p.name}</p>
                                                <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase">
                                                    <span className="truncate max-w-[120px]">{p.preceptor}</span>
                                                    <span className="font-mono">{p.medicalRecord}</span>
                                                </div>
                                                <div className="mt-1 flex flex-col gap-0.5">
                                                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-tight">
                                                        {hospital}
                                                    </span>
                                                    {p.leito && (
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">
                                                            LEITO: {p.leito}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-50">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-bold">
                                                            {p.age} {Number(p.age) === 1 ? 'ano' : 'anos'}
                                                        </span>
                                                        <span className="text-[8px] bg-blue-50 border border-blue-100 px-2 py-0.5 rounded text-blue-600 font-black uppercase tracking-tighter">
                                                            {String(p.convenio || 'CONVÊNIO')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    )}
                </main>
                
                {/* Mobile Floating Action Button */}
                <button 
                    onClick={() => { setSelectedPatient(null); setIsModalOpen(true); }}
                    className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-[#d4af37] text-[#0a1f44] rounded-full shadow-[0_10px_30px_rgba(212,175,55,0.5)] flex items-center justify-center active:scale-95 transition-all z-[60]"
                    aria-label="Adicionar novo paciente"
                >
                    <Plus size={32} strokeWidth={3} />
                </button>
            </div>

            <PatientModal
                patient={selectedPatient}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={fetchData} 
            />
            <ReportModal
                patients={filteredPatients}
                isOpen={isReportOpen}
                onClose={() => setIsReportOpen(false)}
            />
            <ProfileModal 
                isOpen={isProfileOpen} 
                onClose={() => setIsProfileOpen(false)} 
            />
            {/* Archive Search Modal */}
            {isArchiveSearchOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-blue-950/60 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden scale-up-center">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                            <div>
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">BUSCAR ALTAS HOSPITALARES</h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Histórico de pacientes que já deixaram a unidade</p>
                            </div>
                            <button onClick={() => setIsArchiveSearchOpen(false)} title="Fechar Busca de Altas" className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="p-6 pb-2 shrink-0">
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                                <input
                                    type="text"
                                    placeholder="Buscar por Nome ou Prontuário..."
                                    value={archiveSearchTerm}
                                    onChange={(e) => setArchiveSearchTerm(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500/30 focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all text-slate-900 font-medium placeholder:text-slate-400"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-3">
                            {patients
                                .filter(p => p.status === 'ALTA' && (
                                    String(p.name || '').toLowerCase().includes(archiveSearchTerm.toLowerCase()) ||
                                    String(p.medicalRecord || '').toLowerCase().includes(archiveSearchTerm.toLowerCase())
                                ))
                                .map((p) => (
                                    <button
                                        key={p.id}
                                        onClick={() => {
                                            setSelectedPatient(p);
                                            setIsModalOpen(true);
                                            setIsArchiveSearchOpen(false);
                                        }}
                                        className="w-full bg-white border-2 border-slate-50 hover:border-blue-100 hover:shadow-lg hover:shadow-blue-600/5 p-4 rounded-2xl flex items-center justify-between transition-all group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                                <User size={20} />
                                            </div>
                                            <div className="text-left">
                                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">{p.name}</h3>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.hospital || 'Sem Hospital'}</span>
                                                    <span className="text-[10px] text-slate-200">|</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pront: {p.medicalRecord || '--'}</span>
                                                    {p.dischargeDate && (
                                                        <>
                                                            <span className="text-[10px] text-slate-200">|</span>
                                                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">Alta: {p.dischargeDate}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20">
                                                Ver Detalhes
                                            </div>
                                        </div>
                                    </button>
                                ))
                            }
                            {patients.filter(p => p.status === 'ALTA').length === 0 && (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                                        <FileText size={32} />
                                    </div>
                                    <h3 className="text-slate-900 font-black tracking-tight">Nenhuma alta encontrada</h3>
                                    <p className="text-slate-400 text-sm font-medium mt-1">Pacientes que receberem alta aparecerão aqui.</p>
                                </div>
                            )}
                            {patients.filter(p => p.status === 'ALTA').length > 0 && 
                             patients.filter(p => p.status === 'ALTA' && (
                                String(p.name || '').toLowerCase().includes(archiveSearchTerm.toLowerCase()) ||
                                String(p.medicalRecord || '').toLowerCase().includes(archiveSearchTerm.toLowerCase())
                             )).length === 0 && (
                                <div className="text-center py-12 text-slate-400 text-sm font-medium italic">
                                    Nenhum paciente corresponde à busca &quot;{archiveSearchTerm}&quot;
                                </div>
                             )
                            }
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
