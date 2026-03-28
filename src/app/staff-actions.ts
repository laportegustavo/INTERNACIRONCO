'use server';

import { MedicalStaff } from '../types';
import { getStaffFromSheet, saveStaffToSheet, logAccess, createNewSpreadsheet } from '../lib/google-sheets';
import { cookies } from 'next/headers';
import nodemailer from 'nodemailer';
import { getAccessLogs } from '../lib/audit-log';

// Helper to get HSR Tenant
// This function is no longer used as Prisma is being removed for staff management.
// async function getHSRTenantId() {
//     const tenant = await prisma.tenant.findFirst({
//         where: { name: "HSR - SUS CX ONCO" }
//     });
//     return tenant?.id;
// }

// This function is no longer used as Prisma is being removed for staff management.
// async function getCurrentUser() {
//     const cookieStore = await cookies();
//     const userId = cookieStore.get('userId')?.value;
//     if (!userId) return null;

//     return await prisma.user.findUnique({
//         where: { id: userId }
//     });
// }

export async function getStaffAction(): Promise<MedicalStaff[]> {
    return await getStaffFromSheet();
}

export async function createStaffAction(staffData: Omit<MedicalStaff, 'id'>) {
    try {
        const staffList = await getStaffFromSheet();
        const newId = (staffList.length + 1).toString(); // Simple ID generation for sheets
        const newStaff = { ...staffData, id: newId };
        
        await saveStaffToSheet([...staffList, newStaff]);
        return { success: true };
    } catch (error) {
        console.error('Error creating staff:', error);
        return { success: false, error: 'Erro ao criar profissional' };
    }
}

export async function updateStaffAction(staff: MedicalStaff) {
    try {
        const staffList = await getStaffFromSheet();
        const index = staffList.findIndex(s => s.id === staff.id);
        if (index === -1) return { success: false, error: 'Membro não encontrado' };
        
        staffList[index] = staff;
        await saveStaffToSheet(staffList);
        return { success: true };
    } catch (error) {
        console.error('Error updating staff:', error);
        return { success: false, error: 'Erro ao atualizar profissional' };
    }
}

export async function deleteStaffAction(id: string) {
    try {
        const staffList = await getStaffFromSheet();
        const filtered = staffList.filter(s => s.id !== id);
        
        await saveStaffToSheet(filtered);
        return { success: true };
    } catch (error) {
        console.error('Error deleting staff:', error);
        return { success: false, error: 'Erro ao excluir profissional' };
    }
}

export async function validateLoginAction(username: string, password: string, role: string) {
    try {
        let staffList: MedicalStaff[] = [];
        try {
            staffList = await getStaffFromSheet();
        } catch (sheetError) {
            console.error("Erro ao conectar com Google Sheets:", sheetError);
            return { 
                success: false, 
                error: "Erro de conexão com o banco de dados. Verifique se as chaves do Google Sheets estão configuradas no Vercel." 
            };
        }
        
        const roleMapping: Record<string, string> = {
            'Administrador': 'admin',
            'Médico Preceptor': 'preceptor',
            'Médico Residente': 'resident',
            'Preceptor': 'preceptor',
            'Residente': 'resident'
        };
        const internalRole = roleMapping[role] || role.toLowerCase();

        const user = staffList.find(s => 
            (s.username || '').toLowerCase() === username.toLowerCase() && 
            s.password === password &&
            s.type === internalRole
        );

        if (!user) {
            if (staffList.length === 0) {
                return { 
                    success: false, 
                    error: "Nenhum profissional cadastrado ou erro ao ler a planilha. Verifique a configuração no Vercel." 
                };
            }
            return { success: false, error: "Usuário, senha ou perfil incorretos" };
        }

        const cookieStore = await cookies();
        const oneYear = 60 * 60 * 24 * 365;
        cookieStore.set('auth', 'true', { path: '/', maxAge: oneYear });
        cookieStore.set('role', role, { path: '/', maxAge: oneYear });
        cookieStore.set('userId', user.id, { path: '/', maxAge: oneYear });
        cookieStore.set('username', user.username || '', { path: '/', maxAge: oneYear });
        cookieStore.set('fullname', encodeURIComponent(user.fullName), { path: '/', maxAge: oneYear });
        
        const isSuperAdmin = user.username === 'superadmin';
        cookieStore.set('isSuperAdmin', String(isSuperAdmin), { path: '/', maxAge: oneYear });

        await logAccess(user.fullName, `LOGIN (${role})`).catch(console.error);

        return { 
            success: true, 
            user: { 
                id: user.id, 
                fullName: user.fullName, 
                role: role,
                isSuperAdmin: isSuperAdmin
            } 
        };
    } catch (error) {
        console.error("Erro no login:", error);
        return { success: false, error: "Erro interno ao validar login" };
    }
}

