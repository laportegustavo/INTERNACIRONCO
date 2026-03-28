"use client";

import { useState, useRef, useCallback } from "react";
import {
  X,
  ChevronRight,
  ChevronLeft,
  FileText,
  User,
  Stethoscope,
  ClipboardList,
  Sparkles,
  Printer,
  Edit3,
  Check,
  Loader2,
  Building2,
  AlertCircle,
} from "lucide-react";
import type { TcleFormData } from "@/app/api/tcle/generate/route";

interface TcleModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefillPatient?: Partial<TcleFormData>;
}

const STEPS = [
  { id: 1, label: "Paciente", icon: User },
  { id: 2, label: "Médico & Hospital", icon: Building2 },
  { id: 3, label: "Procedimento", icon: Stethoscope },
  { id: 4, label: "História Clínica", icon: ClipboardList },
  { id: 5, label: "Gerar TCLE", icon: Sparkles },
  { id: 6, label: "Revisar & Imprimir", icon: Printer },
];

const ANESTHESIA_OPTIONS = [
  { value: "geral", label: "Anestesia Geral" },
  { value: "raquianestesia", label: "Raquianestesia (Raqui)" },
  { value: "peridural", label: "Peridural / Epidural" },
  { value: "local", label: "Anestesia Local" },
  { value: "sedacao", label: "Sedação + Anestesia Local" },
  { value: "bloqueio", label: "Bloqueio de Nervo Periférico" },
];

const emptyForm: TcleFormData = {
  patientName: "",
  patientBirthDate: "",
  patientAge: "",
  patientCPF: "",
  patientRG: "",
  patientAddress: "",
  patientCity: "",
  patientPhone: "",
  patientMedicalRecord: "",
  patientInsurance: "",
  guardianName: "",
  guardianRelationship: "",
  guardianCPF: "",
  doctorName: "",
  doctorCRM: "",
  doctorSpecialty: "",
  anesthesiologistName: "",
  anesthesiologistCRM: "",
  procedureName: "",
  procedureCID: "",
  procedureDate: "",
  procedureTime: "",
  hospital: "",
  hospitalAddress: "",
  operatingRoom: "",
  anesthesiaType: "geral",
  diagnosis: "",
  clinicalHistory: "",
  justificationExams: "",
  surgicalIndication: "",
  therapeuticAlternatives: "",
  residentName: "",
  residentCRM: "",
};

function calcAge(birthDate: string): string {
  if (!birthDate) return "";
  const [day, month, year] = birthDate.split("/").map(Number);
  if (!day || !month || !year || year < 1900) return "";
  const birth = new Date(year, month - 1, day);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 ? String(age) : "";
}

function maskCPF(v: string) {
  return v
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

function maskDate(v: string) {
  return v
    .replace(/\D/g, "")
    .slice(0, 8)
    .replace(/(\d{2})(\d)/, "$1/$2")
    .replace(/(\d{2})\/(\d{2})(\d)/, "$1/$2/$3");
}

function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10)
    return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
}

