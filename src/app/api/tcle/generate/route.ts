import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface TcleFormData {
  // Paciente
  patientName: string;
  patientBirthDate: string;
  patientAge: string;
  patientCPF: string;
  patientRG: string;
  patientAddress: string;
  patientCity: string;
  patientPhone: string;
  patientMedicalRecord: string;
  patientInsurance: string;
  // Responsável legal (menores/incapazes)
  guardianName?: string;
  guardianRelationship?: string;
  guardianCPF?: string;
  // Médico
  doctorName: string;
  doctorCRM: string;
  doctorSpecialty: string;
  // Anestesiologista
  anesthesiologistName?: string;
  anesthesiologistCRM?: string;
  // Procedimento
  procedureName: string;
  procedureCID: string;
  procedureDate: string;
  procedureTime: string;
  hospital: string;
  hospitalAddress: string;
  operatingRoom: string;
  anesthesiaType: string;
  // História clínica
  diagnosis: string;
  clinicalHistory: string;
  justificationExams: string;
  surgicalIndication: string;
  therapeuticAlternatives: string;
  // Equipe
  residentName?: string;
  residentCRM?: string;
}

export async function POST(request: NextRequest) {
  try {
    const data: TcleFormData = await request.json();

    const anesthesiaDescriptions: Record<string, string> = {
      geral: "anestesia geral (o paciente ficará inconsciente durante o procedimento)",
      raquianestesia:
        "raquianestesia (bloqueio da medula espinhal com injeção de anestésico no espaço subaracnóideo, promovendo anestesia da metade inferior do corpo)",
      peridural:
        "anestesia peridural/epidural (injeção de anestésico no espaço peridural, promovendo bloqueio sensitivo e motor da região abdominal e/ou membros inferiores)",
      local: "anestesia local (infiltração de anestésico na região cirúrgica)",
      sedacao: "sedação consciente/monitored anesthesia care (MAC) com anestesia local complementar",
      bloqueio: "bloqueio de nervo periférico (anestesia regional com bloqueio de nervos específicos)",
    };

    const systemPrompt = `Você é um médico especialista em documentação médico-legal, expert em elaborar Termos de Consentimento Livre e Esclarecido (TCLE) conforme as normas do Conselho Federal de Medicina do Brasil.

Seu objetivo é elaborar um TCLE completo, detalhado e juridicamente robusto, baseado na Resolução CFM nº 2.217/2018 (Código de Ética Médica), Resolução CFM nº 1.931/2009, e nas diretrizes do Conselho Nacional de Saúde (Resolução CNS nº 466/2012).

Diretrizes para elaboração:
1. Linguagem clara e acessível, evitando jargões médicos sem explicação
2. Todas as complicações possíveis descritas na literatura médica atual devem ser incluídas
3. Complicações organizadas por frequência (comuns, incomuns, raras)
4. Orientações pré e pós-operatórias específicas para o procedimento
5. Respeito à autonomia do paciente e direito à informação
6. O TCLE deve ser personalizado conforme a história clínica fornecida
7. Incluir declaração de consentimento em conformidade com as resoluções do CFM
8. Formato HTML com tags h2, h3, p, ul, li, strong, em para estruturação`;

    const userPrompt = `Elabore um TCLE completo para o seguinte procedimento cirúrgico:

**DADOS DO PACIENTE:**
- Nome: ${data.patientName}
- Data de nascimento: ${data.patientBirthDate}${data.patientAge ? ` (${data.patientAge} anos)` : ""}
- CPF: ${data.patientCPF || "não informado"}
- RG: ${data.patientRG || "não informado"}
- Endereço: ${data.patientAddress ? `${data.patientAddress}, ${data.patientCity}` : "não informado"}
- Prontuário: ${data.patientMedicalRecord || "não informado"}
- Convênio/Plano: ${data.patientInsurance || "Particular"}
${data.guardianName ? `- Responsável Legal: ${data.guardianName} (${data.guardianRelationship}), CPF: ${data.guardianCPF}` : ""}

**MÉDICO RESPONSÁVEL:**
- Dr(a). ${data.doctorName}
- CRM: ${data.doctorCRM}
- Especialidade: ${data.doctorSpecialty}
${data.anesthesiologistName ? `- Anestesiologista: Dr(a). ${data.anesthesiologistName}, CRM: ${data.anesthesiologistCRM || ""}` : ""}
${data.residentName ? `- Médico Residente: ${data.residentName}${data.residentCRM ? `, CRM: ${data.residentCRM}` : ""}` : ""}

**PROCEDIMENTO:**
- Procedimento cirúrgico: ${data.procedureName}
- CID-10: ${data.procedureCID}
- Data prevista: ${data.procedureDate}${data.procedureTime ? ` às ${data.procedureTime}` : ""}
- Local: ${data.hospital}${data.hospitalAddress ? ` - ${data.hospitalAddress}` : ""}
${data.operatingRoom ? `- Sala: ${data.operatingRoom}` : ""}
- Tipo de anestesia: ${anesthesiaDescriptions[data.anesthesiaType] || data.anesthesiaType}

**HISTÓRIA CLÍNICA E INDICAÇÃO:**
- Diagnóstico: ${data.diagnosis}
- História clínica: ${data.clinicalHistory}
- Exames que justificam o procedimento: ${data.justificationExams}
- Indicação cirúrgica: ${data.surgicalIndication}
- Alternativas terapêuticas: ${data.therapeuticAlternatives || "Foram discutidas alternativas, porém o tratamento cirúrgico representa a melhor opção terapêutica para o caso."}

---

Elabore o TCLE completo em HTML (sem tags html/body/head, apenas o conteúdo) com as seguintes seções obrigatórias:

<h2>TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO</h2>

I - IDENTIFICAÇÃO DAS PARTES
II - DESCRIÇÃO DO PROCEDIMENTO CIRÚRGICO (detalhada, passo a passo em linguagem acessível)
III - JUSTIFICATIVA E INDICAÇÃO CIRÚRGICA (baseada nos exames e história fornecidos)
IV - TIPO DE ANESTESIA E DESCRIÇÃO DO PROCEDIMENTO ANESTÉSICO
V - RISCOS E COMPLICAÇÕES DO PROCEDIMENTO CIRÚRGICO (baseados na literatura, específicos para ${data.procedureName}, organizados por frequência: comuns >1%, incomuns 0.1-1%, raras <0.1%, muito raras)
VI - RISCOS E COMPLICAÇÕES DA ANESTESIA (específicos para ${data.anesthesiaType})
VII - BENEFÍCIOS ESPERADOS DO PROCEDIMENTO
VIII - PROCEDIMENTOS ALTERNATIVOS AO TRATAMENTO CIRÚRGICO
IX - COMPLICAÇÕES SE NÃO TRATADO (riscos da não realização do procedimento)
X - ORIENTAÇÕES PRÉ-OPERATÓRIAS DETALHADAS (específicas para ${data.procedureName})
XI - ORIENTAÇÕES PÓS-OPERATÓRIAS DETALHADAS (específicas para ${data.procedureName})
XII - DECLARAÇÃO DE RECUSA (texto padrão CFM)
XIII - DECLARAÇÃO DO PACIENTE (texto de consentimento conforme CFM 2.217/2018)
XIV - DECLARAÇÃO DO MÉDICO RESPONSÁVEL

Nas seções de riscos e complicações, seja EXTREMAMENTE detalhado, listando TODAS as complicações descritas na literatura médica para este procedimento específico, com suas frequências aproximadas e consequências. Inclua complicações intraoperatórias, pós-operatórias imediatas (0-48h), pós-operatórias tardias (>48h) e complicações de longo prazo.`;

    const stream = await client.messages.stream({
      model: "claude-opus-4-6",
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const chunk = JSON.stringify({ text: event.delta.text });
              controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("TCLE generation error:", error);
    return Response.json({ error: "Erro ao gerar TCLE" }, { status: 500 });
  }
}