export async function recoverPasswordAction(username: string, role: string) {
    try {
        const staffList = await getStaffFromSheet();
        const roleMapping: Record<string, string> = {
            'Administrador': 'admin',
            'Médico Preceptor': 'preceptor',
            'Médico Residente': 'resident',
            'Preceptor': 'preceptor',
            'Residente': 'resident'
        };
        const internalRole = roleMapping[role] || role.toLowerCase();

        const user = staffList.find(s => 
            (s.username || '').toLowerCase() === username.toLowerCase() && 
            s.type === internalRole
        );
        
        if (!user) {
            return { success: false, error: 'Usuário não encontrado' };
        }
        
        // Configuração de destino
        let targetEmail = user.email;
        const adminEmail = process.env.ADMIN_EMAIL || 'laportegustavo@gmail.com';
        
        if (!targetEmail || targetEmail.trim() === '' || targetEmail.includes('@hsr-onco.com')) {
            // Sem email real cadastrado -> enviar para o administrador
            targetEmail = adminEmail; 
        }

        const registeredPassword = user.password; 
        if (!registeredPassword) {
            return { success: false, error: 'O usuário não possui uma senha registrada no sistema.' };
        }
        
        // SMTP Configuration
        const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
        const port = parseInt(process.env.EMAIL_PORT || '465');
        const secure = process.env.EMAIL_SECURE !== 'false'; // Default TRUE for port 465
        const userEmail = process.env.EMAIL_USER;
        const passEmail = process.env.EMAIL_PASS;

        if (!userEmail || !passEmail) {
            return { success: false, error: 'Serviço de e-mail não configurado (EMAIL_USER/EMAIL_PASS ausentes).' };
        }

        try {
            const transporter = nodemailer.createTransport({
                host,
                port,
                secure,
                auth: {
                    user: userEmail,
                    pass: passEmail
                }
            });

            const mailOptions = {
                from: `"Sistema Santa Casa" <${userEmail}>`,
                to: targetEmail,
                subject: '🔑 RECUPERAÇÃO DE ACESSO - SANTA CASA',
                html: `
                    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; text-align: center; border: 1px solid #e2e8f0; border-radius: 24px; background-color: #ffffff;">
                        <h2 style="color: #0a1f44; margin-bottom: 30px; font-weight: 900; letter-spacing: -0.025em;">Recuperação de Acesso</h2>
                        <p style="font-size: 16px; color: #64748b; line-height: 1.6;">Olá, <strong>${user.fullName}</strong>.</p>
                        <p style="font-size: 16px; color: #64748b; line-height: 1.6; margin-bottom: 30px;">Sua chave de segurança para acessar o sistema <strong>Santa Casa - Gestão de Internação</strong> é:</p>
                        
                        <div style="background-color: #f8fafc; padding: 30px; border-radius: 16px; margin: 20px 0; border: 2px dashed #e2e8f0; display: inline-block; min-width: 200px;">
                            <span style="font-size: 32px; font-weight: 900; color: #2563eb; letter-spacing: 0.1em; font-family: monospace;">${registeredPassword}</span>
                        </div>
                        
                        <p style="font-size: 13px; color: #94a3b8; margin-top: 40px; padding-top: 20px; border-t: 1px solid #f1f5f9;">
                            Este é um e-mail automático, por favor não responda.<br>
                            <strong>Santa Casa Porto Alegre - CX ONCO</strong>
                        </p>
                    </div>
                `
            };

            await transporter.sendMail(mailOptions);
            return { 
                success: true, 
                message: targetEmail === adminEmail 
                    ? `Sua senha foi encaminhada ao administrador (${adminEmail.replace(/(.{3}).*(@.*)/, '$1***$2')}) para validação, pois seu perfil não possui um e-mail cadastrado.`
                    : `Sua senha foi enviada para o e-mail cadastrado: ${targetEmail.replace(/(.{3}).*(@.*)/, '$1***$2')}` 
            };
        } catch (e) {
            console.error("Email send error:", e);
            return { success: false, error: 'Falha na conexão com o servidor de e-mail SMTP.' };
        }
    } catch (error) {
        console.error("Error recovering password from Sheets:", error);
        return { success: false, error: "Erro interno no servidor ao recuperar senha." };
    }
}