export default function TcleModal({
  isOpen,
  onClose,
  prefillPatient,
}: TcleModalProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<TcleFormData>({
    ...emptyForm,
    ...prefillPatient,
  });
  const [generatedHtml, setGeneratedHtml] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editableHtml, setEditableHtml] = useState("");
  const [generationError, setGenerationError] = useState("");
  const previewRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const set = useCallback(
    (field: keyof TcleFormData, value: string) => {
      setForm((prev) => {
        const next = { ...prev, [field]: value };
        if (field === "patientBirthDate") {
          next.patientAge = calcAge(value);
        }
        return next;
      });
    },
    []
  );

  const canAdvance = (): boolean => {
    if (step === 1)
      return (
        !!form.patientName.trim() &&
        !!form.patientBirthDate.trim() &&
        !!form.patientMedicalRecord.trim()
      );
    if (step === 2)
      return (
        !!form.doctorName.trim() &&
        !!form.doctorCRM.trim() &&
        !!form.hospital.trim()
      );
    if (step === 3)
      return (
        !!form.procedureName.trim() &&
        !!form.procedureDate.trim() &&
        !!form.anesthesiaType
      );
    if (step === 4)
      return !!form.diagnosis.trim() && !!form.surgicalIndication.trim();
    return true;
  };

  async function handleGenerate() {
    setIsGenerating(true);
    setGenerationError("");
    setGeneratedHtml("");
    abortRef.current = new AbortController();

    try {
      const response = await fetch("/api/tcle/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        signal: abortRef.current.signal,
      });

      if (!response.ok) throw new Error("Erro ao gerar TCLE");
      if (!response.body) throw new Error("Stream não disponível");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let html = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                html += parsed.text;
                setGeneratedHtml(html);
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }

      setEditableHtml(html);
      setStep(6);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setGenerationError(
          "Erro ao gerar o TCLE. Verifique a chave API e tente novamente."
        );
      }
    } finally {
      setIsGenerating(false);
    }
  }

  function handlePrint() {
    const content = isEditing ? editableHtml : generatedHtml;
    const hoje = new Date().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>TCLE - ${form.patientName} - ${form.procedureName}</title>
  <style>
    @page {
      size: A4;
      margin: 25mm 20mm 25mm 25mm;
    }
    * { box-sizing: border-box; }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #000;
      background: white;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .header h1 {
      font-size: 14pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin: 0 0 4px 0;
    }
    .header .subtitle {
      font-size: 10pt;
      color: #333;
    }
    .doc-number {
      text-align: right;
      font-size: 9pt;
      color: #555;
      margin-bottom: 16px;
    }
    h2 {
      font-size: 12pt;
      font-weight: bold;
      text-transform: uppercase;
      text-align: center;
      border: 2px solid #000;
      padding: 8px;
      margin: 24px 0 16px 0;
      background: #f0f0f0;
    }
    h3 {
      font-size: 11pt;
      font-weight: bold;
      text-transform: uppercase;
      border-left: 4px solid #000;
      padding-left: 8px;
      margin: 18px 0 8px 0;
    }
    p { margin: 6px 0; text-align: justify; }
    ul, ol {
      margin: 6px 0 6px 20px;
      padding: 0;
    }
    li { margin: 3px 0; text-align: justify; }
    strong { font-weight: bold; }
    em { font-style: italic; }
    .signatures {
      page-break-inside: avoid;
      margin-top: 40px;
    }
    .sig-row {
      display: flex;
      gap: 30px;
      margin-bottom: 30px;
    }
    .sig-box {
      flex: 1;
      border-top: 1px solid #000;
      padding-top: 6px;
      text-align: center;
      font-size: 10pt;
    }
    .sig-box .name { font-weight: bold; margin: 2px 0; }
    .sig-box .label { color: #555; font-size: 9pt; }
    .sig-space { height: 50px; }
    .cfm-note {
      font-size: 8pt;
      color: #555;
      border-top: 1px solid #ccc;
      padding-top: 8px;
      margin-top: 20px;
      text-align: center;
    }
    .date-place {
      text-align: right;
      margin: 20px 0;
      font-size: 10pt;
    }
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${form.hospital}</h1>
    <div class="subtitle">${form.hospitalAddress || ""}</div>
  </div>
  <div class="doc-number">
    Prontuário: ${form.patientMedicalRecord || "___________"} &nbsp;|&nbsp;
    Data de emissão: ${hoje}
  </div>
  ${content}
  <div class="date-place">
    ${form.hospital}, ${form.procedureDate ? form.procedureDate : "____/____/________"}
  </div>
  <div class="signatures">
    <div class="sig-row">
      <div class="sig-box">
        <div class="sig-space"></div>
        <div class="name">${form.patientName}</div>
        <div class="label">Paciente${form.guardianName ? " / Responsável Legal" : ""}</div>
        <div class="label">CPF: ${form.patientCPF || "___________________"}</div>
      </div>
      ${
        form.guardianName
          ? `<div class="sig-box">
        <div class="sig-space"></div>
        <div class="name">${form.guardianName}</div>
        <div class="label">Responsável Legal (${form.guardianRelationship || ""})</div>
        <div class="label">CPF: ${form.guardianCPF || "___________________"}</div>
      </div>`
          : ""
      }
    </div>
    <div class="sig-row">
      <div class="sig-box">
        <div class="sig-space"></div>
        <div class="name">Dr(a). ${form.doctorName}</div>
        <div class="label">Médico Responsável</div>
        <div class="label">CRM: ${form.doctorCRM} — ${form.doctorSpecialty}</div>
      </div>
      ${
        form.anesthesiologistName
          ? `<div class="sig-box">
        <div class="sig-space"></div>
        <div class="name">Dr(a). ${form.anesthesiologistName}</div>
        <div class="label">Médico Anestesiologista</div>
        <div class="label">CRM: ${form.anesthesiologistCRM || "___________"}</div>
      </div>`
          : ""
      }
    </div>
    <div class="sig-row">
      <div class="sig-box">
        <div class="sig-space"></div>
        <div class="name">Testemunha 1</div>
        <div class="label">Nome: ___________________________________</div>
        <div class="label">CPF: ___________________</div>
      </div>
      <div class="sig-box">
        <div class="sig-space"></div>
        <div class="name">Testemunha 2</div>
        <div class="label">Nome: ___________________________________</div>
        <div class="label">CPF: ___________________</div>
      </div>
    </div>
  </div>
  <div class="cfm-note">
    Documento elaborado em conformidade com a Resolução CFM nº 2.217/2018 (Código de Ética Médica),
    Resolução CFM nº 1.931/2009 e Resolução CNS nº 466/2012.
    Este documento tem validade jurídica após a assinatura de todas as partes.
    Vias: 01 para o paciente · 01 para o prontuário médico
  </div>
</body>
</html>`);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }

  function handleReset() {
    setStep(1);
    setForm({ ...emptyForm });
    setGeneratedHtml("");
    setEditableHtml("");
    setGenerationError("");
    setIsEditing(false);
  }

  if (!isOpen) return null;

  const currentStep = STEPS[step - 1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[96vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#0a1f44] to-[#1a3a6b] text-white rounded-t-2xl shrink-0">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-[#d4af37]" />
            <div>
              <h2 className="font-bold text-lg">Editor de TCLE</h2>
              <p className="text-xs text-blue-200">
                Termo de Consentimento Livre e Esclarecido
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 pt-4 pb-2 bg-slate-50 border-b shrink-0">
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isActive = step === s.id;
              const isDone = step > s.id;
              return (
                <div key={s.id} className="flex items-center gap-1 shrink-0">
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                      isActive
                        ? "bg-[#0a1f44] text-white shadow-sm"
                        : isDone
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {isDone ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Icon className="w-3 h-3" />
                    )}
                    <span className="hidden sm:inline">{s.label}</span>
                    <span className="sm:hidden">{s.id}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`w-4 h-0.5 ${
                        step > s.id ? "bg-green-400" : "bg-slate-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* STEP 1: Paciente */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-bold text-[#0a1f44] text-base flex items-center gap-2">
                <User className="w-4 h-4" /> Dados do Paciente
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="label-form">
                    Nome completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="input-form"
                    value={form.patientName}
                    onChange={(e) => set("patientName", e.target.value)}
                    placeholder="Nome completo do paciente"
                  />
                </div>
                <div>
                  <label className="label-form">
                    Data de Nascimento <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="input-form"
                    value={form.patientBirthDate}
                    onChange={(e) =>
                      set("patientBirthDate", maskDate(e.target.value))
                    }
                    placeholder="DD/MM/AAAA"
                    maxLength={10}
                  />
                </div>
                <div>
                  <label className="label-form">Idade</label>
                  <input
                    className="input-form bg-slate-50"
                    value={form.patientAge}
                    readOnly
                    placeholder="Calculada automaticamente"
                  />
                </div>
                <div>
                  <label className="label-form">CPF</label>
                  <input
                    className="input-form"
                    value={form.patientCPF}
                    onChange={(e) => set("patientCPF", maskCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                </div>
                <div>
                  <label className="label-form">RG</label>
                  <input
                    className="input-form"
                    value={form.patientRG}
                    onChange={(e) => set("patientRG", e.target.value)}
                    placeholder="Número do RG"
                  />
                </div>
                <div>
                  <label className="label-form">
                    Prontuário <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="input-form"
                    value={form.patientMedicalRecord}
                    onChange={(e) =>
                      set("patientMedicalRecord", e.target.value)
                    }
                    placeholder="Número do prontuário"
                  />
                </div>
                <div>
                  <label className="label-form">Convênio / Plano</label>
                  <input
                    className="input-form"
                    value={form.patientInsurance}
                    onChange={(e) => set("patientInsurance", e.target.value)}
                    placeholder="Ex: Unimed, IPERGS, Particular"
                  />
                </div>
                <div>
                  <label className="label-form">Telefone</label>
                  <input
                    className="input-form"
                    value={form.patientPhone}
                    onChange={(e) =>
                      set("patientPhone", maskPhone(e.target.value))
                    }
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label-form">Endereço</label>
                  <input
                    className="input-form"
                    value={form.patientAddress}
                    onChange={(e) => set("patientAddress", e.target.value)}
                    placeholder="Rua, número, bairro"
                  />
                </div>
                <div>
                  <label className="label-form">Cidade / Estado</label>
                  <input
                    className="input-form"
                    value={form.patientCity}
                    onChange={(e) => set("patientCity", e.target.value)}
                    placeholder="Ex: Porto Alegre / RS"
                  />
                </div>
              </div>
              <div className="border-t pt-4">
                <p className="text-xs text-slate-500 mb-3 font-medium uppercase tracking-wide">
                  Responsável legal (preencher apenas se menor de idade ou
                  incapaz)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="label-form">Nome do Responsável</label>
                    <input
                      className="input-form"
                      value={form.guardianName}
                      onChange={(e) => set("guardianName", e.target.value)}
                      placeholder="Nome completo"
                    />
                  </div>
                  <div>
                    <label className="label-form">Parentesco</label>
                    <input
                      className="input-form"
                      value={form.guardianRelationship}
                      onChange={(e) =>
                        set("guardianRelationship", e.target.value)
                      }
                      placeholder="Ex: Mãe, Pai, Cônjuge"
                    />
                  </div>
                  <div>
                    <label className="label-form">CPF do Responsável</label>
                    <input
                      className="input-form"
                      value={form.guardianCPF}
                      onChange={(e) =>
                        set("guardianCPF", maskCPF(e.target.value))
                      }
                      placeholder="000.000.000-00"
                      maxLength={14}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Médico & Hospital */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-bold text-[#0a1f44] text-base flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Médico e Hospital
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="label-form">
                    Nome do Médico Responsável{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="input-form"
                    value={form.doctorName}
                    onChange={(e) => set("doctorName", e.target.value)}
                    placeholder="Nome completo do médico"
                  />
                </div>
                <div>
                  <label className="label-form">
                    CRM <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="input-form"
                    value={form.doctorCRM}
                    onChange={(e) => set("doctorCRM", e.target.value)}
                    placeholder="Ex: 123456/RS"
                  />
                </div>
                <div>
                  <label className="label-form">Especialidade</label>
                  <input
                    className="input-form"
                    value={form.doctorSpecialty}
                    onChange={(e) => set("doctorSpecialty", e.target.value)}
                    placeholder="Ex: Cirurgia Oncológica"
                  />
                </div>
                <div className="sm:col-span-2 border-t pt-3">
                  <p className="text-xs text-slate-500 mb-3 font-medium uppercase tracking-wide">
                    Médico Anestesiologista
                  </p>
                </div>
                <div>
                  <label className="label-form">Nome do Anestesiologista</label>
                  <input
                    className="input-form"
                    value={form.anesthesiologistName}
                    onChange={(e) =>
                      set("anesthesiologistName", e.target.value)
                    }
                    placeholder="Nome completo"
                  />
                </div>
                <div>
                  <label className="label-form">CRM Anestesiologista</label>
                  <input
                    className="input-form"
                    value={form.anesthesiologistCRM}
                    onChange={(e) =>
                      set("anesthesiologistCRM", e.target.value)
                    }
                    placeholder="Ex: 654321/RS"
                  />
                </div>
                <div className="sm:col-span-2 border-t pt-3">
                  <p className="text-xs text-slate-500 mb-3 font-medium uppercase tracking-wide">
                    Médico Residente (se houver)
                  </p>
                </div>
                <div>
                  <label className="label-form">Nome do Residente</label>
                  <input
                    className="input-form"
                    value={form.residentName}
                    onChange={(e) => set("residentName", e.target.value)}
                    placeholder="Nome completo"
                  />
                </div>
                <div>
                  <label className="label-form">CRM Residente</label>
                  <input
                    className="input-form"
                    value={form.residentCRM}
                    onChange={(e) => set("residentCRM", e.target.value)}
                    placeholder="Ex: 789012/RS"
                  />
                </div>
                <div className="sm:col-span-2 border-t pt-3">
                  <p className="text-xs text-slate-500 mb-3 font-medium uppercase tracking-wide">
                    Hospital / Local
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <label className="label-form">
                    Hospital / Instituição <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="input-form"
                    value={form.hospital}
                    onChange={(e) => set("hospital", e.target.value)}
                    placeholder="Ex: Santa Casa de Porto Alegre"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label-form">Endereço do Hospital</label>
                  <input
                    className="input-form"
                    value={form.hospitalAddress}
                    onChange={(e) => set("hospitalAddress", e.target.value)}
                    placeholder="Rua, número, bairro, cidade"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Procedimento */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-bold text-[#0a1f44] text-base flex items-center gap-2">
                <Stethoscope className="w-4 h-4" /> Procedimento Cirúrgico e
                Anestesia
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="label-form">
                    Nome do Procedimento Cirúrgico{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="input-form"
                    value={form.procedureName}
                    onChange={(e) => set("procedureName", e.target.value)}
                    placeholder="Ex: Colectomia direita laparoscópica por neoplasia de cólon"
                  />
                </div>
                <div>
                  <label className="label-form">CID-10</label>
                  <input
                    className="input-form"
                    value={form.procedureCID}
                    onChange={(e) => set("procedureCID", e.target.value)}
                    placeholder="Ex: C18.0"
                  />
                </div>
                <div>
                  <label className="label-form">
                    Data Prevista <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="input-form"
                    value={form.procedureDate}
                    onChange={(e) =>
                      set("procedureDate", maskDate(e.target.value))
                    }
                    placeholder="DD/MM/AAAA"
                    maxLength={10}
                  />
                </div>
                <div>
                  <label className="label-form">Horário</label>
                  <input
                    className="input-form"
                    value={form.procedureTime}
                    onChange={(e) => set("procedureTime", e.target.value)}
                    placeholder="Ex: 08:00"
                    maxLength={5}
                  />
                </div>
                <div>
                  <label className="label-form">Centro Cirúrgico / Sala</label>
                  <input
                    className="input-form"
                    value={form.operatingRoom}
                    onChange={(e) => set("operatingRoom", e.target.value)}
                    placeholder="Ex: CC4 - Sala 3"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label-form">
                    Tipo de Anestesia <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="input-form"
                    value={form.anesthesiaType}
                    onChange={(e) => set("anesthesiaType", e.target.value)}
                  >
                    {ANESTHESIA_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: História Clínica */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="font-bold text-[#0a1f44] text-base flex items-center gap-2">
                <ClipboardList className="w-4 h-4" /> História Clínica e
                Indicação
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="label-form">
                    Diagnóstico <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="input-form"
                    value={form.diagnosis}
                    onChange={(e) => set("diagnosis", e.target.value)}
                    placeholder="Ex: Adenocarcinoma de cólon direito T3N1M0"
                  />
                </div>
                <div>
                  <label className="label-form">História Clínica</label>
                  <textarea
                    className="input-form min-h-[100px] resize-y"
                    value={form.clinicalHistory}
                    onChange={(e) => set("clinicalHistory", e.target.value)}
                    placeholder="Descreva a história clínica do paciente: sintomas, evolução, comorbidades relevantes..."
                  />
                </div>
                <div>
                  <label className="label-form">
                    Exames que Justificam o Procedimento
                  </label>
                  <textarea
                    className="input-form min-h-[90px] resize-y"
                    value={form.justificationExams}
                    onChange={(e) => set("justificationExams", e.target.value)}
                    placeholder="Ex: TC abdome (15/03/2026): massa de 4,5cm no cólon direito com linfonodos regionais comprometidos. Colonoscopia + biópsia: adenocarcinoma..."
                  />
                </div>
                <div>
                  <label className="label-form">
                    Indicação Cirúrgica{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    className="input-form min-h-[90px] resize-y"
                    value={form.surgicalIndication}
                    onChange={(e) => set("surgicalIndication", e.target.value)}
                    placeholder="Descreva a justificativa para o procedimento cirúrgico..."
                  />
                </div>
                <div>
                  <label className="label-form">
                    Alternativas Terapêuticas
                  </label>
                  <textarea
                    className="input-form min-h-[70px] resize-y"
                    value={form.therapeuticAlternatives}
                    onChange={(e) =>
                      set("therapeuticAlternatives", e.target.value)
                    }
                    placeholder="Descreva as alternativas ao tratamento cirúrgico que foram discutidas (quimioterapia, radioterapia, tratamento conservador, etc.)"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Gerar */}
          {step === 5 && (
            <div className="flex flex-col items-center justify-center py-8 gap-6 min-h-[300px]">
              {isGenerating ? (
                <>
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full border-4 border-blue-100 border-t-[#0a1f44] animate-spin" />
                    <Sparkles className="w-8 h-8 text-[#d4af37] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-[#0a1f44] text-lg">
                      Gerando TCLE personalizado...
                    </p>
                    <p className="text-slate-500 text-sm mt-1">
                      O modelo está elaborando o termo baseado na história
                      clínica e na literatura médica
                    </p>
                  </div>
                  {generatedHtml && (
                    <div className="w-full max-w-2xl bg-slate-50 rounded-xl p-4 max-h-64 overflow-y-auto border text-xs text-slate-600 font-mono">
                      <div
                        dangerouslySetInnerHTML={{ __html: generatedHtml }}
                        className="prose prose-sm max-w-none"
                      />
                    </div>
                  )}
                  <button
                    onClick={() => abortRef.current?.abort()}
                    className="text-sm text-slate-500 hover:text-red-600 underline"
                  >
                    Cancelar geração
                  </button>
                </>
              ) : generationError ? (
                <div className="text-center space-y-4">
                  <AlertCircle className="w-14 h-14 text-red-500 mx-auto" />
                  <div>
                    <p className="font-semibold text-red-700">
                      Erro ao gerar TCLE
                    </p>
                    <p className="text-slate-500 text-sm mt-1">
                      {generationError}
                    </p>
                    <p className="text-xs text-slate-400 mt-2">
                      Verifique se ANTHROPIC_API_KEY está configurada no
                      servidor.
                    </p>
                  </div>
                  <button
                    onClick={handleGenerate}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" /> Tentar novamente
                  </button>
                </div>
              ) : (
                <>
                  <div className="text-center space-y-3">
                    <div className="w-20 h-20 bg-gradient-to-br from-[#0a1f44] to-[#1a3a6b] rounded-full flex items-center justify-center mx-auto shadow-lg">
                      <Sparkles className="w-10 h-10 text-[#d4af37]" />
                    </div>
                    <h3 className="font-bold text-[#0a1f44] text-xl">
                      Pronto para gerar o TCLE
                    </h3>
                    <p className="text-slate-500 text-sm max-w-md">
                      O sistema irá elaborar automaticamente um Termo de
                      Consentimento Livre e Esclarecido completo e personalizado
                      com todas as complicações descritas na literatura médica
                      para <strong>{form.procedureName}</strong>.
                    </p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 max-w-md w-full text-sm text-amber-800">
                    <p className="font-semibold mb-1">Resumo do procedimento:</p>
                    <ul className="space-y-0.5 text-xs">
                      <li>👤 Paciente: {form.patientName}</li>
                      <li>🏥 Hospital: {form.hospital}</li>
                      <li>⚕️ Procedimento: {form.procedureName}</li>
                      <li>
                        💉 Anestesia:{" "}
                        {
                          ANESTHESIA_OPTIONS.find(
                            (a) => a.value === form.anesthesiaType
                          )?.label
                        }
                      </li>
                      <li>📅 Data: {form.procedureDate}</li>
                    </ul>
                  </div>
                  <button
                    onClick={handleGenerate}
                    className="btn-primary flex items-center gap-3 text-base px-8 py-3"
                  >
                    <Sparkles className="w-5 h-5" />
                    Gerar TCLE com IA
                  </button>
                </>
              )}
            </div>
          )}

          {/* STEP 6: Preview & Print */}
          {step === 6 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-bold text-[#0a1f44] text-base flex items-center gap-2">
                  <Printer className="w-4 h-4" /> Revisar e Exportar TCLE
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      isEditing
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {isEditing ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Edit3 className="w-3.5 h-3.5" />
                    )}
                    {isEditing ? "Salvar edição" : "Editar texto"}
                  </button>
                  <button
                    onClick={handlePrint}
                    className="btn-primary flex items-center gap-1.5 text-sm py-1.5 px-4"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir / Salvar PDF
                  </button>
                </div>
              </div>

              {isEditing ? (
                <textarea
                  className="w-full min-h-[500px] font-mono text-xs border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                  value={editableHtml}
                  onChange={(e) => setEditableHtml(e.target.value)}
                />
              ) : (
                <div
                  ref={previewRef}
                  className="border rounded-xl p-6 bg-white shadow-inner overflow-y-auto max-h-[520px] prose prose-sm max-w-none
                    [&_h2]:text-center [&_h2]:font-bold [&_h2]:text-sm [&_h2]:uppercase [&_h2]:border-2 [&_h2]:border-slate-800 [&_h2]:p-2 [&_h2]:bg-slate-100
                    [&_h3]:font-bold [&_h3]:text-sm [&_h3]:uppercase [&_h3]:border-l-4 [&_h3]:border-slate-800 [&_h3]:pl-2 [&_h3]:mt-4
                    [&_p]:text-justify [&_p]:text-xs [&_p]:leading-relaxed
                    [&_ul]:ml-4 [&_li]:text-xs [&_li]:my-0.5
                    [&_strong]:font-bold"
                  dangerouslySetInnerHTML={{
                    __html: isEditing ? editableHtml : generatedHtml,
                  }}
                />
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700 flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <strong>Instrução para assinatura:</strong> Após imprimir,
                  obtenha as assinaturas do paciente (ou responsável legal),
                  médico responsável, anestesiologista e duas testemunhas.
                  Arquive uma via no prontuário e entregue outra ao paciente.
                  Conforme Resolução CFM nº 2.217/2018.
                </div>
              </div>

              <button
                onClick={handleReset}
                className="text-sm text-slate-500 hover:text-slate-700 underline"
              >
                Criar novo TCLE
              </button>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="px-6 py-4 border-t bg-slate-50 flex items-center justify-between shrink-0">
          <button
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1 || isGenerating}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-slate-200 text-slate-700 hover:bg-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>

          <span className="text-xs text-slate-400">
            {currentStep.label} — {step}/{STEPS.length}
          </span>

          {step < 5 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canAdvance()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[#0a1f44] text-white hover:bg-[#1a3a6b] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Próximo <ChevronRight className="w-4 h-4" />
            </button>
          ) : step === 5 && !isGenerating && !generatedHtml ? (
            <button
              onClick={handleGenerate}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold bg-[#d4af37] text-[#0a1f44] hover:bg-yellow-400 transition-all"
            >
              <Sparkles className="w-4 h-4" /> Gerar TCLE
            </button>
          ) : step === 5 && isGenerating ? (
            <button
              disabled
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold bg-slate-300 text-slate-500 cursor-not-allowed"
            >
              <Loader2 className="w-4 h-4 animate-spin" /> Gerando...
            </button>
          ) : step === 6 ? (
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold bg-[#d4af37] text-[#0a1f44] hover:bg-yellow-400 transition-all"
            >
              <Printer className="w-4 h-4" /> Exportar PDF
            </button>
          ) : null}
        </div>
      </div>

      <style jsx>{`
        .label-form {
          display: block;
          font-size: 0.75rem;
          font-weight: 600;
          color: #475569;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .input-form {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: #1e293b;
          transition: border-color 0.15s;
          outline: none;
        }
        .input-form:focus {
          border-color: #0a1f44;
          box-shadow: 0 0 0 2px rgba(10, 31, 68, 0.15);
        }
        .btn-primary {
          background: #0a1f44;
          color: white;
          border-radius: 0.5rem;
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          font-weight: 600;
          transition: background 0.15s;
          cursor: pointer;
        }
        .btn-primary:hover {
          background: #1a3a6b;
        }
      `}</style>
    </div>
  );
}
