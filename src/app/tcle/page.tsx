"use client";

import { useState } from "react";
import { FileText, ArrowLeft, Sparkles, ShieldCheck, BookOpen, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import TcleModal from "@/components/TcleModal";

export default function TclePage() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1f44] via-[#1a3a6b] to-[#0a1f44]">
      {/* Header */}
      <header className="px-6 py-4 flex items-center gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-blue-200 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Dashboard
        </Link>
      </header>

      {/* Hero */}
      <main className="max-w-4xl mx-auto px-6 py-12 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 bg-white/10 backdrop-blur-sm rounded-3xl flex items-center justify-center shadow-2xl border border-white/20">
            <FileText className="w-12 h-12 text-[#d4af37]" />
          </div>
        </div>

        <h1 className="text-4xl font-bold text-white mb-3">
          Editor de TCLE
        </h1>
        <p className="text-blue-200 text-lg mb-2">
          Termo de Consentimento Livre e Esclarecido
        </p>
        <p className="text-blue-300 text-sm max-w-2xl mx-auto mb-10">
          Gere termos de consentimento personalizados com IA, baseados na história clínica do
          paciente, conforme as resoluções do Conselho Federal de Medicina.
        </p>

        <button
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-3 bg-[#d4af37] hover:bg-yellow-400 text-[#0a1f44] font-bold text-lg px-10 py-4 rounded-2xl shadow-xl transition-all hover:shadow-2xl hover:scale-105 active:scale-100"
        >
          <Sparkles className="w-6 h-6" />
          Criar Novo TCLE
        </button>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-14 text-left">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
            <ShieldCheck className="w-8 h-8 text-[#d4af37] mb-3" />
            <h3 className="text-white font-semibold mb-1">CFM Compliant</h3>
            <p className="text-blue-200 text-sm">
              Elaborado conforme Resoluções CFM nº 2.217/2018 e CFM nº
              1.931/2009, com todas as exigências legais e éticas.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
            <BookOpen className="w-8 h-8 text-[#d4af37] mb-3" />
            <h3 className="text-white font-semibold mb-1">
              Baseado na Literatura
            </h3>
            <p className="text-blue-200 text-sm">
              Todas as complicações possíveis descritas na literatura médica
              atual, organizadas por frequência e tipo.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
            <ClipboardCheck className="w-8 h-8 text-[#d4af37] mb-3" />
            <h3 className="text-white font-semibold mb-1">
              Orientações Completas
            </h3>
            <p className="text-blue-200 text-sm">
              Inclui orientações pré e pós-operatórias personalizadas, campos
              de assinatura e exportação em PDF.
            </p>
          </div>
        </div>

        {/* Info */}
        <div className="mt-10 bg-white/5 border border-white/10 rounded-2xl p-5 text-left text-sm text-blue-200">
          <p className="font-semibold text-white mb-2">O que é gerado automaticamente:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {[
              "Identificação completa das partes",
              "Descrição detalhada do procedimento",
              "Justificativa baseada nos exames",
              "Riscos cirúrgicos por frequência",
              "Riscos anestésicos específicos",
              "Benefícios esperados",
              "Alternativas terapêuticas",
              "Orientações pré-operatórias",
              "Orientações pós-operatórias",
              "Complicações se não tratado",
              "Declaração de consentimento",
              "Campos para assinatura eletrônica / física",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#d4af37] rounded-full shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </main>

      <TcleModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
}