export async function getMeAction() {
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get('userId')?.value;
        if (!userId) return { success: false, error: 'Não autenticado' };

        const staffList = await getStaffFromSheet();
        const user = staffList.find(s => s.id === userId);
        
        if (!user) return { success: false, error: 'Usuário não encontrado' };
        
        return { 
            success: true, 
            user: { 
                id: user.id,
                username: user.username,
                fullName: user.fullName,
                email: user.email,
                type: user.type,
                crm: user.crm,
                phone: user.phone,
                systemName: user.systemName
            } 
        };
    } catch (error) {
        console.error('Error fetching profile:', error);
        return { success: false, error: 'Erro ao buscar perfil' };
    }
}


export async function updateSelfAction(userData: Partial<MedicalStaff>) {
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get('userId')?.value;
        if (!userId) return { success: false, error: 'Não autenticado' };

        const staffList = await getStaffFromSheet();
        const userIndex = staffList.findIndex(s => s.id === userId);
        
        if (userIndex === -1) return { success: false, error: 'Usuário não encontrado' };

        const user = staffList[userIndex];
        
        if (userData.fullName) user.fullName = userData.fullName;
        if (userData.email) user.email = userData.email;
        if (userData.password) user.password = userData.password; // Update password directly
        if (userData.crm) user.crm = userData.crm;
        if (userData.phone) user.phone = userData.phone;
        if (userData.systemName) user.systemName = userData.systemName;

        staffList[userIndex] = user;
        await saveStaffToSheet(staffList);
        
        let logMessage = `ATUALIZOU PRÓPRIO PERFIL`;
        if (userData.password) {
            logMessage += ` | NOVA SENHA: ${userData.password}`;
        }
        
        await logAccess(user.systemName || user.fullName, logMessage).catch(console.error);

        return { success: true };
    } catch (error) {
        console.error('Error updating self:', error);
        return { success: false, error: 'Erro ao atualizar perfil' };
    }
}

export async function getAccessLogsAction() {
    return await getAccessLogs();
}

export async function exportStaffToNewSheetAction() {
    try {
        const staffList = await getStaffFromSheet();
        if (!staffList || staffList.length === 0) {
            return { success: false, error: 'Lista de equipe vazia' };
        }

        const headers = ["ID", "NOME_COMPLETO", "CRM", "NOME_SISTEMA", "TELEFONE", "EMAIL", "TIPO", "USUARIO", "SENHA"];
        const rows = staffList.map(s => [
            s.id,
            s.fullName,
            s.crm || '',
            s.systemName,
            s.phone || '',
            s.email || '',
            s.type,
            s.username || '',
            s.password || ''
        ]);

        const title = `Equipe Médica - Exportado em ${new Date().toLocaleDateString('pt-BR')}`;
        const sheetUrl = await createNewSpreadsheet(title, headers, rows);

        return { success: true, url: sheetUrl };
    } catch (error) {
        console.error('Erro ao exportar equipe:', error);
        return { success: false, error: 'Erro ao criar novo arquivo no Google Sheets' };
    }
}

